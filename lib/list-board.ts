import {
  type Item,
  isHostedListImage,
  isItemImageRef,
  isValidImageUrl,
  MAX_ITEM_TEXT,
  TIER_COLORS,
  type Tier,
  type TierColor,
  type TierListState,
} from "./tier-list";

const LIST_VISIBILITIES = ["unlisted", "public"] as const;

export type ListVisibility = (typeof LIST_VISIBILITIES)[number];

export type ListBoard = {
  tiers: Tier[];
  itemsById: Record<string, Item>;
  unrankedItemIds: string[];
};

export type ParsedList = {
  title: string;
  description: string;
  visibility: ListVisibility;
  board: ListBoard;
};

const MAX_BOARD_BYTES = 512 * 1024;
const DEFAULT_TIER_LABELS = ["S", "A", "B", "C", "D"] as const;
const STATE_KEYS = ["title", "description", "tiers", "itemsById", "unrankedItemIds"];
const BOARD_KEYS = ["tiers", "itemsById", "unrankedItemIds"];
const TIER_KEYS = ["id", "label", "color", "itemIds"];
const ITEM_KEYS = ["id", "title", "imageUrl", "description", "sourceUrl"];

export function createDefaultBoard(): ListBoard {
  return {
    tiers: DEFAULT_TIER_LABELS.map((label, index) => {
      const color = TIER_COLORS[index];
      if (!color) {
        throw new Error("Missing default tier color");
      }
      return { id: crypto.randomUUID(), label, color, itemIds: [] };
    }),
    itemsById: {},
    unrankedItemIds: [],
  };
}

export function listImageId(listId: string, imageUrl: string) {
  const prefix = `/api/lists/${listId}/images/`;
  if (!imageUrl.startsWith(prefix) || !isHostedListImage(imageUrl)) {
    return null;
  }
  return imageUrl.slice(prefix.length);
}

export function retainedListImageIds(board: ListBoard, listId: string) {
  const ids: string[] = [];
  for (const item of Object.values(board.itemsById)) {
    const imageId = listImageId(listId, item.imageUrl);
    if (imageId) {
      ids.push(imageId);
    }
  }
  return ids;
}

export function removedListImageIds(before: ListBoard, after: ListBoard, listId: string) {
  const kept = new Set(retainedListImageIds(after, listId));
  return [...new Set(retainedListImageIds(before, listId))].filter((imageId) => !kept.has(imageId));
}

export function hasForeignListImage(board: ListBoard, listId: string) {
  const prefix = `/api/lists/${listId}/images/`;
  return Object.values(board.itemsById).some(
    (item) => item.imageUrl.startsWith("/api/lists/") && !item.imageUrl.startsWith(prefix),
  );
}

export function assembleTierList(row: {
  title: string;
  description: string;
  board: ListBoard;
}): TierListState {
  return {
    title: row.title,
    description: row.description,
    tiers: row.board.tiers,
    itemsById: row.board.itemsById,
    unrankedItemIds: row.board.unrankedItemIds,
  };
}

export function parseListSave(input: {
  state: unknown;
  visibility: unknown;
}): { ok: true; list: ParsedList } | { ok: false; error: string } {
  if (!isRecord(input.state) || unknownKey(input.state, STATE_KEYS)) {
    return invalid();
  }

  const title = readText(input.state.title);
  const description = readText(input.state.description);
  if (
    title === null ||
    title === "" ||
    description === null ||
    !isListVisibility(input.visibility)
  ) {
    return invalid();
  }

  const board = parseBoard({
    tiers: input.state.tiers,
    itemsById: input.state.itemsById,
    unrankedItemIds: input.state.unrankedItemIds,
  });
  if (!board.ok) {
    return board;
  }
  if (new TextEncoder().encode(JSON.stringify(board.board)).byteLength > MAX_BOARD_BYTES) {
    return { ok: false, error: "List is too large." };
  }

  return {
    ok: true,
    list: { title, description, visibility: input.visibility, board: board.board },
  };
}

export function parseStoredList(row: {
  title: string;
  description: string;
  visibility: unknown;
  board: unknown;
}) {
  if (!isRecord(row.board)) {
    return invalid();
  }
  return parseListSave({
    state: { title: row.title, description: row.description, ...row.board },
    visibility: row.visibility,
  });
}

function parseBoard(value: unknown): { ok: true; board: ListBoard } | { ok: false; error: string } {
  if (!isRecord(value) || unknownKey(value, BOARD_KEYS) || !Array.isArray(value.tiers)) {
    return invalid();
  }
  if (!Array.isArray(value.unrankedItemIds) || !isRecord(value.itemsById)) {
    return invalid();
  }

  const tiers: Tier[] = [];
  const tierIds = new Set<string>();
  const placements = new Map<string, number>();

  for (const entry of value.tiers) {
    const tier = parseTier(entry);
    if (!tier || tierIds.has(tier.id)) {
      return invalid();
    }
    tierIds.add(tier.id);
    for (const itemId of tier.itemIds) {
      placements.set(itemId, (placements.get(itemId) ?? 0) + 1);
    }
    tiers.push(tier);
  }

  const unrankedItemIds: string[] = [];
  for (const itemId of value.unrankedItemIds) {
    if (typeof itemId !== "string" || itemId === "") {
      return invalid();
    }
    unrankedItemIds.push(itemId);
    placements.set(itemId, (placements.get(itemId) ?? 0) + 1);
  }

  const itemsById: Record<string, Item> = {};
  for (const [key, entry] of Object.entries(value.itemsById)) {
    const item = parseItem(key, entry);
    if (!item || placements.get(key) !== 1) {
      return invalid();
    }
    itemsById[key] = item;
  }

  if (placements.size !== Object.keys(itemsById).length) {
    return invalid();
  }

  return { ok: true, board: { tiers, itemsById, unrankedItemIds } };
}

function parseTier(value: unknown): Tier | null {
  if (!isRecord(value) || unknownKey(value, TIER_KEYS) || !Array.isArray(value.itemIds)) {
    return null;
  }
  const id = readText(value.id);
  const label = readText(value.label);
  if (!id || !label || typeof value.color !== "string" || !isTierColor(value.color)) {
    return null;
  }
  const itemIds: string[] = [];
  for (const itemId of value.itemIds) {
    if (typeof itemId !== "string" || itemId === "") {
      return null;
    }
    itemIds.push(itemId);
  }
  return { id, label, color: value.color, itemIds };
}

function parseItem(key: string, value: unknown): Item | null {
  if (!isRecord(value) || unknownKey(value, ITEM_KEYS)) {
    return null;
  }
  const title = readText(value.title);
  const imageUrl = readText(value.imageUrl);
  const description = value.description === undefined ? "" : readText(value.description);
  const sourceUrl = value.sourceUrl === undefined ? "" : readText(value.sourceUrl);
  if (
    value.id !== key ||
    !title ||
    imageUrl === null ||
    description === null ||
    sourceUrl === null
  ) {
    return null;
  }
  if (description.length > MAX_ITEM_TEXT || sourceUrl.length > MAX_ITEM_TEXT) {
    return null;
  }
  if (imageUrl !== "" && !isItemImageRef(imageUrl)) {
    return null;
  }
  if (sourceUrl !== "" && !isValidImageUrl(sourceUrl)) {
    return null;
  }
  return { id: key, title, imageUrl, description, sourceUrl };
}

function readText(value: unknown) {
  return typeof value === "string" ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unknownKey(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).some((key) => !allowed.includes(key));
}

function isListVisibility(value: unknown): value is ListVisibility {
  return typeof value === "string" && (LIST_VISIBILITIES as readonly string[]).includes(value);
}

function isTierColor(value: string): value is TierColor {
  return (TIER_COLORS as readonly string[]).includes(value);
}

function invalid(): { ok: false; error: string } {
  return { ok: false, error: "Invalid list." };
}
