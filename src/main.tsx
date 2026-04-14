import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Overlay from "./pages/Overlay";
import "./index.css";

document.addEventListener("contextmenu", e => e.preventDefault());

/* ── Error boundary pour afficher les crashs plutôt qu'une page blanche ── */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: "fixed", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12,
          background: "#fff", fontFamily: "monospace", padding: 32,
        }}>
          <div style={{ fontSize: 28 }}>💥</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>Erreur React</div>
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
            padding: "12px 16px", fontSize: 12, color: "#dc2626", maxWidth: 600,
            wordBreak: "break-all", whiteSpace: "pre-wrap",
          }}>
            {this.state.error.message}
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            Ouvre les DevTools (Ctrl+Shift+I) pour plus de détails
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const isOverlay = window.location.hash === "#overlay";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isOverlay ? <Overlay /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
);
