import type { Metadata } from "next";
import { TierListEditor } from "@/components/tier-list-editor";
import { demoTierList } from "@/lib/tier-list-seed";

export const metadata: Metadata = {
  title: "Try the editor",
  description: "Build a tier list in the Polychkova editor.",
};

export default function DemoEditPage() {
  return <TierListEditor initialState={demoTierList} />;
}
