import { describe, expect, it } from "vitest";
import {
  addItem,
  addTier,
  deleteTier,
  moveItem,
  moveTier,
  removeItem,
  type TierListState,
  tierListReducer,
  updateItem,
  updateList,
  updateTier,
} from "./tier-list";

const initialState: TierListState = {
  title: "Games",
  description: "Ranked games",
  tiers: [
    { id: "s", label: "S", color: "#ef4444", itemIds: ["one"] },
    { id: "a", label: "A", color: "#f97316", itemIds: ["two"] },
  ],
  itemsById: {
    one: {
      id: "one",
      title: "One",
      imageUrl: "https://example.com/one.jpg",
      description: "",
      sourceUrl: "",
    },
    two: {
      id: "two",
      title: "Two",
      imageUrl: "https://example.com/two.jpg",
      description: "",
      sourceUrl: "",
    },
    three: {
      id: "three",
      title: "Three",
      imageUrl: "https://example.com/three.jpg",
      description: "",
      sourceUrl: "",
    },
  },
  unrankedItemIds: ["three"],
};

function expectItemsAppearOnce(state: TierListState) {
  const locations = [...state.unrankedItemIds, ...state.tiers.flatMap((tier) => tier.itemIds)];
  expect(new Set(locations).size).toBe(locations.length);
  expect(locations.sort()).toEqual(Object.keys(state.itemsById).sort());
}

describe("tier-list state", () => {
  it("updates list metadata and tier metadata", () => {
    const withList = updateList(initialState, {
      title: "  Better games ",
      description: "  New description ",
    });
    const withTier = updateTier(withList, "s", { label: "  Must play ", color: "#22c55e" });

    expect(withTier.title).toBe("Better games");
    expect(withTier.description).toBe("New description");
    expect(withTier.tiers[0]).toMatchObject({ label: "Must play", color: "#22c55e" });
  });

  it("adds items without an image URL", () => {
    const added = addItem(initialState, {
      id: "four",
      title: "Four",
      imageUrl: "",
      description: "",
      sourceUrl: "",
    });

    expect(added.itemsById.four).toMatchObject({ title: "Four", imageUrl: "" });
    expect(added.unrankedItemIds).toContain("four");
  });

  it("rejects invalid metadata, item data, and duplicate IDs", () => {
    const invalidList = updateList(initialState, { title: "   " });
    const invalidTier = updateTier(initialState, "s", { label: " " });
    const invalidItem = addItem(initialState, {
      id: "four",
      title: "Four",
      imageUrl: "data:image/png;base64,abc",
      description: "",
      sourceUrl: "",
    });
    const emptyTitle = addItem(initialState, {
      id: "four",
      title: "  ",
      imageUrl: "",
      description: "",
      sourceUrl: "",
    });
    const badSource = addItem(initialState, {
      id: "four",
      title: "Four",
      imageUrl: "",
      description: "",
      sourceUrl: "javascript:alert(1)",
    });
    const duplicate = addItem(initialState, {
      id: "one",
      title: "Duplicate",
      imageUrl: "https://example.com/duplicate.jpg",
      description: "",
      sourceUrl: "",
    });

    expect(invalidList).toBe(initialState);
    expect(invalidTier).toBe(initialState);
    expect(invalidItem).toBe(initialState);
    expect(emptyTitle).toBe(initialState);
    expect(badSource).toBe(initialState);
    expect(duplicate).toBe(initialState);
  });

  it("adds, updates, and removes items from every collection", () => {
    const added = addItem(initialState, {
      id: "four",
      title: "  Four ",
      imageUrl: " https://example.com/four.jpg ",
      description: "  A note ",
      sourceUrl: " https://example.com/four ",
    });
    const updated = updateItem(added, "four", { title: "Updated" });
    const removed = removeItem(updated, "one");

    expect(updated.itemsById.four).toMatchObject({
      title: "Updated",
      imageUrl: "https://example.com/four.jpg",
    });
    expect(removed.itemsById.one).toBeUndefined();
    expect(removed.tiers[0].itemIds).not.toContain("one");
    expectItemsAppearOnce(removed);
  });

  it("moves an item between collections and clamps its insertion index", () => {
    const toTier = moveItem(initialState, {
      itemId: "three",
      from: { kind: "unranked" },
      to: { kind: "tier", tierId: "s" },
      index: 99,
    });
    const reordered = moveItem(toTier, {
      itemId: "one",
      from: { kind: "tier", tierId: "s" },
      to: { kind: "tier", tierId: "s" },
      index: 0,
    });
    const toUnranked = moveItem(reordered, {
      itemId: "two",
      from: { kind: "tier", tierId: "a" },
      to: { kind: "unranked" },
      index: -10,
    });
    const tierToUnranked = moveItem(toUnranked, {
      itemId: "three",
      from: { kind: "tier", tierId: "s" },
      to: { kind: "unranked" },
      index: 99,
    });

    expect(toTier.tiers[0].itemIds).toEqual(["one", "three"]);
    expect(reordered.tiers[0].itemIds).toEqual(["one", "three"]);
    expect(tierToUnranked.unrankedItemIds).toEqual(["two", "three"]);
    expectItemsAppearOnce(tierToUnranked);
  });

  it("does not move an item when its declared source is wrong", () => {
    const next = moveItem(initialState, {
      itemId: "one",
      from: { kind: "unranked" },
      to: { kind: "tier", tierId: "a" },
      index: 0,
    });

    expect(next).toBe(initialState);
  });

  it("adds and reorders tiers with clamped indexes", () => {
    const added = addTier(initialState, {
      id: "b",
      label: "B",
      color: "#eab308",
      itemIds: ["ignored"],
    });
    const moved = moveTier(added, "b", -10);
    const movedToEnd = moveTier(moved, "b", 99);

    expect(added.tiers[2]).toMatchObject({ id: "b", itemIds: [] });
    expect(moved.tiers.map((tier) => tier.id)).toEqual(["b", "s", "a"]);
    expect(movedToEnd.tiers.map((tier) => tier.id)).toEqual(["s", "a", "b"]);
  });

  it("deletes a tier and prepends its items to unranked", () => {
    const next = deleteTier(initialState, "s");

    expect(next.tiers.map((tier) => tier.id)).toEqual(["a"]);
    expect(next.unrankedItemIds).toEqual(["one", "three"]);
    expectItemsAppearOnce(next);
  });

  it("routes reducer actions to the pure operations", () => {
    const next = tierListReducer(initialState, {
      type: "move-item",
      input: {
        itemId: "three",
        from: { kind: "unranked" },
        to: { kind: "tier", tierId: "a" },
        index: 0,
      },
    });

    expect(next.tiers[1].itemIds).toEqual(["three", "two"]);
  });
});
