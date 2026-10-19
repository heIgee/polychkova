import { readEnv, requireEnv } from "./env";
import { isValidImageUrl, MAX_ITEM_TEXT } from "./tier-list";

export type CatalogHit = {
  title: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
};

const MAX_QUERY = 80;

let cachedToken: { value: string; expiresAt: number } | undefined;

export function igdbConfigured() {
  return Boolean(readEnv("IGDB_CLIENT_ID") && readEnv("IGDB_CLIENT_SECRET"));
}

export function igdbSearchBody(query: string) {
  const cleaned = query
    .replace(/[\r\n"\\]/g, " ")
    .trim()
    .slice(0, MAX_QUERY);
  return `search "${cleaned}"; fields name,summary,url,cover.image_id; where cover != null & version_parent = null; limit 8;`;
}

export function parseIgdbGames(payload: unknown): CatalogHit[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const hits: CatalogHit[] = [];
  for (const entry of payload) {
    if (!isRecord(entry) || typeof entry.name !== "string") {
      continue;
    }
    const title = entry.name.trim().slice(0, 200);
    const imageId = coverImageId(entry.cover);
    if (!title || !imageId) {
      continue;
    }
    const summary = typeof entry.summary === "string" ? entry.summary.trim() : "";
    const sourceUrl = typeof entry.url === "string" ? entry.url.trim() : "";
    hits.push({
      title,
      description: summary.slice(0, MAX_ITEM_TEXT),
      imageUrl: `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`,
      sourceUrl: isValidImageUrl(sourceUrl) ? sourceUrl : "",
    });
  }
  return hits;
}

export async function searchIgdbGames(query: string, fetcher: typeof fetch = fetch) {
  const token = await igdbToken(fetcher);
  const clientId = requireEnv(readEnv("IGDB_CLIENT_ID"), "IGDB_CLIENT_ID");
  const response = await fetcher("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: igdbSearchBody(query),
  });
  if (!response.ok) {
    throw new Error("IGDB search failed");
  }
  return parseIgdbGames(await response.json());
}

async function igdbToken(fetcher: typeof fetch) {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    client_id: requireEnv(readEnv("IGDB_CLIENT_ID"), "IGDB_CLIENT_ID"),
    client_secret: requireEnv(readEnv("IGDB_CLIENT_SECRET"), "IGDB_CLIENT_SECRET"),
    grant_type: "client_credentials",
  });
  const response = await fetcher("https://id.twitch.tv/oauth2/token", { method: "POST", body });
  if (!response.ok) {
    throw new Error("IGDB auth failed");
  }
  const payload: unknown = await response.json();
  if (
    !isRecord(payload) ||
    typeof payload.access_token !== "string" ||
    typeof payload.expires_in !== "number"
  ) {
    throw new Error("IGDB auth failed");
  }
  cachedToken = {
    value: payload.access_token,
    expiresAt: now + payload.expires_in * 1000,
  };
  return payload.access_token;
}

function coverImageId(cover: unknown) {
  if (!isRecord(cover)) {
    return null;
  }
  if (typeof cover.image_id === "string" && /^[a-z0-9]+$/i.test(cover.image_id)) {
    return cover.image_id;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
