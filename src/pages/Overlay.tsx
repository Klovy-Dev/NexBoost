import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X, GripHorizontal } from "lucide-react";
import type { SystemStats, GpuStats, NetworkStats } from "../types";

export default function Overlay() {
  const [stats, setStats]   = useState<SystemStats | null>(null);
  const [gpu,   setGpu]     = useState<GpuStats | null>(null);
  const [net,   setNet]     = useState<NetworkStats | null>(null);
  const [ping,  setPing]    = useState(0);

  useEffect(() => {
    const poll = () => {
      invoke<SystemStats>("get_system_stats").then(setStats).catch(() => {});
      invoke<GpuStats>("get_gpu_stats").then(setGpu).catch(() => {});
      invoke<NetworkStats[]>("get_network_stats")
        .then(list => { if (list.length) setNet(list[0]); })
        .catch(() => {});
    };
    const pingPoll = () =>
      invoke<number>("ping_host").then(setPing).catch(() => {});

    poll(); pingPoll();
    const iv1 = setInterval(poll, 2000);
    const iv2 = setInterval(pingPoll, 5000);
    return () => { clearInterval(iv1); clearInterval(iv2); };
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    getCurrentWindow().close().catch(console.error);
  };
  const handleDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    getCurrentWindow().startDragging().catch(() => {});
  };

  /* Couleurs dynamiques */
  const cpuColor  = !stats ? "#4b5563" : stats.cpu  > 85 ? "#ef4444" : stats.cpu  > 65 ? "#f97316" : "#38bdf8";
  const ramColor  = !stats ? "#4b5563" : stats.ram  > 85 ? "#ef4444" : stats.ram  > 65 ? "#f97316" : "#818cf8";
  const tempColor = !stats ? "#4b5563" : stats.temp > 85 ? "#ef4444" : stats.temp > 70 ? "#f97316" : "#4ade80";
  const gpuColor  = !gpu   ? "#4b5563" : gpu.usage  > 95 ? "#ef4444" : "#34d399";
  const pingColor = ping <= 0 ? "#4b5563" : ping < 20 ? "#4ade80" : ping < 60 ? "#fbbf24" : "#f87171";

  const fmtSpeed = (kbs: number) => {
    if (kbs >= 1024) return `${(kbs / 1024).toFixed(1)} MB/s`;
    return `${kbs.toFixed(0)} KB/s`;
  };

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: "rgba(7, 7, 13, 0.92)",
      backdropFilter: "blur(16px)",
      border: "1px solid rgba(59,130,246,0.15)",
      borderRadius: 0,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      fontFamily: "Inter, system-ui, sans-serif",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    }}>

      {/* Drag handle */}
      <div
        onMouseDown={handleDrag}
        style={{
          padding: "5px 8px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(14, 14, 24, 0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          cursor: "grab", userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <GripHorizontal size={10} style={{ color: "#94a3b8" }} />
          <span style={{
            color: "#38bdf8", fontWeight: 700, fontSize: 9,
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            PCPulse
          </span>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: "none", border: "none", color: "#94a3b8",
            cursor: "pointer", padding: 2, display: "flex", lineHeight: 1,
            borderRadius: 3,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
        >
          <X size={11} />
        </button>
      </div>

      {/* Stats rows */}
      <div style={{ flex: 1, padding: "7px 10px", display: "flex", flexDirection: "column", gap: 5 }}>

        {/* CPU + Temp */}
        <StatRow
          label="CPU"
          value={stats ? `${stats.cpu.toFixed(0)}%` : "—"}
          sub={stats && stats.temp > 0 ? `${stats.temp.toFixed(0)}°C` : undefined}
          pct={stats ? stats.cpu : 0}
          color={cpuColor}
          subColor={tempColor}
        />

        {/* RAM */}
        <StatRow
          label="RAM"
          value={stats ? `${stats.ram.toFixed(0)}%` : "—"}
          pct={stats ? stats.ram : 0}
          color={ramColor}
        />

        {/* GPU + VRAM */}
        <StatRow
          label="GPU"
          value={gpu ? `${gpu.usage.toFixed(0)}%` : "—"}
          sub={gpu && gpu.temp > 0 ? `${gpu.temp.toFixed(0)}°C` : undefined}
          pct={gpu ? gpu.usage : 0}
          color={gpuColor}
          subColor={tempColor}
        />

        {/* Network */}
        {net && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: "#10b981", minWidth: 26, letterSpacing: "0.02em" }}>
              NET
            </span>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 8, color: "#4b5563" }}>▼ {fmtSpeed(net.recv_kbs)}</span>
                <span style={{ fontSize: 8, color: "#4b5563" }}>▲ {fmtSpeed(net.send_kbs)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Ping */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 600, color: pingColor, minWidth: 26, letterSpacing: "0.02em" }}>
            PING
          </span>
          <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", borderRadius: 2 }}>
            <div style={{
              height: "100%",
              width: `${Math.min((ping / 200) * 100, 100)}%`,
              background: pingColor,
              transition: "width 0.7s ease",
            }} />
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, fontFamily: "monospace",
            color: pingColor, minWidth: 32, textAlign: "right",
          }}>
            {ping > 0 ? `${ping}ms` : "—"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: "3px 10px",
        display: "flex", alignItems: "center", gap: 4,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
        <span style={{ color: "#4b5563", fontSize: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Live
        </span>
      </div>
    </div>
  );
}

/* ── Composant ligne stat ── */
function StatRow({
  label, value, sub, pct, color, subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  pct: number;
  color: string;
  subColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 9, fontWeight: 600, color, minWidth: 26, letterSpacing: "0.02em" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", borderRadius: 2 }}>
        <div style={{
          height: "100%", width: `${Math.min(pct, 100)}%`,
          background: color,
          transition: "width 0.7s ease",
        }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: sub ? 64 : 32 }}>
        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color, textAlign: "right", minWidth: 28 }}>
          {value}
        </span>
        {sub && (
          <span style={{ fontSize: 9, color: subColor ?? "#94a3b8", fontFamily: "monospace" }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
