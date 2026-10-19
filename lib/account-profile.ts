import { imageMediaType, MAX_IMAGE_BYTES } from "./image-bytes";

const MAX_NAME_LENGTH = 32;

export type AvatarUpload = {
  bytes: Uint8Array;
};

export type ProfileUpdate =
  | { ok: true; name: string; avatar: { type: string; bytes: Uint8Array } | null }
  | { ok: false; error: string };

export function parseProfileUpdate(name: string, file: AvatarUpload | null): ProfileUpdate {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name is required." };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: "Name must be 32 characters or fewer." };
  }
  if (!file) {
    return { ok: true, name: trimmed, avatar: null };
  }
  if (file.bytes.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Icon must be 512 KB or smaller." };
  }
  const type = imageMediaType(file.bytes);
  if (!type) {
    return { ok: false, error: "Icon must be a PNG, JPEG, GIF, or WebP." };
  }
  return { ok: true, name: trimmed, avatar: { type, bytes: file.bytes } };
}
