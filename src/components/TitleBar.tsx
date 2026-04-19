import { useRef, useEffect } from "react";
import { Minus, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import pcpulseLogo from "../assets/pcpulse-logo.svg";

export default function TitleBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const win = getCurrentWindow();
    const el  = barRef.current;
    if (!el) return;

    const DRAG_PX     = 5;
    const DBLCLICK_MS = 300;
    let isDragPending = false;
    let startX = 0, startY = 0;
    let lastClickTime = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest("button")) return;
      const now = Date.now();
      if (now - lastClickTime < DBLCLICK_MS) {
        lastClickTime = 0; isDragPending = false;
        win.isMaximized().then(m => m ? win.unmaximize() : win.maximize()).catch(() => {});
        return;
      }
      lastClickTime = now; isDragPending = true;
      startX = e.screenX; startY = e.screenY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragPending || e.buttons !== 1) { isDragPending = false; return; }
      if (Math.abs(e.screenX - startX) > DRAG_PX || Math.abs(e.screenY - startY) > DRAG_PX) {
        isDragPending = false;
        win.startDragging().catch(() => {});
      }
    };

    const onMouseUp = () => { isDragPending = false; };

    el.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup",   onMouseUp);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup",   onMouseUp);
    };
  }, []);

  const win = getCurrentWindow();
  const handleMinimize = () => win.minimize().catch(() => {});
  const handleClose    = () => win.close().catch(() => {});

  return (
    <div
      ref={barRef}
      data-tauri-drag-region
      style={{
        height: 32, display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0, background: "rgba(8,8,15,0.98)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        cursor: "default", position: "relative", zIndex: 10,
      }}
    >
      <div style={{ width: 80 }} data-tauri-drag-region />

      <div data-tauri-drag-region style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <img
          src={pcpulseLogo}
          alt="PCPulse"
          style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            filter: "brightness(1.4) drop-shadow(0 0 5px rgba(66,165,245,0.7))",
          }}
        />
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
          fontFamily: "'Orbitron', sans-serif", color: "rgba(248,250,252,0.55)",
        }}>
          PCPULSE
        </span>
      </div>

      <div style={{ width: 80, display: "flex", justifyContent: "flex-end", paddingRight: 6, gap: 2 }}>
        <button
          onClick={handleMinimize}
          style={{
            width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 6, background: "transparent", border: "none", color: "#475569", cursor: "pointer",
            transition: "all 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#94a3b8"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
        >
          <Minus size={11} />
        </button>
        <button
          onClick={handleClose}
          style={{
            width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 6, background: "transparent", border: "none", color: "#475569", cursor: "pointer",
            transition: "all 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}
