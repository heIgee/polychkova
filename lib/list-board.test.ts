import { describe, expect, it } from "vitest";
import {
  assembleTierList,
  forkBoard,
  hasForeignListImage,
  type ListBoard,
  parseListSave,
  removedListImageIds,
  retainedListImageIds,
} from "./list-board";

const board: ListBoard = {
  tiers: [{ id: "s", label: "S", color: "#ef4444", itemIds: ["one"] }],
  itemsById: {
    one: {
      id: "one",
      title: "One",
      imageUrl: "https://example.com/one.jpg",
      description: "",
      sourceUrl: "",
    },
  },
  unrankedItemIds: [],
};

function save(state: unknown, visibility: unknown = "unlisted") {
  return parseListSave({ state, visibility });
}

describe("list board", () => {
  it("assembles editor state from a row", () => {
    expect(assembleTierList({ title: "Games", description: "Ranked", board })).toEqual({
      title: "Games",
      description: "Ranked",
      ...board,
    });
  });

  it("accepts an empty tier list and an empty description", () => {
    const parsed = save({
      title: " Untitled ",
      description: "  ",
      tiers: [],
      itemsById: {},
      unrankedItemIds: [],
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.list.title).toBe("Untitled");
    expect(parsed.list.description).toBe("");
    expect(parsed.list.board.tiers).toEqual([]);
  });

  it("rejects a broken board", () => {
    const valid = {
      title: "Games",
      description: "",
      tiers: board.tiers,
      itemsById: board.itemsById,
      unrankedItemIds: board.unrankedItemIds,
    };

    expect(save({ ...valid, extra: true }).ok).toBe(false);
    expect(save({ ...valid, title: " " }).ok).toBe(false);
    expect(save(valid, "private").ok).toBe(false);
    expect(
      save({
        ...valid,
        tiers: [{ ...board.tiers[0], color: "#000000" }],
      }).ok,
    ).toBe(false);
    expect(
      save({
        ...valid,
        tiers: [{ ...board.tiers[0], itemIds: ["one", "one"] }],
      }).ok,
    ).toBe(false);
    expect(
      save({
        ...valid,
        unrankedItemIds: ["one"],
      }).ok,
    ).toBe(false);
    expect(
      save({
        ...valid,
        itemsById: {
          one: { id: "one", title: "One", imageUrl: "https://example.com/one.jpg", extra: true },
        },
      }).ok,
    ).toBe(false);
    expect(
      save({
        ...valid,
        itemsById: { one: { id: "one", title: "One", imageUrl: "javascript:alert(1)" } },
      }).ok,
    ).toBe(false);
    expect(save({ ...valid, itemsById: {}, tiers: [], unrankedItemIds: ["missing"] }).ok).toBe(
      false,
    );

    const oversized = save({
      title: "Games",
      description: "",
      tiers: [],
      itemsById: {
        one: {
          id: "one",
          title: "a".repeat(MAX_TITLE),
          imageUrl: "",
          description: "",
          sourceUrl: "",
        },
      },
      unrankedItemIds: ["one"],
    });
    expect(oversized).toEqual({ ok: false, error: "List is too large." });
    expect(
      save({
        ...valid,
        itemsById: {
          one: {
            id: "one",
            title: "One",
            imageUrl: "https://example.com/one.jpg",
            description: "",
            sourceUrl: "javascript:alert(1)",
          },
        },
      }).ok,
    ).toBe(false);
  });

  it("fills omitted item text and keeps a hosted image on this list", () => {
    const listId = "11111111-1111-4111-8111-111111111111";
    const imageId = "22222222-2222-4222-8222-222222222222";
    const imageUrl = `/api/lists/${listId}/images/${imageId}`;
    const parsed = save({
      title: "Games",
      description: "",
      tiers: [],
      itemsById: {
        one: { id: "one", title: "One", imageUrl },
      },
      unrankedItemIds: ["one"],
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.list.board.itemsById.one).toMatchObject({
      imageUrl,
      description: "",
      sourceUrl: "",
    });
    expect(retainedListImageIds(parsed.list.board, listId)).toEqual([imageId]);
    expect(removedListImageIds(board, parsed.list.board, listId)).toEqual([]);
    expect(
      removedListImageIds(
        parsed.list.board,
        { ...parsed.list.board, itemsById: {}, unrankedItemIds: [] },
        listId,
      ),
    ).toEqual([imageId]);
    expect(hasForeignListImage(parsed.list.board, listId)).toBe(false);
    expect(hasForeignListImage(parsed.list.board, "33333333-3333-4333-8333-333333333333")).toBe(
      true,
    );
  });

  it("forks tiers empty and parks every item in the unranked pool", () => {
    const sourceId = "11111111-1111-4111-8111-111111111111";
    const nextId = "33333333-3333-4333-8333-333333333333";
    const imageId = "22222222-2222-4222-8222-222222222222";
    const nextImageId = "44444444-4444-4444-8444-444444444444";
    const source: ListBoard = {
      tiers: [
        { id: "s", label: "S", color: "#ef4444", itemIds: ["one"] },
        { id: "a", label: "A", color: "#f97316", itemIds: ["two"] },
      ],
      itemsById: {
        one: {
          id: "one",
          title: "One",
          imageUrl: `/api/lists/${sourceId}/images/${imageId}`,
          description: "First",
          sourceUrl: "https://www.igdb.com/games/one",
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
          imageUrl: `/api/lists/${sourceId}/images/55555555-5555-4555-8555-555555555555`,
          description: "",
          sourceUrl: "",
        },
      },
      unrankedItemIds: ["three"],
    };
    const ids = ["item-1", "item-2", "item-3", "tier-s", "tier-a"];
    const forked = forkBoard(source, sourceId, nextId, new Map([[imageId, nextImageId]]), () => {
      const id = ids.shift();
      if (!id) {
        throw new Error("missing id");
      }
      return id;
    });

    expect(forked.tiers).toEqual([
      { id: "tier-s", label: "S", color: "#ef4444", itemIds: [] },
      { id: "tier-a", label: "A", color: "#f97316", itemIds: [] },
    ]);
    expect(forked.unrankedItemIds).toEqual(["item-1", "item-2", "item-3"]);
    expect(forked.itemsById["item-1"]).toMatchObject({
      title: "One",
      imageUrl: `/api/lists/${nextId}/images/${nextImageId}`,
      description: "First",
      sourceUrl: "https://www.igdb.com/games/one",
    });
    expect(forked.itemsById["item-2"]?.imageUrl).toBe("https://example.com/two.jpg");
    expect(forked.itemsById["item-3"]?.imageUrl).toBe("");
  });
});

const MAX_TITLE = 512 * 1024;
