import { describe, expect, it } from "vitest";
import { assembleTierList, type ListBoard, parseListSave } from "./list-board";

const board: ListBoard = {
  tiers: [{ id: "s", label: "S", color: "#ef4444", itemIds: ["one"] }],
  itemsById: { one: { id: "one", title: "One", imageUrl: "https://example.com/one.jpg" } },
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
        one: { id: "one", title: "a".repeat(MAX_TITLE), imageUrl: "" },
      },
      unrankedItemIds: ["one"],
    });
    expect(oversized).toEqual({ ok: false, error: "List is too large." });
  });
});

const MAX_TITLE = 512 * 1024;
