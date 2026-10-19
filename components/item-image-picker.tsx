"use client";

import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { cropToSquare } from "./crop-square";

const LABEL = "grid gap-1 font-body text-xs font-bold uppercase tracking-wide text-muted";

export function ItemImagePicker({
  listId,
  onImage,
}: {
  listId: string;
  onImage: (imageUrl: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const pixels = useRef<Area | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (source) {
        URL.revokeObjectURL(source);
      }
    };
  }, [source]);

  function chooseFile(file: File | undefined) {
    pixels.current = null;
    setError("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSource((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function useCrop() {
    const area = pixels.current;
    if (!source || !area || busy) {
      return;
    }
    setBusy(true);
    setError("");
    void cropToSquare(source, area, 512)
      .then(async (blob) => {
        const body = new FormData();
        body.set("file", new File([blob], "image.webp", { type: blob.type }));
        const response = await fetch(`/api/lists/${listId}/images`, { method: "POST", body });
        const payload: unknown = await response.json().catch(() => null);
        const imageUrl =
          payload &&
          typeof payload === "object" &&
          "imageUrl" in payload &&
          typeof payload.imageUrl === "string"
            ? payload.imageUrl
            : null;
        if (!response.ok || !imageUrl) {
          const message =
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Could not upload the image.";
          setError(message);
          return;
        }
        onImage(imageUrl);
        chooseFile(undefined);
      })
      .catch(() => {
        setError("Could not prepare the image.");
      })
      .finally(() => {
        setBusy(false);
      });
  }

  return (
    <div className="grid gap-2">
      <div className={LABEL}>
        Upload
        <input
          ref={pickerRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="font-body text-sm font-normal normal-case tracking-normal"
          onChange={(event) => chooseFile(event.currentTarget.files?.[0])}
        />
      </div>
      {source ? (
        <>
          <div className="relative h-48 border border-line bg-ink">
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              rotation={0}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, areaPixels) => {
                pixels.current = areaPixels;
              }}
            />
          </div>
          <label className={LABEL}>
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.currentTarget.value))}
              className="block w-full accent-accent"
            />
          </label>
          <button
            type="button"
            className="h-10 border-4 border-line bg-accent px-3 font-body text-sm font-bold text-accent-ink shadow-[4px_4px_0_var(--line)]"
            onClick={useCrop}
            disabled={busy}
          >
            {busy ? "Uploading…" : "Use image"}
          </button>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="font-body text-xs text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
