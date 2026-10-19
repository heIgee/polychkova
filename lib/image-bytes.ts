export const MAX_IMAGE_BYTES = 512 * 1024;

export function imageMediaType(bytes: Uint8Array) {
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

export function parseImageUpload(
  bytes: Uint8Array,
): { ok: true; type: string } | { ok: false; error: string } {
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image must be 512 KB or smaller." };
  }
  const type = imageMediaType(bytes);
  if (!type) {
    return { ok: false, error: "Image must be a PNG, JPEG, GIF, or WebP." };
  }
  return { ok: true, type };
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}
