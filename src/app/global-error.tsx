"use client"

// Last-resort fallback if the root layout itself fails. Plain HTML only: no app providers are available here.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f2ee", color: "#1b1017", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: 12, color: "#756670" }}>Please try again. If it keeps happening, contact support@northfoundry.co.</p>
          <button onClick={reset} style={{ marginTop: 20, background: "#ff5018", color: "#fff", border: 0, borderRadius: 12, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  )
}
