import type { Area } from "react-easy-crop";

export function cropToSquare(src: string, area: Area, size: number) {
  return loadImage(src).then((image) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is unavailable");
    }
    context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error("Could not encode the image"));
        },
        "image/webp",
        0.9,
      );
    });
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read the image"));
    image.src = src;
  });
}
