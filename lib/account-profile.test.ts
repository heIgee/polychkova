import { describe, expect, it } from "vitest";
import { parseProfileUpdate } from "./account-profile";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("parseProfileUpdate", () => {
  it("trims the name and leaves the icon unchanged when no file is sent", () => {
    expect(parseProfileUpdate("  Helgee  ", null)).toEqual({
      ok: true,
      name: "Helgee",
      avatar: null,
    });
  });

  it("rejects an empty name", () => {
    expect(parseProfileUpdate("   ", null)).toEqual({ ok: false, error: "Name is required." });
  });

  it("rejects a name over 32 characters", () => {
    expect(parseProfileUpdate("a".repeat(33), null).ok).toBe(false);
  });

  it("accepts a PNG", () => {
    const result = parseProfileUpdate("Helgee", { bytes: png });
    expect(result).toMatchObject({ ok: true, name: "Helgee", avatar: { type: "image/png" } });
  });

  it("rejects a file that is not an image", () => {
    expect(parseProfileUpdate("Helgee", { bytes: new Uint8Array([1, 2, 3]) }).ok).toBe(false);
  });

  it("rejects an icon over 512 KB", () => {
    const bytes = new Uint8Array(512 * 1024 + 1);
    bytes.set(png);
    expect(parseProfileUpdate("Helgee", { bytes }).ok).toBe(false);
  });
});
