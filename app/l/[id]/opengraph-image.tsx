import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { getSharedList } from "@/lib/shared-list";

export const alt = "Tier list preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
  const list = await getSharedList((await params).id);
  if (!list) {
    notFound();
  }

  const description = (list.description || "A live tier list.").slice(0, 140);
  const tiers = list.board.tiers.slice(0, 6);
  const itemCount = Object.keys(list.board.itemsById).length;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f6f3ea",
        color: "#1c1a24",
        padding: 64,
      }}
    >
      <div style={{ display: "flex", fontSize: 24, letterSpacing: 4 }}>POLYCHKOVA</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 84, lineHeight: 1, letterSpacing: -2 }}>
          {list.title.slice(0, 48)}
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "#3d3a4a" }}>
          {description}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex" }}>
          {tiers.map((tier) => (
            <div
              key={tier.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                marginRight: 12,
                background: tier.color,
                color: "#14121a",
                fontSize: 32,
              }}
            >
              {tier.label.slice(0, 2)}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 28 }}>{itemCount} items</div>
      </div>
    </div>,
    { ...size },
  );
}
