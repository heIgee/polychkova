import { afterEach, describe, expect, it } from "vitest";
import { readEnv, requireEnv } from "./env";

describe("readEnv", () => {
  const original = process.env.TEST_VALUE;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.TEST_VALUE;
      return;
    }
    process.env.TEST_VALUE = original;
  });

  it("returns trimmed values", () => {
    process.env.TEST_VALUE = " value ";
    expect(readEnv("TEST_VALUE")).toBe("value");
  });

  it("treats empty strings as undefined", () => {
    process.env.TEST_VALUE = "   ";
    expect(readEnv("TEST_VALUE")).toBeUndefined();
  });
});

describe("requireEnv", () => {
  it("returns value when set", () => {
    expect(requireEnv("secret", "TEST_VALUE")).toBe("secret");
  });

  it("throws when missing", () => {
    expect(() => requireEnv(undefined, "TEST_VALUE")).toThrow("TEST_VALUE is not configured");
  });
});
