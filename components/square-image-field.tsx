"use client";

import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { cropToSquare } from "./crop-square";

const fieldLabel = "font-body text-xs font-bold uppercase tracking-[0.2em] text-muted";

const chooseButton =
  "inline-flex h-12 items-center justify-center border-4 border-line bg-panel px-5 font-body text-sm font-bold text-ink shadow-[6px_6px_0_var(--line)] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-[4px_4px_0_var(--line)]";

export function SquareImageField({
  name,
  outputSize = 512,
}: {
  name: string;
  outputSize?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const pixels = useRef<Area | null>(null);
  const prepared = useRef(false);
  const busy = useRef(false);
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    if (!form || !source) {
      return;
    }

    const onSubmit = (event: SubmitEvent) => {
      if (prepared.current) {
        return;
      }
      event.preventDefault();
      const area = pixels.current;
      if (busy.current || !area) {
        return;
      }
      busy.current = true;
      setError(null);
      void cropToSquare(source, area, outputSize)
        .then((blob) => {
          const file = new File([blob], "image.webp", { type: blob.type });
          const transfer = new DataTransfer();
          transfer.items.add(file);
          if (inputRef.current) {
            inputRef.current.files = transfer.files;
          }
          prepared.current = true;
          form.requestSubmit();
        })
        .catch(() => {
          busy.current = false;
          setError("Could not prepare the image.");
        });
    };

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [source, outputSize]);

  useEffect(() => {
    return () => {
      if (source) {
        URL.revokeObjectURL(source);
      }
    };
  }, [source]);

  function chooseFile(file: File | undefined) {
    prepared.current = false;
    busy.current = false;
    pixels.current = null;
    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setSource((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return file ? URL.createObjectURL(file) : null;
    });
  }

  return (
    <div className="grid gap-2">
      <div className="grid gap-2">
        <p className={fieldLabel}>Icon</p>
        <input
          ref={pickerRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => chooseFile(event.currentTarget.files?.[0])}
        />
        <button type="button" className={chooseButton} onClick={() => pickerRef.current?.click()}>
          Choose file
        </button>
      </div>
      <input ref={inputRef} name={name} type="file" className="hidden" tabIndex={-1} />
      {source ? (
        <>
          <div className="relative h-72 border-4 border-line bg-ink">
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
          <label className={fieldLabel}>
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.currentTarget.value))}
              className="mt-2 block w-full accent-accent"
            />
          </label>
        </>
      ) : null}
      {error ? <p className="font-body text-sm font-bold text-ink">{error}</p> : null}
    </div>
  );
}
