import { readEnv } from "./env";

export function siteOrigin() {
  const configured = readEnv("AUTH_URL");
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url;
      }
    } catch {
      // Fall through to the local default.
    }
  }
  return new URL("http://localhost:3100");
}

export function safeNextPath(value: unknown, fallback = "/account") {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    return fallback;
  }
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://") ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return fallback;
  }
  return value;
}

export function titleSearch(raw: string | undefined) {
  const query = (raw ?? "").trim().slice(0, 80);
  return query.length > 0 ? query : null;
}

export function titleLikePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
