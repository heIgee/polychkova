import type { TierListState } from "./tier-list";

export const demoTierList = {
  title: "A few words to rank",
  description: "A neutral set of words to try the editor before accounts and persistence arrive.",
  tiers: [
    {
      id: "tier-s",
      label: "S",
      color: "#ef4444",
      itemIds: ["alpha", "beta"],
    },
    {
      id: "tier-a",
      label: "A",
      color: "#f97316",
      itemIds: ["gamma"],
    },
    {
      id: "tier-b",
      label: "B",
      color: "#eab308",
      itemIds: ["delta"],
    },
  ],
  itemsById: {
    alpha: {
      id: "alpha",
      title: "Alpha",
      imageUrl: "https://placehold.co/512x512/111827/f9fafb?text=ALPHA",
    },
    beta: {
      id: "beta",
      title: "Beta",
      imageUrl: "https://placehold.co/512x512/1e3a8a/f9fafb?text=BETA",
    },
    gamma: {
      id: "gamma",
      title: "Gamma",
      imageUrl: "https://placehold.co/512x512/075985/f9fafb?text=GAMMA",
    },
    delta: {
      id: "delta",
      title: "Delta",
      imageUrl: "https://placehold.co/512x512/166534/f9fafb?text=DELTA",
    },
    epsilon: {
      id: "epsilon",
      title: "Epsilon",
      imageUrl: "https://placehold.co/512x512/854d0e/f9fafb?text=EPSILON",
    },
    zeta: {
      id: "zeta",
      title: "Zeta",
      imageUrl: "https://placehold.co/512x512/9f1239/f9fafb?text=ZETA",
    },
  },
  unrankedItemIds: ["epsilon", "zeta"],
} satisfies TierListState;
