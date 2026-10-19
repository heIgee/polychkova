"use client";

import { deleteList } from "./actions";

export function DeleteListButton({ listId }: { listId: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center justify-center border-4 border-line bg-panel px-3 font-body text-sm font-bold text-ink shadow-[4px_4px_0_var(--line)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_var(--line)]"
      onClick={() => {
        if (window.confirm("Delete this list?")) {
          void deleteList(listId);
        }
      }}
    >
      Delete
    </button>
  );
}
