import { describe, expect, it } from "vitest";
import { igdbSearchBody, parseIgdbGames } from "./igdb";

describe("igdb", () => {
  it("builds a single search statement", () => {
    expect(igdbSearchBody('zelda "totk"\n')).toBe(
      'search "zelda  totk"; fields name,summary,url,cover.image_id; where cover != null & version_parent = null; limit 8;',
    );
  });

  it("keeps games that have a cover", () => {
    expect(
      parseIgdbGames([
        {
          name: "  Outer Wilds ",
          summary: "A solar system.",
          url: "https://www.igdb.com/games/outer-wilds",
          cover: { image_id: "co1abc" },
        },
        { name: "No cover", summary: "", url: "https://www.igdb.com/games/no-cover" },
        { name: "Bad link", url: "javascript:alert(1)", cover: { image_id: "co9xyz" } },
      ]),
    ).toEqual([
      {
        title: "Outer Wilds",
        description: "A solar system.",
        imageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg",
        sourceUrl: "https://www.igdb.com/games/outer-wilds",
      },
      {
        title: "Bad link",
        description: "",
        imageUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co9xyz.jpg",
        sourceUrl: "",
      },
    ]);
  });

  it("ignores a non-array payload", () => {
    expect(parseIgdbGames({ name: "nope" })).toEqual([]);
  });
});
