import { describe, expect, it } from "vitest";
import { safeNextPath, titleLikePattern, titleSearch } from "./site";

describe("site paths", () => {
  it("keeps an in-app path and rejects an open redirect", () => {
    expect(safeNextPath("/l/abc")).toBe("/l/abc");
    expect(safeNextPath("https://evil.example")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
    expect(safeNextPath("/\\evil")).toBe("/account");
    expect(safeNextPath(undefined)).toBe("/account");
  });

  it("turns a title search into an escaped like pattern", () => {
    expect(titleSearch("  Games  ")).toBe("Games");
    expect(titleSearch("   ")).toBeNull();
    expect(titleSearch(undefined)).toBeNull();
    expect(titleLikePattern("100%_S\\")).toBe("%100\\%\\_S\\\\%");
  });
});
