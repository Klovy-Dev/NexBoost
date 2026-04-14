import { useRef, useEffect } from "react";
import { Minus, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

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
      className="h-8 flex items-center justify-between shrink-0 select-none"
      style={{ background: "#07070d", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "default" }}
    >
      <div className="w-20" data-tauri-drag-region />
      <span
        data-tauri-drag-region
        className="text-[10px] font-bold tracking-[0.18em] font-orbitron"
        style={{ color: "#38bdf8" }}
      >
        NEXBOOST
      </span>
      <div className="w-20 flex justify-end pr-2 gap-0.5">
        <button
          onClick={handleMinimize}
          className="w-6 h-6 flex items-center justify-center rounded transition-colors"
          style={{ color: "#94a3b8" }}
          onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#475569"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
        >
          <Minus size={12} />
        </button>
        <button
          onClick={handleClose}
          className="w-6 h-6 flex items-center justify-center rounded transition-colors"
          style={{ color: "#94a3b8" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,0.08)"; e.currentTarget.style.color = "#ef4444"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
