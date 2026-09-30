"use client";

// Atlas's last-resort error boundary. Without this, an uncaught error
// anywhere in the root layout or its providers (CloudSyncProvider,
// ProgressionProvider, FocusProvider, ... - see app/(app)/layout.tsx) kills
// client hydration silently: the server-rendered HTML is OnboardingGate's
// "Loading Atlas..." shell, so a crash during hydration leaves that shell
// frozen on screen forever with no error, no recovery, and nothing in the
// UI to explain it. That exact failure mode was reported in production
// ("Atlas stuck on Loading Atlas...") and is impossible to diagnose without
// opening DevTools.
//
// A Next.js App Router global-error boundary is the only thing that catches
// a root-layout/provider crash (a segment `error.tsx` only catches its
// CHILDREN, never its own layout), so this must live here, at app/ root,
// and must render its own <html>/<body>.
//
// This never suppresses a real bug - it surfaces it, in place of a
// permanently frozen loading screen.
export default function GlobalError({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#020617", color: "#e2e8f0", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div style={{ maxWidth: "36rem", width: "100%", border: "1px solid #1e293b", borderRadius: "1rem", backgroundColor: "rgba(2,6,23,0.7)", padding: "1.75rem" }}>
            <p style={{ margin: 0, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a78bfa" }}>Atlas</p>
            <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>Atlas hit an unexpected error while starting.</h1>
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", lineHeight: 1.6, color: "#94a3b8" }}>
              Your data is stored locally and has not been touched. Reloading usually clears this - if it keeps happening, the message below is the useful part to report.
            </p>

            <pre
              style={{
                margin: "1.25rem 0 0",
                padding: "0.85rem",
                borderRadius: "0.75rem",
                border: "1px solid #1e293b",
                backgroundColor: "#020617",
                color: "#fca5a5",
                fontSize: "0.75rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "12rem",
                overflowY: "auto",
              }}
            >
              {error.message || "Unknown error"}
              {error.digest ? `\n\ndigest: ${error.digest}` : ""}
            </pre>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{ borderRadius: "0.75rem", border: "1px solid rgba(167,139,250,0.5)", backgroundColor: "rgba(168,85,247,0.15)", color: "#ede9fe", padding: "0.6rem 1.1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ borderRadius: "0.75rem", border: "1px solid #334155", backgroundColor: "transparent", color: "#cbd5e1", padding: "0.6rem 1.1rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              >
                Reload Atlas
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
