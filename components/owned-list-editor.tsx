"use client";

import { useEffect, useRef, useState } from "react";
import { saveList } from "@/app/lists/actions";
import type { ListVisibility } from "@/lib/list-board";
import type { TierListState } from "@/lib/tier-list";
import { TierListEditor } from "./tier-list-editor";

const DEBOUNCE_MS = 600;

type SaveKind = "saving" | "saved" | "error";

export function OwnedListEditor({
  listId,
  initialState,
  initialVisibility,
  gameSearch,
}: {
  listId: string;
  initialState: TierListState;
  initialVisibility: ListVisibility;
  gameSearch: boolean;
}) {
  const [visibility, setVisibility] = useState(initialVisibility);
  const [status, setStatus] = useState<SaveKind>("saved");
  const [error, setError] = useState("");
  const stateRef = useRef(initialState);
  const visibilityRef = useRef(initialVisibility);
  const timerRef = useRef<number | null>(null);
  const inflightRef = useRef(false);
  const pendingRef = useRef(false);
  const seqRef = useRef(0);
  const latestRef = useRef(0);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  async function flush() {
    const seq = ++seqRef.current;
    latestRef.current = seq;
    inflightRef.current = true;
    const payload = { state: stateRef.current, visibility: visibilityRef.current };
    setStatus("saving");
    let result: { ok: true } | { ok: false; error: string };
    try {
      result = await saveList(listId, payload);
    } catch {
      result = { ok: false, error: "Could not save." };
    }
    inflightRef.current = false;
    if (pendingRef.current) {
      pendingRef.current = false;
      void flush();
      return;
    }
    if (seq !== latestRef.current) {
      return;
    }
    if (!result.ok) {
      setStatus("error");
      setError(result.error);
      return;
    }
    setError("");
    setStatus("saved");
  }
  flushRef.current = flush;

  useEffect(() => {
    return () => {
      if (timerRef.current === null) {
        return;
      }
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      void flushRef.current();
    };
  }, []);

  function enqueue() {
    if (inflightRef.current) {
      pendingRef.current = true;
      return;
    }
    void flush();
  }

  function schedule() {
    if (inflightRef.current) {
      pendingRef.current = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      enqueue();
    }, DEBOUNCE_MS);
  }

  function retry() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    enqueue();
  }

  return (
    <TierListEditor
      initialState={initialState}
      onChange={(state) => {
        stateRef.current = state;
        schedule();
      }}
      visibilitySlot={{
        visibility,
        onVisibilityChange: (next) => {
          visibilityRef.current = next;
          setVisibility(next);
          schedule();
        },
      }}
      saveStatus={{ kind: status, message: error }}
      onRetrySave={status === "error" ? retry : undefined}
      listId={listId}
      gameSearch={gameSearch}
    />
  );
}
