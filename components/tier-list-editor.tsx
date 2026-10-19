"use client";

import Image from "next/image";
import { useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ItemImagePicker } from "@/components/item-image-picker";
import type { CatalogHit } from "@/lib/igdb";
import { listImageId } from "@/lib/list-board";
import {
  type Item,
  isItemImageRef,
  isValidImageUrl,
  type Location,
  MAX_ITEM_TEXT,
  TIER_COLORS,
  type Tier,
  type TierListAction,
  type TierListState,
  tierListReducer,
} from "@/lib/tier-list";

const DRAG_THRESHOLD = 12;
const ITEM_TILE = "size-20 shrink-0";
const TIER_LABEL_W = "w-[3.25rem]";

/** One heavy frame: the tier board. Everything inside uses flat fills + hairline dividers. */
const BOARD_FRAME = "border-4 border-line bg-panel shadow-[8px_8px_0_var(--line)]";
const ROW_RULE = "border-b border-line last:border-b-0";
const FIELD =
  "h-10 border border-line bg-paper px-3 font-body text-sm font-normal normal-case tracking-normal";
const LABEL = "grid gap-1 font-body text-xs font-bold uppercase tracking-wide text-muted";
const BTN_PRESS =
  "transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_var(--line)] active:translate-x-1 active:translate-y-1 active:shadow-none";
const BTN_PRIMARY = `h-10 border-4 border-line bg-accent px-3 font-body text-sm font-bold text-accent-ink shadow-[4px_4px_0_var(--line)] ${BTN_PRESS}`;
const BTN_SECONDARY = `h-10 border border-line bg-panel px-3 font-body text-sm font-bold shadow-[4px_4px_0_var(--line)] ${BTN_PRESS} disabled:pointer-events-none`;
const DROP_TARGET = "ring-2 ring-inset ring-accent";
const DRAG_SURFACE = "border-4 border-line bg-paper shadow-[8px_8px_0_var(--line)]";
const SELECTION_MARK =
  "pointer-events-none absolute inset-0 z-20 border-2 border-ink shadow-[inset_0_0_0_2px_var(--paper)]";
const INSPECTOR_PANEL = "col-start-1 row-start-1 grid gap-3";
const INSPECTOR_HIDDEN = "invisible pointer-events-none";

type EditorSelection = { kind: "item"; id: string } | { kind: "tier"; id: string };

type VisibilitySlot = {
  visibility: "unlisted" | "public";
  onVisibilityChange: (visibility: "unlisted" | "public") => void;
};

type SaveStatus = {
  kind: "saving" | "saved" | "error";
  message?: string;
};

type DropHighlight = { kind: "item"; targetId: string } | { kind: "tier"; tierId: string } | null;

type PressState = {
  kind: "item" | "tier";
  id: string;
  from?: Location;
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  started: boolean;
};

type DragState = {
  kind: "item" | "tier";
  id: string;
  from?: Location;
  pointerId: number;
  pointerType: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
};

type ItemCardProps = {
  item: Item;
  location: Location;
  isDragging: boolean;
  isSelected: boolean;
  onPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    kind: "item",
    id: string,
    from: Location,
  ) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
  onSelect: (selection: EditorSelection) => void;
};

function placeholderColor(title: string) {
  let hash = 0;
  for (const char of title) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return TIER_COLORS[Math.abs(hash) % TIER_COLORS.length];
}

function ItemCard({
  item,
  location,
  isDragging,
  isSelected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onSelect,
}: ItemCardProps) {
  const [isBroken, setIsBroken] = useState(false);
  const hasImage = item.imageUrl.trim() !== "";

  return (
    <button
      type="button"
      data-item-id={item.id}
      data-editor-selectable=""
      data-selected={isSelected ? "" : undefined}
      aria-pressed={isSelected}
      aria-label={`${item.title}. Select to edit.`}
      aria-describedby="board-instructions"
      className={`relative ${ITEM_TILE} touch-none overflow-hidden border border-line bg-paper p-0 text-left text-ink ${
        isSelected ? "z-10" : ""
      } ${isDragging ? "pointer-events-none opacity-0" : ""}`}
      onPointerDown={(event) => onPointerDown(event, "item", item.id, location)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect({ kind: "item", id: item.id });
        }
      }}
    >
      {!hasImage || isBroken ? (
        <div
          className="absolute inset-0 flex items-center justify-center p-1 text-center font-display text-lg font-bold text-accent-ink"
          style={{ backgroundColor: placeholderColor(item.title) }}
        >
          {isBroken ? (
            <span className="font-body text-xs font-normal text-muted">Unavailable</span>
          ) : (
            item.title.slice(0, 2).toUpperCase()
          )}
        </div>
      ) : (
        <Image
          key={item.imageUrl}
          src={item.imageUrl}
          alt=""
          fill
          unoptimized
          sizes="80px"
          className="object-cover"
          onError={() => setIsBroken(true)}
        />
      )}
      <span className="absolute inset-x-0 bottom-0 block border-t border-line bg-panel px-1 py-0.5 truncate font-body text-xs font-bold leading-none">
        {item.title}
      </span>
      {isSelected ? <div className={SELECTION_MARK} aria-hidden="true" /> : null}
    </button>
  );
}

type TierRowProps = {
  tier: Tier;
  state: TierListState;
  drag: DragState | null;
  dropHighlight: DropHighlight;
  onTierDragPointerDown: (event: React.PointerEvent<HTMLElement>, kind: "tier", id: string) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
  onItemDragPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    kind: "item",
    id: string,
    from: Location,
  ) => void;
  selection: EditorSelection | null;
  onSelect: (selection: EditorSelection) => void;
};

function TierRow({
  tier,
  state,
  drag,
  dropHighlight,
  onTierDragPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onItemDragPointerDown,
  selection,
  onSelect,
}: TierRowProps) {
  const isItemDropTarget = dropHighlight?.kind === "item" && dropHighlight.targetId === tier.id;
  const isTierDropTarget = dropHighlight?.kind === "tier" && dropHighlight.tierId === tier.id;
  const isTierSelected = selection?.kind === "tier" && selection.id === tier.id;

  return (
    <li
      data-tier-drop-target={tier.id}
      data-item-drop-target={tier.id}
      className={`grid grid-cols-[3.25rem_minmax(0,1fr)] items-stretch ${ROW_RULE} ${
        isItemDropTarget ? DROP_TARGET : ""
      }`}
    >
      <button
        type="button"
        data-editor-selectable=""
        data-selected={isTierSelected ? "" : undefined}
        aria-pressed={isTierSelected}
        aria-label={`${tier.label} tier. Select to edit.`}
        aria-describedby="board-instructions"
        className={`${TIER_LABEL_W} relative flex min-h-20 cursor-grab items-center justify-center border-0 p-0 text-accent-ink touch-none active:cursor-grabbing ${
          isTierDropTarget ? DROP_TARGET : ""
        }`}
        style={{ backgroundColor: tier.color }}
        onPointerDown={(event) => onTierDragPointerDown(event, "tier", tier.id)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect({ kind: "tier", id: tier.id });
          }
        }}
      >
        <span className="sr-only">Drag to reorder tier {tier.label}</span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0.5 top-0.5 font-body text-[9px] leading-none text-accent-ink"
        >
          ⠿
        </span>
        <span className="font-display text-2xl leading-none">{tier.label}</span>
        {isTierSelected ? <div className={SELECTION_MARK} aria-hidden="true" /> : null}
      </button>

      <div className="flex min-h-20 flex-wrap content-start gap-0 bg-paper">
        {tier.itemIds.map((itemId) => {
          const item = state.itemsById[itemId];
          if (!item) {
            return null;
          }

          return (
            <ItemCard
              key={item.id}
              item={item}
              location={{ kind: "tier", tierId: tier.id }}
              isDragging={drag?.kind === "item" && drag.id === item.id}
              isSelected={selection?.kind === "item" && selection.id === item.id}
              onPointerDown={onItemDragPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </li>
  );
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function readError(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) {
    return null;
  }
  return typeof payload.error === "string" ? payload.error : null;
}

function readCatalogHits(payload: unknown): CatalogHit[] | null {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("hits" in payload) ||
    !Array.isArray(payload.hits)
  ) {
    return null;
  }
  const hits: CatalogHit[] = [];
  for (const hit of payload.hits) {
    if (
      !hit ||
      typeof hit !== "object" ||
      typeof hit.title !== "string" ||
      typeof hit.description !== "string" ||
      typeof hit.imageUrl !== "string" ||
      typeof hit.sourceUrl !== "string"
    ) {
      return null;
    }
    hits.push(hit);
  }
  return hits;
}

function getCollectionIds(state: TierListState, location: Location) {
  if (location.kind === "unranked") {
    return state.unrankedItemIds;
  }

  return state.tiers.find((tier) => tier.id === location.tierId)?.itemIds ?? [];
}

function getItemLocation(state: TierListState, itemId: string): Location {
  const tier = state.tiers.find((currentTier) => currentTier.itemIds.includes(itemId));
  return tier ? { kind: "tier", tierId: tier.id } : { kind: "unranked" };
}

function locationValue(location: Location) {
  return location.kind === "unranked" ? "unranked" : location.tierId;
}

function locationLabel(state: TierListState, location: Location) {
  if (location.kind === "unranked") {
    return "unranked";
  }

  return `tier ${state.tiers.find((tier) => tier.id === location.tierId)?.label ?? ""}`;
}

function DragPreview({ drag, state }: { drag: DragState; state: TierListState }) {
  const position = { left: drag.x - drag.offsetX, top: drag.y - drag.offsetY };

  if (drag.kind === "item") {
    const item = state.itemsById[drag.id];
    if (!item) {
      return null;
    }

    const hasImage = item.imageUrl.trim() !== "";

    return (
      <div
        className={`pointer-events-none fixed z-[200] size-20 overflow-hidden ${DRAG_SURFACE}`}
        style={position}
      >
        {hasImage ? (
          <Image
            src={item.imageUrl}
            alt=""
            fill
            unoptimized
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-accent-ink"
            style={{ backgroundColor: placeholderColor(item.title) }}
          >
            {item.title.slice(0, 2).toUpperCase()}
          </div>
        )}
        <p className="absolute inset-x-0 bottom-0 border-t border-line bg-panel px-1 py-0.5 truncate font-body text-[10px] font-bold leading-none">
          {item.title}
        </p>
      </div>
    );
  }

  const tier = state.tiers.find((currentTier) => currentTier.id === drag.id);
  if (!tier) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed z-50 flex min-h-20 ${TIER_LABEL_W} items-center justify-center ${DRAG_SURFACE} font-display text-2xl text-accent-ink`}
      style={{ ...position, backgroundColor: tier.color }}
    >
      {tier.label}
    </div>
  );
}

function resolveDropHighlight(drag: DragState, clientX: number, clientY: number): DropHighlight {
  const element = document.elementFromPoint(clientX, clientY);
  if (!element) {
    return null;
  }

  if (drag.kind === "item") {
    const target = element.closest("[data-item-drop-target]") as HTMLElement | null;
    const targetId = target?.dataset.itemDropTarget;
    return targetId ? { kind: "item", targetId } : null;
  }

  const target = element.closest("[data-tier-drop-target]") as HTMLElement | null;
  const tierId = target?.dataset.tierDropTarget;
  return tierId ? { kind: "tier", tierId } : null;
}

export function TierListEditor({
  initialState,
  onChange,
  visibilitySlot,
  saveStatus,
  onRetrySave,
  listId,
  gameSearch = false,
}: {
  initialState: TierListState;
  onChange?: (state: TierListState) => void;
  visibilitySlot?: VisibilitySlot;
  saveStatus?: SaveStatus;
  onRetrySave?: () => void;
  listId?: string;
  gameSearch?: boolean;
}) {
  const [state, dispatch] = useReducer(tierListReducer, initialState);
  const [titleDraft, setTitleDraft] = useState(initialState.title);
  const [descriptionDraft, setDescriptionDraft] = useState(initialState.description);
  const [newTierLabel, setNewTierLabel] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemImageUrl, setNewItemImageUrl] = useState("");
  const newItemImageUrlRef = useRef("");
  const [itemFormError, setItemFormError] = useState("");
  const [tierFormError, setTierFormError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropHighlight, setDropHighlight] = useState<DropHighlight>(null);
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemImageUrl, setEditItemImageUrl] = useState("");
  const [editItemDescription, setEditItemDescription] = useState("");
  const [editItemSourceUrl, setEditItemSourceUrl] = useState("");
  const [editItemError, setEditItemError] = useState("");
  const [gameQuery, setGameQuery] = useState("");
  const [gameHits, setGameHits] = useState<CatalogHit[]>([]);
  const [gameError, setGameError] = useState("");
  const [gameBusy, setGameBusy] = useState(false);
  const [editTierLabel, setEditTierLabel] = useState("");
  const pressRef = useRef<PressState | null>(null);
  const stateRef = useRef(state);
  const onChangeRef = useRef(onChange);
  const publishedRef = useRef(state);
  const titleDraftRef = useRef(titleDraft);
  const descriptionDraftRef = useRef(descriptionDraft);
  const editItemTitleRef = useRef(editItemTitle);
  const editItemImageUrlRef = useRef(editItemImageUrl);
  const editItemDescriptionRef = useRef(editItemDescription);
  const editItemSourceUrlRef = useRef(editItemSourceUrl);
  const editTierLabelRef = useRef(editTierLabel);
  const selectionRef = useRef(selection);
  const commitDraftsRef = useRef<() => void>(() => {});
  const leaveRef = useRef<() => void>(() => {});
  const windowDragRef = useRef<{
    pointerId: number;
    onMove: (event: PointerEvent) => void;
    onEnd: (event: PointerEvent) => void;
  } | null>(null);
  stateRef.current = state;
  onChangeRef.current = onChange;
  titleDraftRef.current = titleDraft;
  descriptionDraftRef.current = descriptionDraft;
  editItemTitleRef.current = editItemTitle;
  editItemImageUrlRef.current = editItemImageUrl;
  editItemDescriptionRef.current = editItemDescription;
  editItemSourceUrlRef.current = editItemSourceUrl;
  editTierLabelRef.current = editTierLabel;
  selectionRef.current = selection;

  function withDrafts(base: TierListState) {
    let next = base;
    const title = titleDraftRef.current.trim() || next.title;
    const description = descriptionDraftRef.current.trim();
    if (title !== next.title || description !== next.description) {
      next = tierListReducer(next, { type: "update-list", changes: { title, description } });
    }

    const selected = selectionRef.current;
    if (selected?.kind === "item") {
      const item = next.itemsById[selected.id];
      if (item) {
        const itemTitle = editItemTitleRef.current.trim() || item.title;
        const imageDraft = editItemImageUrlRef.current.trim();
        const imageOk = imageDraft === "" || isItemImageRef(imageDraft);
        const imageUrl = imageOk ? imageDraft : item.imageUrl;
        const description = editItemDescriptionRef.current.trim().slice(0, MAX_ITEM_TEXT);
        const sourceDraft = editItemSourceUrlRef.current.trim();
        const sourceOk = sourceDraft === "" || isValidImageUrl(sourceDraft);
        const sourceUrl = sourceOk ? sourceDraft : item.sourceUrl;
        if (
          itemTitle !== item.title ||
          imageUrl !== item.imageUrl ||
          description !== item.description ||
          sourceUrl !== item.sourceUrl
        ) {
          next = tierListReducer(next, {
            type: "update-item",
            itemId: selected.id,
            changes: { title: itemTitle, imageUrl, description, sourceUrl },
          });
        }
      }
    } else if (selected?.kind === "tier") {
      const tier = next.tiers.find((currentTier) => currentTier.id === selected.id);
      const label = editTierLabelRef.current.trim();
      if (tier && label && label !== tier.label) {
        next = tierListReducer(next, {
          type: "update-tier",
          tierId: selected.id,
          changes: { label },
        });
      }
    }

    return next;
  }

  function publish(next: TierListState) {
    if (next === stateRef.current) {
      return;
    }
    stateRef.current = next;
    publishedRef.current = next;
    dispatch({ type: "reset", state: next });
    onChangeRef.current?.(next);
  }

  function commitDrafts() {
    publish(withDrafts(stateRef.current));
  }

  function commit(action: TierListAction) {
    const base = action.type === "reset" ? stateRef.current : withDrafts(stateRef.current);
    publish(tierListReducer(base, action));
  }

  commitDraftsRef.current = commitDrafts;

  useEffect(() => {
    return () => {
      leaveRef.current();
    };
  }, []);

  useEffect(() => {
    if (publishedRef.current === state) {
      return;
    }
    publishedRef.current = state;
    onChangeRef.current?.(state);
  }, [state]);

  function disarmWindowDrag() {
    const active = windowDragRef.current;
    if (!active) {
      return;
    }
    window.removeEventListener("pointermove", active.onMove);
    window.removeEventListener("pointerup", active.onEnd);
    window.removeEventListener("pointercancel", active.onEnd);
    windowDragRef.current = null;
  }

  function updateDragPointer(event: PointerEvent) {
    const press = pressRef.current;
    if (!press || event.pointerId !== press.pointerId) {
      return;
    }

    setDrag({
      kind: press.kind,
      id: press.id,
      from: press.from,
      pointerId: press.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      offsetX: press.offsetX,
      offsetY: press.offsetY,
    });
    setDropHighlight(
      resolveDropHighlight(
        {
          kind: press.kind,
          id: press.id,
          from: press.from,
          pointerId: press.pointerId,
          pointerType: event.pointerType,
          x: event.clientX,
          y: event.clientY,
          offsetX: press.offsetX,
          offsetY: press.offsetY,
        },
        event.clientX,
        event.clientY,
      ),
    );
  }

  function armWindowDrag(pointerId: number) {
    if (windowDragRef.current?.pointerId === pointerId) {
      return;
    }
    disarmWindowDrag();

    function onPointerMove(event: PointerEvent) {
      updateDragPointer(event);
    }

    function onPointerEnd(event: PointerEvent) {
      if (event.pointerId !== pointerId) {
        return;
      }
      finishPointerDrag(event.clientX, event.clientY, pointerId, event.pointerType);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    windowDragRef.current = { pointerId, onMove: onPointerMove, onEnd: onPointerEnd };
  }

  const totalItems = Object.keys(state.itemsById).length;
  const selectedItem = selection?.kind === "item" ? state.itemsById[selection.id] : undefined;
  const selectedTier =
    selection?.kind === "tier" ? state.tiers.find((tier) => tier.id === selection.id) : undefined;
  const selectedItemLocation = selectedItem
    ? getItemLocation(state, selectedItem.id)
    : { kind: "unranked" as const };
  const selectedTierIndex = selectedTier
    ? state.tiers.findIndex((tier) => tier.id === selectedTier.id)
    : -1;
  const layoutTier: Tier = selectedTier ??
    state.tiers[0] ?? {
      id: "layout-tier",
      label: "S",
      color: TIER_COLORS[0],
      itemIds: [],
    };

  useEffect(() => {
    if (!selection) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-editor-selectable]") || target.closest("[data-editor-sidebar]")) {
        return;
      }
      commitDraftsRef.current();
      selectionRef.current = null;
      setSelection(null);
      setEditItemError("");
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        commitDraftsRef.current();
        selectionRef.current = null;
        setSelection(null);
        setEditItemError("");
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selection]);

  function selectEntity(next: EditorSelection) {
    commitDrafts();
    if (next.kind === "item") {
      const item = stateRef.current.itemsById[next.id];
      if (!item) {
        return;
      }
      editItemTitleRef.current = item.title;
      editItemImageUrlRef.current = item.imageUrl;
      editItemDescriptionRef.current = item.description;
      editItemSourceUrlRef.current = item.sourceUrl;
      setEditItemTitle(item.title);
      setEditItemImageUrl(item.imageUrl);
      setEditItemDescription(item.description);
      setEditItemSourceUrl(item.sourceUrl);
      setEditItemError("");
    } else {
      const tier = stateRef.current.tiers.find((currentTier) => currentTier.id === next.id);
      if (!tier) {
        return;
      }
      editTierLabelRef.current = tier.label;
      setEditTierLabel(tier.label);
    }
    selectionRef.current = next;
    setSelection(next);
  }

  function resetEditor() {
    titleDraftRef.current = initialState.title;
    descriptionDraftRef.current = initialState.description;
    editItemTitleRef.current = "";
    editItemImageUrlRef.current = "";
    editItemDescriptionRef.current = "";
    editItemSourceUrlRef.current = "";
    editTierLabelRef.current = "";
    selectionRef.current = null;
    const draftImage = newItemImageUrlRef.current;
    const draftOnItem = hostedImageUsed(stateRef.current, draftImage);
    commit({ type: "reset", state: initialState });
    setTitleDraft(initialState.title);
    setDescriptionDraft(initialState.description);
    setNewTierLabel("");
    setNewItemTitle("");
    newItemImageUrlRef.current = "";
    setNewItemImageUrl("");
    if (!draftOnItem) {
      releaseDraftUpload(draftImage, stateRef.current);
    }
    setItemFormError("");
    setTierFormError("");
    setSelection(null);
    setAnnouncement(onChange ? "List reset." : "Editor reset to the demo list.");
  }

  function commitMetadata() {
    commitDrafts();
    setTitleDraft(titleDraftRef.current.trim() || stateRef.current.title);
  }

  function startPointerDrag(
    event: React.PointerEvent<HTMLElement>,
    kind: "item" | "tier",
    id: string,
    from?: Location,
  ) {
    if (event.button !== 0) {
      return;
    }

    const interactive = (event.target as HTMLElement).closest(
      "button, input, select, textarea, summary, a",
    );
    if (interactive && interactive !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    pressRef.current = {
      kind,
      id,
      from,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      started: false,
    };
  }

  function trackPointer(event: React.PointerEvent<HTMLElement>) {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) {
      return;
    }

    const distance = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
    if (!press.started && distance < DRAG_THRESHOLD) {
      return;
    }

    if (!press.started) {
      pressRef.current = { ...press, started: true };
      armWindowDrag(press.pointerId);
    }

    updateDragPointer(event.nativeEvent);
  }

  function cancelPointer() {
    disarmWindowDrag();
    pressRef.current = null;
    setDrag(null);
    setDropHighlight(null);
  }

  function finishPointerDrag(
    clientX: number,
    clientY: number,
    pointerId: number,
    pointerType: string,
    captureTarget?: HTMLElement | null,
  ) {
    const press = pressRef.current;
    if (!press || press.pointerId !== pointerId) {
      return;
    }

    if (press.started) {
      const activeDrag: DragState = {
        kind: press.kind,
        id: press.id,
        from: press.from,
        pointerId: press.pointerId,
        pointerType,
        x: clientX,
        y: clientY,
        offsetX: press.offsetX,
        offsetY: press.offsetY,
      };
      if (activeDrag.kind === "item" && activeDrag.from) {
        dropItem(activeDrag, clientX, clientY);
      } else if (activeDrag.kind === "tier") {
        dropTier(activeDrag, clientX, clientY);
      }
    } else {
      selectEntity({ kind: press.kind, id: press.id });
    }

    if (captureTarget?.hasPointerCapture(pointerId)) {
      captureTarget.releasePointerCapture(pointerId);
    }
    disarmWindowDrag();
    pressRef.current = null;
    setDrag(null);
    setDropHighlight(null);
  }

  function completePointer(event: React.PointerEvent<HTMLElement>) {
    finishPointerDrag(
      event.clientX,
      event.clientY,
      event.pointerId,
      event.pointerType,
      event.currentTarget,
    );
  }

  function dropItem(activeDrag: DragState, clientX: number, clientY: number) {
    const from = activeDrag.from;
    if (!from) {
      return;
    }

    const element = document.elementFromPoint(clientX, clientY);
    const target = element?.closest("[data-item-drop-target]") as HTMLElement | null;
    const targetId = target?.dataset.itemDropTarget;
    if (!target || !targetId) {
      return;
    }

    const to: Location =
      targetId === "unranked" ? { kind: "unranked" } : { kind: "tier", tierId: targetId };
    const ids = getCollectionIds(stateRef.current, to).filter((id) => id !== activeDrag.id);
    const hovered = element?.closest("[data-item-id]") as HTMLElement | null;
    const hoveredId = hovered?.dataset.itemId;
    let index: number | null = null;
    if (hoveredId) {
      const hoveredIndex = ids.indexOf(hoveredId);
      if (hoveredIndex !== -1) {
        const rect = hovered.getBoundingClientRect();
        index = hoveredIndex + (clientX > rect.left + rect.width / 2 ? 1 : 0);
      }
    }

    // The dragged card ignores pointer events, so a release on its own slot or on row
    // padding hits the row instead of a card. Appending would reorder that row in place.
    if (index === null) {
      if (locationValue(from) === locationValue(to)) {
        return;
      }
      index = ids.length;
    }

    moveItem(activeDrag.id, from, to, index);
  }

  function dropTier(activeDrag: DragState, clientX: number, clientY: number) {
    const element = document.elementFromPoint(clientX, clientY);
    const target = element?.closest("[data-tier-drop-target]") as HTMLElement | null;
    const targetId = target?.dataset.tierDropTarget;
    if (!target || !targetId) {
      return;
    }

    const tiers = stateRef.current.tiers.filter((tier) => tier.id !== activeDrag.id);
    const hoveredIndex = tiers.findIndex((tier) => tier.id === targetId);
    const sourceIndex = stateRef.current.tiers.findIndex((tier) => tier.id === activeDrag.id);
    const targetIndex = stateRef.current.tiers.findIndex((tier) => tier.id === targetId);
    if (hoveredIndex === -1 || sourceIndex === -1 || targetIndex === -1) {
      return;
    }

    const index = sourceIndex < targetIndex ? hoveredIndex + 1 : hoveredIndex;
    moveTier(activeDrag.id, index);
  }

  function moveItem(itemId: string, from: Location, to: Location, index: number) {
    commit({ type: "move-item", input: { itemId, from, to, index } });
    const item = stateRef.current.itemsById[itemId];
    if (item) {
      setAnnouncement(`${item.title} moved to ${locationLabel(stateRef.current, to)}.`);
    }
  }

  function moveTier(tierId: string, index: number) {
    commit({ type: "move-tier", tierId, index });
    const tier = stateRef.current.tiers.find((currentTier) => currentTier.id === tierId);
    if (tier) {
      setAnnouncement(`${tier.label} tier moved.`);
    }
  }

  function addTier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = newTierLabel.trim();
    if (!label) {
      setTierFormError("Tier name is required.");
      return;
    }

    commit({
      type: "add-tier",
      tier: {
        id: createId("tier"),
        label,
        color: TIER_COLORS[state.tiers.length % TIER_COLORS.length],
        itemIds: [],
      },
    });
    setNewTierLabel("");
    setTierFormError("");
  }

  function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newItemTitle.trim();
    const imageUrl = newItemImageUrl.trim();
    if (!title) {
      setItemFormError("Title is required.");
      return;
    }
    if (imageUrl && !isItemImageRef(imageUrl)) {
      setItemFormError("Image URL must start with http:// or https://.");
      return;
    }

    commit({
      type: "add-item",
      item: { id: createId("item"), title, imageUrl, description: "", sourceUrl: "" },
    });
    setNewItemTitle("");
    replaceNewItemImage("");
    setItemFormError("");
  }

  function hostedImageUsed(board: TierListState, imageUrl: string) {
    if (!listId) {
      return false;
    }
    const imageId = listImageId(listId, imageUrl);
    if (!imageId) {
      return false;
    }
    const cited = `/api/lists/${listId}/images/${imageId}`;
    return (
      Object.values(board.itemsById).some((item) => item.imageUrl === cited) ||
      editItemImageUrlRef.current.trim() === cited
    );
  }

  function releaseDraftUpload(imageUrl: string, board: TierListState) {
    if (!listId || hostedImageUsed(board, imageUrl)) {
      return;
    }
    const imageId = listImageId(listId, imageUrl);
    if (!imageId) {
      return;
    }
    void fetch(`/api/lists/${listId}/images/${imageId}`, { method: "DELETE" });
  }

  function replaceNewItemImage(imageUrl: string) {
    const previous = newItemImageUrlRef.current;
    newItemImageUrlRef.current = imageUrl;
    setNewItemImageUrl(imageUrl);
    if (previous !== imageUrl) {
      releaseDraftUpload(previous, stateRef.current);
    }
  }

  leaveRef.current = () => {
    const next = withDrafts(stateRef.current);
    if (next !== stateRef.current) {
      onChangeRef.current?.(next);
    }
    releaseDraftUpload(newItemImageUrlRef.current, next);
  };

  function saveSelectedItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selection?.kind !== "item") {
      return;
    }

    const nextTitle = editItemTitle.trim();
    const nextImageUrl = editItemImageUrl.trim();
    const nextDescription = editItemDescription.trim();
    const nextSourceUrl = editItemSourceUrl.trim();
    if (!nextTitle) {
      setEditItemError("Title is required.");
      return;
    }
    if (nextImageUrl && !isItemImageRef(nextImageUrl)) {
      setEditItemError("Image URL must start with http:// or https://.");
      return;
    }
    if (nextSourceUrl && !isValidImageUrl(nextSourceUrl)) {
      setEditItemError("Source URL must start with http:// or https://.");
      return;
    }

    commit({
      type: "update-item",
      itemId: selection.id,
      changes: {
        title: nextTitle,
        imageUrl: nextImageUrl,
        description: nextDescription.slice(0, MAX_ITEM_TEXT),
        sourceUrl: nextSourceUrl,
      },
    });
    setEditItemError("");
    setAnnouncement(`${nextTitle} updated.`);
  }

  function moveSelectedItemTo(value: string) {
    if (selection?.kind !== "item" || !selectedItem) {
      return;
    }

    const from = getItemLocation(state, selectedItem.id);
    const to: Location =
      value === "unranked" ? { kind: "unranked" } : { kind: "tier", tierId: value };
    if (locationValue(from) === locationValue(to)) {
      return;
    }

    moveItem(selectedItem.id, from, to, getCollectionIds(state, to).length);
  }

  function addCatalogHit(hit: CatalogHit) {
    commit({
      type: "add-item",
      item: {
        id: createId("item"),
        title: hit.title,
        imageUrl: hit.imageUrl,
        description: hit.description,
        sourceUrl: hit.sourceUrl,
      },
    });
    setAnnouncement(`${hit.title} added to unranked.`);
  }

  async function searchGames(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = gameQuery.trim();
    if (query.length < 2) {
      setGameError("Enter at least 2 characters.");
      return;
    }
    setGameBusy(true);
    setGameError("");
    try {
      const response = await fetch(`/api/igdb/search?q=${encodeURIComponent(query)}`);
      const payload: unknown = await response.json().catch(() => null);
      const hits = readCatalogHits(payload);
      if (!response.ok || !hits) {
        setGameHits([]);
        setGameError(readError(payload) ?? "Game search failed.");
        return;
      }
      setGameHits(hits);
      if (hits.length === 0) {
        setGameError("No games found.");
      }
    } catch {
      setGameHits([]);
      setGameError("Game search failed.");
    } finally {
      setGameBusy(false);
    }
  }

  function deleteSelectedItem() {
    if (selection?.kind !== "item") {
      return;
    }

    const item = state.itemsById[selection.id];
    selectionRef.current = null;
    commit({ type: "remove-item", itemId: selection.id });
    setSelection(null);
    if (item) {
      setAnnouncement(`${item.title} removed.`);
    }
  }

  function saveSelectedTierLabel() {
    if (selection?.kind !== "tier" || !selectedTier) {
      return;
    }

    const label = editTierLabel.trim();
    if (!label) {
      editTierLabelRef.current = selectedTier.label;
      setEditTierLabel(selectedTier.label);
      return;
    }

    commit({
      type: "update-tier",
      tierId: selection.id,
      changes: { label },
    });
  }

  function updateSelectedTierColor(color: Tier["color"]) {
    if (selection?.kind !== "tier" || !selectedTier) {
      return;
    }

    commit({
      type: "update-tier",
      tierId: selection.id,
      changes: { color },
    });
  }

  function moveSelectedTierBy(offset: -1 | 1) {
    if (!selectedTier || selectedTierIndex === -1) {
      return;
    }
    moveTier(selectedTier.id, selectedTierIndex + offset);
  }

  function deleteSelectedTier() {
    if (selection?.kind !== "tier" || !selectedTier) {
      return;
    }

    selectionRef.current = null;
    commit({ type: "delete-tier", tierId: selection.id });
    setSelection(null);
    setAnnouncement(`${selectedTier.label} tier removed.`);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div className="max-w-2xl">
            <a
              href="/"
              className="font-body text-xs font-bold uppercase tracking-[0.2em] text-muted underline-offset-4 hover:underline"
            >
              ← Polychkova
            </a>
            <h1 className="mt-3 max-w-2xl break-words font-display text-4xl leading-none tracking-[-0.04em] sm:text-5xl">
              {state.title}
            </h1>
            <p className="mt-3 max-w-xl font-body text-base leading-7 text-muted">
              {state.description}
            </p>
            <details className="mt-4 max-w-xl">
              <summary className="cursor-pointer font-body text-xs font-bold uppercase tracking-wide text-muted">
                Edit list details
              </summary>
              <div className="mt-3 grid gap-3">
                <label className={LABEL}>
                  Title
                  <input
                    aria-label="List title"
                    className={FIELD}
                    value={titleDraft}
                    onChange={(event) => {
                      titleDraftRef.current = event.currentTarget.value;
                      setTitleDraft(event.currentTarget.value);
                      commitDrafts();
                    }}
                    onBlur={commitMetadata}
                  />
                </label>
                <label className={LABEL}>
                  Description
                  <input
                    aria-label="List description"
                    className={FIELD}
                    value={descriptionDraft}
                    onChange={(event) => {
                      descriptionDraftRef.current = event.currentTarget.value;
                      setDescriptionDraft(event.currentTarget.value);
                      commitDrafts();
                    }}
                    onBlur={commitMetadata}
                  />
                </label>
              </div>
            </details>
            {visibilitySlot ? (
              <label className={`${LABEL} mt-4 max-w-xs`}>
                Visibility
                <select
                  aria-label="List visibility"
                  className={FIELD}
                  value={visibilitySlot.visibility}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    if (value !== "unlisted" && value !== "public") {
                      return;
                    }
                    commitDrafts();
                    visibilitySlot.onVisibilityChange(value);
                  }}
                >
                  <option value="unlisted">Unlisted — link only</option>
                  <option value="public">Public — on Discover</option>
                </select>
              </label>
            ) : null}
            {listId ? (
              <p className="mt-3 max-w-xl font-body text-sm text-muted">
                <a
                  href={`/l/${listId}`}
                  className="font-bold text-ink underline-offset-4 hover:underline"
                >
                  Share page
                </a>
              </p>
            ) : null}
          </div>
          {saveStatus ? (
            <div className="flex items-center gap-3">
              <p
                role="status"
                className={`font-body text-xs ${saveStatus.kind === "error" ? "text-ink" : "text-muted"}`}
              >
                {saveStatus.kind === "saving"
                  ? "Saving"
                  : saveStatus.kind === "saved"
                    ? "Saved"
                    : saveStatus.message || "Could not save."}
              </p>
              {saveStatus.kind === "error" && onRetrySave ? (
                <button type="button" className={BTN_SECONDARY} onClick={onRetrySave}>
                  Retry save
                </button>
              ) : null}
            </div>
          ) : (
            <p className="font-body text-xs text-muted">Demo — not saved</p>
          )}
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <section aria-labelledby="board-title" className="min-w-0">
            <h2 id="board-title" className="sr-only">
              Tier list board
            </h2>
            <div className={BOARD_FRAME}>
              <ol>
                {state.tiers.length === 0 ? (
                  <li className="flex min-h-20 items-center border-b border-dashed border-line px-2 font-body text-sm text-muted">
                    Add a tier from the sidebar, then drag items into it.
                  </li>
                ) : null}
                {state.tiers.map((tier) => (
                  <TierRow
                    key={tier.id}
                    tier={tier}
                    state={state}
                    drag={drag}
                    dropHighlight={dropHighlight}
                    onTierDragPointerDown={startPointerDrag}
                    onPointerMove={trackPointer}
                    onPointerUp={completePointer}
                    onPointerCancel={cancelPointer}
                    onItemDragPointerDown={startPointerDrag}
                    selection={selection}
                    onSelect={selectEntity}
                  />
                ))}
              </ol>

              <div
                data-item-drop-target="unranked"
                className={`border-t border-line ${
                  dropHighlight?.kind === "item" && dropHighlight.targetId === "unranked"
                    ? DROP_TARGET
                    : ""
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 border-b border-line px-2 py-1">
                  <h3 className="font-display text-lg leading-none">Unranked</h3>
                  <span className="font-body text-[11px] text-muted">
                    {state.unrankedItemIds.length} items
                  </span>
                </div>
                <div className="flex min-h-20 flex-wrap gap-0 bg-paper">
                  {state.unrankedItemIds.map((itemId) => {
                    const item = state.itemsById[itemId];
                    if (!item) {
                      return null;
                    }

                    return (
                      <ItemCard
                        key={item.id}
                        item={item}
                        location={{ kind: "unranked" }}
                        isDragging={drag?.kind === "item" && drag.id === item.id}
                        isSelected={selection?.kind === "item" && selection.id === item.id}
                        onPointerDown={startPointerDrag}
                        onPointerMove={trackPointer}
                        onPointerUp={completePointer}
                        onPointerCancel={cancelPointer}
                        onSelect={selectEntity}
                      />
                    );
                  })}
                  {state.unrankedItemIds.length === 0 ? (
                    <p className="flex min-h-20 items-center px-2 font-body text-sm text-muted">
                      {totalItems === 0
                        ? "Add items from the sidebar to get started."
                        : "Everything has a tier."}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <aside
            data-editor-sidebar=""
            className="grid content-start gap-6 border-4 border-line bg-panel p-5 shadow-[6px_6px_0_var(--line)]"
          >
            <section aria-labelledby="inspector-title" className="border-b border-line pb-6">
              <h2 id="inspector-title" className="mb-3 font-display text-xl leading-none">
                {selectedItem ? "Edit item" : selectedTier ? "Edit tier" : "Inspector"}
              </h2>
              <div className="grid">
                <form
                  className={`${INSPECTOR_PANEL} ${selectedItem ? "" : INSPECTOR_HIDDEN}`}
                  onSubmit={saveSelectedItem}
                  aria-hidden={!selectedItem}
                >
                  <label className={LABEL}>
                    Title
                    <input
                      className={FIELD}
                      value={editItemTitle}
                      onChange={(event) => {
                        editItemTitleRef.current = event.currentTarget.value;
                        setEditItemTitle(event.currentTarget.value);
                        commitDrafts();
                      }}
                      tabIndex={selectedItem ? 0 : -1}
                    />
                  </label>
                  <label className={LABEL}>
                    Image URL
                    <input
                      className={FIELD}
                      value={editItemImageUrl}
                      onChange={(event) => {
                        editItemImageUrlRef.current = event.currentTarget.value;
                        setEditItemImageUrl(event.currentTarget.value);
                        commitDrafts();
                      }}
                      placeholder="Optional — https://…"
                      tabIndex={selectedItem ? 0 : -1}
                    />
                  </label>
                  {listId && selectedItem ? (
                    <ItemImagePicker
                      listId={listId}
                      onImage={(imageUrl) => {
                        editItemImageUrlRef.current = imageUrl;
                        setEditItemImageUrl(imageUrl);
                        commitDrafts();
                      }}
                    />
                  ) : null}
                  <label className={LABEL}>
                    Description
                    <textarea
                      className={`${FIELD} h-auto min-h-20 py-2`}
                      value={editItemDescription}
                      maxLength={MAX_ITEM_TEXT}
                      onChange={(event) => {
                        editItemDescriptionRef.current = event.currentTarget.value;
                        setEditItemDescription(event.currentTarget.value);
                        commitDrafts();
                      }}
                      tabIndex={selectedItem ? 0 : -1}
                    />
                  </label>
                  <label className={LABEL}>
                    Source URL
                    <input
                      className={FIELD}
                      value={editItemSourceUrl}
                      onChange={(event) => {
                        editItemSourceUrlRef.current = event.currentTarget.value;
                        setEditItemSourceUrl(event.currentTarget.value);
                        commitDrafts();
                      }}
                      placeholder="Optional — https://…"
                      tabIndex={selectedItem ? 0 : -1}
                    />
                  </label>
                  <label className={LABEL}>
                    Rank
                    <select
                      className={FIELD}
                      value={locationValue(selectedItemLocation)}
                      onChange={(event) => moveSelectedItemTo(event.currentTarget.value)}
                      tabIndex={selectedItem ? 0 : -1}
                    >
                      <option value="unranked">Unranked</option>
                      {state.tiers.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.label} tier
                        </option>
                      ))}
                    </select>
                  </label>
                  <p
                    role="alert"
                    className={`min-h-4 font-body text-xs ${editItemError ? "text-ink" : "invisible"}`}
                  >
                    {editItemError || " "}
                  </p>
                  <button type="submit" className={BTN_PRIMARY} tabIndex={selectedItem ? 0 : -1}>
                    Save changes
                  </button>
                  <button
                    type="button"
                    className={`${BTN_SECONDARY} w-full text-muted`}
                    onClick={deleteSelectedItem}
                    tabIndex={selectedItem ? 0 : -1}
                  >
                    Delete item
                  </button>
                </form>

                <div
                  className={`${INSPECTOR_PANEL} ${selectedTier ? "" : INSPECTOR_HIDDEN}`}
                  aria-hidden={!selectedTier}
                >
                  <label className={LABEL}>
                    Name
                    <input
                      className={FIELD}
                      value={editTierLabel}
                      onChange={(event) => {
                        editTierLabelRef.current = event.currentTarget.value;
                        setEditTierLabel(event.currentTarget.value);
                        commitDrafts();
                      }}
                      onBlur={saveSelectedTierLabel}
                      tabIndex={selectedTier ? 0 : -1}
                    />
                  </label>
                  <fieldset className="grid gap-2 border-0 p-0">
                    <legend className={`${LABEL} mb-0`}>Color</legend>
                    <div className="flex flex-wrap gap-2">
                      {TIER_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          aria-pressed={layoutTier.color === color}
                          aria-label={`Color ${color}`}
                          className={`h-8 w-8 border border-line ${
                            layoutTier.color === color
                              ? "ring-2 ring-ink ring-offset-1 ring-offset-panel"
                              : ""
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => updateSelectedTierColor(color)}
                          tabIndex={selectedTier ? 0 : -1}
                        />
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={BTN_SECONDARY}
                      onClick={() => moveSelectedTierBy(-1)}
                      disabled={!selectedTier || selectedTierIndex <= 0}
                      tabIndex={selectedTier ? 0 : -1}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      className={BTN_SECONDARY}
                      onClick={() => moveSelectedTierBy(1)}
                      disabled={!selectedTier || selectedTierIndex >= state.tiers.length - 1}
                      tabIndex={selectedTier ? 0 : -1}
                    >
                      Move down
                    </button>
                  </div>
                  <button
                    type="button"
                    className={`${BTN_SECONDARY} w-full text-left text-muted`}
                    onClick={deleteSelectedTier}
                    tabIndex={selectedTier ? 0 : -1}
                  >
                    Delete tier (moves {layoutTier.itemIds.length} to unranked)
                  </button>
                </div>

                <p
                  className={`${INSPECTOR_PANEL} font-body text-sm text-muted ${selection ? INSPECTOR_HIDDEN : ""}`}
                  aria-hidden={Boolean(selection)}
                >
                  Select a card or tier label to edit it here. Press Escape to deselect.
                </p>
              </div>
            </section>

            <form className="grid gap-3" onSubmit={addItem}>
              <h2 className="font-display text-xl leading-none">Add an item</h2>
              <label className={LABEL}>
                Title
                <input
                  className={FIELD}
                  value={newItemTitle}
                  onChange={(event) => setNewItemTitle(event.currentTarget.value)}
                  placeholder="Something to rank"
                />
              </label>
              <label className={LABEL}>
                Image URL
                <input
                  className={FIELD}
                  value={newItemImageUrl}
                  onChange={(event) => replaceNewItemImage(event.currentTarget.value)}
                  placeholder="Optional — https://…"
                />
              </label>
              {listId ? <ItemImagePicker listId={listId} onImage={replaceNewItemImage} /> : null}
              {itemFormError ? (
                <p role="alert" className="font-body text-xs text-ink">
                  {itemFormError}
                </p>
              ) : null}
              <button type="submit" className={BTN_PRIMARY}>
                Add to unranked
              </button>
            </form>

            {gameSearch ? (
              <form
                className="grid gap-3 border-t border-line pt-6"
                onSubmit={(event) => {
                  void searchGames(event);
                }}
              >
                <h2 className="font-display text-xl leading-none">Search games</h2>
                <label className={LABEL}>
                  IGDB
                  <input
                    className={FIELD}
                    value={gameQuery}
                    onChange={(event) => setGameQuery(event.currentTarget.value)}
                    placeholder="Game title"
                  />
                </label>
                {gameError ? (
                  <p role="alert" className="font-body text-xs text-ink">
                    {gameError}
                  </p>
                ) : null}
                <button type="submit" className={BTN_PRIMARY} disabled={gameBusy}>
                  {gameBusy ? "Searching…" : "Search"}
                </button>
                {gameHits.length > 0 ? (
                  <ul className="grid gap-2">
                    {gameHits.map((hit) => (
                      <li key={`${hit.sourceUrl}-${hit.title}`}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 border border-line bg-paper p-1 text-left"
                          onClick={() => addCatalogHit(hit)}
                        >
                          <Image
                            src={hit.imageUrl}
                            alt=""
                            width={40}
                            height={40}
                            unoptimized
                            className="size-10 shrink-0 object-cover"
                          />
                          <span className="truncate font-body text-sm font-bold">{hit.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </form>
            ) : null}

            <form className="grid gap-3 border-t border-line pt-6" onSubmit={addTier}>
              <h2 className="font-display text-xl leading-none">Add a tier</h2>
              <label className={LABEL}>
                Tier name
                <input
                  className={FIELD}
                  value={newTierLabel}
                  onChange={(event) => setNewTierLabel(event.currentTarget.value)}
                  placeholder="C"
                />
              </label>
              {tierFormError ? (
                <p role="alert" className="font-body text-xs text-ink">
                  {tierFormError}
                </p>
              ) : null}
              <button type="submit" className={BTN_PRIMARY}>
                Add tier
              </button>
            </form>

            <div className="border-t border-line pt-6">
              <button type="button" className={`${BTN_SECONDARY} w-full`} onClick={resetEditor}>
                {onChange ? "Reset list" : "Reset demo"}
              </button>
            </div>

            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>
            <p id="board-instructions" className="font-body text-sm leading-5 text-muted">
              Select with click, Enter, or Space; press Escape to deselect. Drag cards to rank and
              tier labels to reorder, or use the inspector controls.
            </p>
          </aside>
        </div>

        {drag ? createPortal(<DragPreview drag={drag} state={state} />, document.body) : null}
      </div>
    </main>
  );
}
