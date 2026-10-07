import { ImageResponse } from "next/og"

export const alt = "WebflowX: chat, docs, tasks and meetings in one workspace"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #2a1420 0%, #381d2a 60%, #402633 100%)",
          color: "#f7f2ee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#ff5018",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            X
          </div>
          <div style={{ marginLeft: 20, fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>North Foundry</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 148, fontWeight: 800, letterSpacing: -5, lineHeight: 1 }}>
            <span>Webflow</span>
            <span style={{ color: "#ff5018" }}>X</span>
          </div>
          <div style={{ marginTop: 28, fontSize: 48, lineHeight: 1.2, color: "#f7f2ee", opacity: 0.9, maxWidth: 940 }}>
            Chat, docs, tasks and meetings in one workspace
          </div>
        </div>

        <div style={{ display: "flex", height: 8, width: 220, borderRadius: 4, background: "#ff5018" }} />
      </div>
    ),
    { ...size }
  )
}
