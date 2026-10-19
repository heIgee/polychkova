"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { forkList, publishList } from "@/app/lists/actions";
import type { ListVisibility } from "@/lib/list-board";
import { type Item, TIER_COLORS, type TierListState } from "@/lib/tier-list";

const BOARD_FRAME = "border-4 border-line bg-panel shadow-[8px_8px_0_var(--line)]";
const ROW_RULE = "border-b border-line last:border-b-0";
const BTN_PRESS =
  "transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_var(--line)] active:translate-x-1 active:translate-y-1 active:shadow-none";
const BTN_PRIMARY = `inline-flex h-10 items-center justify-center border-4 border-line bg-accent px-3 font-body text-sm font-bold text-accent-ink shadow-[4px_4px_0_var(--line)] ${BTN_PRESS}`;
const BTN_SECONDARY = `inline-flex h-10 items-center justify-center border border-line bg-panel px-3 font-body text-sm font-bold shadow-[4px_4px_0_var(--line)] ${BTN_PRESS}`;
const SELECTION_MARK =
  "pointer-events-none absolute inset-0 z-20 border-2 border-ink shadow-[inset_0_0_0_2px_var(--paper)]";

function placeholderColor(title: string) {
  let hash = 0;
  for (const char of title) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return TIER_COLORS[Math.abs(hash) % TIER_COLORS.length];
}

function attribution(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "igdb.com" || host.endsWith(".igdb.com")) {
      return "IGDB";
    }
    return host;
  } catch {
    return "Source";
  }
}

function ItemTile({
  item,
  selected,
  onSelect,
}: {
  item: Item;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const [broken, setBroken] = useState(false);
  const hasImage = item.imageUrl.trim() !== "";

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${item.title}. Show details.`}
      className={`relative size-20 shrink-0 overflow-hidden border border-line bg-paper p-0 text-left text-ink ${
        selected ? "z-10" : ""
      }`}
      onClick={() => onSelect(item.id)}
    >
      {!hasImage || broken ? (
        <span
          className="absolute inset-0 flex items-center justify-center p-1 text-center font-display text-lg text-accent-ink"
          style={{ backgroundColor: placeholderColor(item.title) }}
        >
          {broken ? (
            <span className="font-body text-xs font-normal text-muted">Unavailable</span>
          ) : (
            item.title.slice(0, 2).toUpperCase()
          )}
        </span>
      ) : (
        <Image
          src={item.imageUrl}
          alt=""
          fill
          unoptimized
          sizes="80px"
          className="object-cover"
          onError={() => setBroken(true)}
        />
      )}
      <span className="absolute inset-x-0 bottom-0 block truncate border-t border-line bg-panel px-1 py-0.5 font-body text-xs font-bold leading-none">
        {item.title}
      </span>
      {selected ? <span className={SELECTION_MARK} aria-hidden="true" /> : null}
    </button>
  );
}

function CopyLinkButton({ listId }: { listId: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={BTN_SECONDARY}
      onClick={() => {
        const url = new URL(`/l/${listId}`, window.location.origin).toString();
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
        });
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export function SharedTierList({
  listId,
  state,
  visibility,
  signedIn,
  isOwner,
}: {
  listId: string;
  state: TierListState;
  visibility: ListVisibility;
  signedIn: boolean;
  isOwner: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? state.itemsById[selectedId] : undefined;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-8 sm:py-10">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div className="max-w-2xl">
            <a
              href="/"
              className="font-body text-xs font-bold uppercase tracking-[0.2em] text-muted underline-offset-4 hover:underline"
            >
              ← Polychkova
            </a>
            <h1 className="mt-3 max-w-2xl break-words font-display text-4xl leading-none tracking-[-0.04em] sm:text-5xl">
              {state.title}
            </h1>
            {state.description ? (
              <p className="mt-3 max-w-xl font-body text-base leading-7 text-muted">
                {state.description}
              </p>
            ) : null}
            <p className="mt-3 font-body text-xs font-bold uppercase tracking-wide text-muted">
              {visibility === "public" ? "Public" : "Unlisted"} · Read only
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CopyLinkButton listId={listId} />
            {isOwner ? (
              <>
                {visibility === "unlisted" ? (
                  <form action={publishList}>
                    <input type="hidden" name="listId" value={listId} />
                    <button type="submit" className={BTN_PRIMARY}>
                      Show on Discover
                    </button>
                  </form>
                ) : (
                  <p className="font-body text-sm font-bold">On Discover</p>
                )}
                <a
                  href={`/lists/${listId}`}
                  className="font-body text-sm font-bold underline-offset-4 hover:underline"
                >
                  Edit
                </a>
              </>
            ) : signedIn ? (
              <form action={forkList}>
                <input type="hidden" name="listId" value={listId} />
                <button type="submit" className={BTN_PRIMARY}>
                  Fork
                </button>
              </form>
            ) : (
              <a
                href={`/sign-in?next=${encodeURIComponent(`/l/${listId}`)}`}
                className={BTN_PRIMARY}
              >
                Sign in to fork
              </a>
            )}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <section aria-labelledby="board-title" className="min-w-0">
            <h2 id="board-title" className="sr-only">
              Tier list
            </h2>
            <div className={BOARD_FRAME}>
              <ol>
                {state.tiers.length === 0 ? (
                  <li className="flex min-h-20 items-center px-2 font-body text-sm text-muted">
                    No tiers.
                  </li>
                ) : (
                  state.tiers.map((tier) => (
                    <li
                      key={tier.id}
                      className={`grid grid-cols-[3.25rem_minmax(0,1fr)] items-stretch ${ROW_RULE}`}
                    >
                      <div
                        className="flex min-h-20 items-center justify-center text-accent-ink"
                        style={{ backgroundColor: tier.color }}
                      >
                        <span className="font-display text-2xl leading-none">{tier.label}</span>
                      </div>
                      <div className="flex min-h-20 flex-wrap content-start bg-paper">
                        {tier.itemIds.map((itemId) => {
                          const item = state.itemsById[itemId];
                          if (!item) {
                            return null;
                          }
                          return (
                            <ItemTile
                              key={item.id}
                              item={item}
                              selected={selectedId === item.id}
                              onSelect={setSelectedId}
                            />
                          );
                        })}
                      </div>
                    </li>
                  ))
                )}
              </ol>
              <div className="border-t border-line">
                <div className="flex items-baseline justify-between gap-2 border-b border-line px-2 py-1">
                  <h3 className="font-display text-lg leading-none">Unranked</h3>
                  <span className="font-body text-[11px] text-muted">
                    {state.unrankedItemIds.length} items
                  </span>
                </div>
                <div className="flex min-h-20 flex-wrap bg-paper">
                  {state.unrankedItemIds.map((itemId) => {
                    const item = state.itemsById[itemId];
                    if (!item) {
                      return null;
                    }
                    return (
                      <ItemTile
                        key={item.id}
                        item={item}
                        selected={selectedId === item.id}
                        onSelect={setSelectedId}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <aside className="grid content-start gap-4 border-4 border-line bg-panel p-5 shadow-[6px_6px_0_var(--line)]">
            <h2 className="font-display text-xl leading-none">
              {selected ? selected.title : "Item"}
            </h2>
            {selected ? (
              <ItemDetail item={selected} />
            ) : (
              <p className="font-body text-sm leading-6 text-muted">
                Select an item to see its image, description, and source.
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function ItemDetail({ item }: { item: Item }) {
  const [broken, setBroken] = useState(false);
  const hasImage = item.imageUrl.trim() !== "";

  return (
    <div className="grid gap-4">
      <div className="relative size-40 overflow-hidden border border-line bg-paper">
        {!hasImage || broken ? (
          <div
            className="absolute inset-0 flex items-center justify-center p-2 text-center font-display text-3xl text-accent-ink"
            style={{ backgroundColor: placeholderColor(item.title) }}
          >
            {broken ? (
              <span className="font-body text-sm font-normal text-muted">Unavailable</span>
            ) : (
              item.title.slice(0, 2).toUpperCase()
            )}
          </div>
        ) : (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            unoptimized
            sizes="160px"
            className="object-cover"
            onError={() => setBroken(true)}
          />
        )}
      </div>
      {item.description ? (
        <p className="whitespace-pre-wrap break-words font-body text-sm leading-6">
          {item.description}
        </p>
      ) : (
        <p className="font-body text-sm text-muted">No description.</p>
      )}
      {item.sourceUrl ? (
        <p className="font-body text-sm">
          Source:{" "}
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="font-bold underline-offset-4 hover:underline"
          >
            {attribution(item.sourceUrl)}
          </a>
        </p>
      ) : (
        <p className="font-body text-sm text-muted">No source.</p>
      )}
    </div>
  );
}
