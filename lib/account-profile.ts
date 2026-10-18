const MAX_NAME_LENGTH = 32;
const MAX_AVATAR_BYTES = 512 * 1024;

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
  if (file.bytes.byteLength > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Icon must be 512 KB or smaller." };
  }
  const type = avatarType(file.bytes);
  if (!type) {
    return { ok: false, error: "Icon must be a PNG, JPEG, GIF, or WebP." };
  }
  return { ok: true, name: trimmed, avatar: { type, bytes: file.bytes } };
}

function avatarType(bytes: Uint8Array) {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) {
    return "image/png";
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    return "image/gif";
  }
  if (
    bytes.byteLength >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}
