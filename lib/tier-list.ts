export const TIER_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;

export type TierColor = (typeof TIER_COLORS)[number];

export type Item = {
  id: string;
  title: string;
  imageUrl: string;
};

export type Tier = {
  id: string;
  label: string;
  color: TierColor;
  itemIds: string[];
};

export type TierListState = {
  title: string;
  description: string;
  tiers: Tier[];
  itemsById: Record<string, Item>;
  unrankedItemIds: string[];
};

export type Location = { kind: "unranked" } | { kind: "tier"; tierId: string };

export type MoveItemInput = {
  itemId: string;
  from: Location;
  to: Location;
  index: number;
};

export type TierListAction =
  | { type: "update-list"; changes: Partial<Pick<TierListState, "title" | "description">> }
  | { type: "add-item"; item: Item }
  | { type: "update-item"; itemId: string; changes: Partial<Pick<Item, "title" | "imageUrl">> }
  | { type: "remove-item"; itemId: string }
  | { type: "move-item"; input: MoveItemInput }
  | { type: "add-tier"; tier: Tier }
  | { type: "update-tier"; tierId: string; changes: Partial<Pick<Tier, "label" | "color">> }
  | { type: "move-tier"; tierId: string; index: number }
  | { type: "delete-tier"; tierId: string }
  | { type: "reset"; state: TierListState };

export function isValidImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidItem(item: Item) {
  const imageUrl = item.imageUrl.trim();
  return (
    item.id.trim() !== "" &&
    item.title.trim() !== "" &&
    (imageUrl === "" || isValidImageUrl(imageUrl))
  );
}

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(Number.isFinite(index) ? index : 0, length));
}

function getLocationIds(state: TierListState, location: Location) {
  if (location.kind === "unranked") {
    return state.unrankedItemIds;
  }

  return state.tiers.find((tier) => tier.id === location.tierId)?.itemIds;
}

function removeItemId(state: TierListState, location: Location, itemId: string) {
  const ids = getLocationIds(state, location);
  if (!ids?.includes(itemId)) {
    return undefined;
  }

  const nextIds = ids.filter((id) => id !== itemId);
  return {
    ids: nextIds,
    state:
      location.kind === "unranked"
        ? { ...state, unrankedItemIds: nextIds }
        : {
            ...state,
            tiers: state.tiers.map((tier) =>
              tier.id === location.tierId ? { ...tier, itemIds: nextIds } : tier,
            ),
          },
  };
}

export function updateList(
  state: TierListState,
  changes: Partial<Pick<TierListState, "title" | "description">>,
) {
  const title = (changes.title ?? state.title).trim();
  if (!title) {
    return state;
  }

  return {
    ...state,
    ...changes,
    title,
    description: (changes.description ?? state.description).trim(),
  };
}

export function addItem(state: TierListState, item: Item) {
  if (!isValidItem(item) || state.itemsById[item.id]) {
    return state;
  }

  return {
    ...state,
    itemsById: {
      ...state.itemsById,
      [item.id]: { ...item, title: item.title.trim(), imageUrl: item.imageUrl.trim() },
    },
    unrankedItemIds: [...state.unrankedItemIds, item.id],
  };
}

export function updateItem(
  state: TierListState,
  itemId: string,
  changes: Partial<Pick<Item, "title" | "imageUrl">>,
) {
  const currentItem = state.itemsById[itemId];
  if (!currentItem) {
    return state;
  }

  const nextItem = {
    ...currentItem,
    ...changes,
    title: (changes.title ?? currentItem.title).trim(),
    imageUrl: (changes.imageUrl ?? currentItem.imageUrl).trim(),
  };

  if (!isValidItem(nextItem)) {
    return state;
  }

  return { ...state, itemsById: { ...state.itemsById, [itemId]: nextItem } };
}

export function removeItem(state: TierListState, itemId: string) {
  if (!state.itemsById[itemId]) {
    return state;
  }

  return {
    ...state,
    itemsById: Object.fromEntries(
      Object.entries(state.itemsById).filter(([currentId]) => currentId !== itemId),
    ),
    tiers: state.tiers.map((tier) => ({
      ...tier,
      itemIds: tier.itemIds.filter((currentId) => currentId !== itemId),
    })),
    unrankedItemIds: state.unrankedItemIds.filter((currentId) => currentId !== itemId),
  };
}

export function moveItem(state: TierListState, input: MoveItemInput) {
  const item = state.itemsById[input.itemId];
  const source = removeItemId(state, input.from, input.itemId);
  if (!item || !source) {
    return state;
  }

  const destinationIds = getLocationIds(source.state, input.to);
  if (!destinationIds) {
    return state;
  }

  const nextIds = [...destinationIds];
  nextIds.splice(clampIndex(input.index, nextIds.length), 0, input.itemId);

  if (input.to.kind === "unranked") {
    return { ...source.state, unrankedItemIds: nextIds };
  }

  const destinationTierId = input.to.tierId;
  return {
    ...source.state,
    tiers: source.state.tiers.map((tier) =>
      tier.id === destinationTierId ? { ...tier, itemIds: nextIds } : tier,
    ),
  };
}

export function addTier(state: TierListState, tier: Tier) {
  if (
    tier.id.trim() === "" ||
    tier.label.trim() === "" ||
    state.tiers.some((currentTier) => currentTier.id === tier.id)
  ) {
    return state;
  }

  return {
    ...state,
    tiers: [...state.tiers, { ...tier, label: tier.label.trim(), itemIds: [] }],
  };
}

export function updateTier(
  state: TierListState,
  tierId: string,
  changes: Partial<Pick<Tier, "label" | "color">>,
) {
  const tier = state.tiers.find((currentTier) => currentTier.id === tierId);
  if (!tier) {
    return state;
  }

  const label = (changes.label ?? tier.label).trim();
  if (!label) {
    return state;
  }

  return {
    ...state,
    tiers: state.tiers.map((currentTier) =>
      currentTier.id === tierId ? { ...currentTier, ...changes, label } : currentTier,
    ),
  };
}

export function moveTier(state: TierListState, tierId: string, index: number) {
  const currentIndex = state.tiers.findIndex((tier) => tier.id === tierId);
  if (currentIndex === -1) {
    return state;
  }

  const tiers = state.tiers.filter((tier) => tier.id !== tierId);
  tiers.splice(clampIndex(index, tiers.length), 0, state.tiers[currentIndex]);
  return { ...state, tiers };
}

export function deleteTier(state: TierListState, tierId: string) {
  const tier = state.tiers.find((currentTier) => currentTier.id === tierId);
  if (!tier) {
    return state;
  }

  return {
    ...state,
    tiers: state.tiers.filter((currentTier) => currentTier.id !== tierId),
    unrankedItemIds: [...tier.itemIds, ...state.unrankedItemIds],
  };
}

export function tierListReducer(state: TierListState, action: TierListAction) {
  switch (action.type) {
    case "update-list":
      return updateList(state, action.changes);
    case "add-item":
      return addItem(state, action.item);
    case "update-item":
      return updateItem(state, action.itemId, action.changes);
    case "remove-item":
      return removeItem(state, action.itemId);
    case "move-item":
      return moveItem(state, action.input);
    case "add-tier":
      return addTier(state, action.tier);
    case "update-tier":
      return updateTier(state, action.tierId, action.changes);
    case "move-tier":
      return moveTier(state, action.tierId, action.index);
    case "delete-tier":
      return deleteTier(state, action.tierId);
    case "reset":
      return action.state;
    default:
      return state;
  }
}
