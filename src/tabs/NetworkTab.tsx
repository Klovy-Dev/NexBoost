import { useState, useEffect } from "react";
import { Wifi, TrendingUp, TrendingDown } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { NetworkStats } from "../types";
import { fmtBytes, fmtSpeed } from "../lib/utils";
import AreaChart from "../components/AreaChart";

interface Props {
  ping:        number;
  pingHistory: number[];
}

export default function NetworkTab({ ping, pingHistory }: Props) {
  const [netStats, setNetStats] = useState<NetworkStats[]>([]);

  useEffect(() => {
    const fetch = () => {
      if (document.hidden) return;
      invoke<NetworkStats[]>("get_network_stats")
        .then(setNetStats)
        .catch(() => setNetStats([]));
    };
    fetch();
    const iv = setInterval(fetch, 4000);
    return () => clearInterval(iv);
  }, []);

  const pingColor = ping <= 0 ? "#4b5563" : ping < 20 ? "#4ade80" : ping < 60 ? "#fbbf24" : "#f87171";
  const pingLabel = ping <= 0 ? "—" : ping < 20 ? "Excellente" : ping < 60 ? "Correcte" : "Élevée";
  const pingMin   = pingHistory.filter(v => v > 0).reduce((a, b) => Math.min(a, b), 9999);
  const pingMax   = pingHistory.reduce((a, b) => Math.max(a, b), 0);
  const pingAvg   = (() => {
    const vals = pingHistory.filter(v => v > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  })();

  return (
    <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }} className="animate-fadeIn">

      {/* ── En-tête de page ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.2, margin: 0 }}>
            Réseau
          </h1>
          <p style={{ fontSize: 11, color: "#4b5563", marginTop: 5, marginBottom: 0 }}>
            Latence et débit en temps réel
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 10, color: "#4ade80" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
            Actualisation toutes les 2s · Ping toutes les 5s
          </div>
        </div>

        {/* Carte ping */}
        <div style={{
          background: "#0c0c1a", border: `1px solid ${pingColor}22`,
          borderRadius: 10, padding: "12px 18px",
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 5, flexShrink: 0, minWidth: 110,
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4b5563" }}>
            LATENCE
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 30, fontWeight: 800, fontFamily: "monospace", color: pingColor, lineHeight: 1 }}>
              {ping > 0 ? ping : "—"}
            </span>
            {ping > 0 && <span style={{ fontSize: 12, color: "#4b5563" }}>ms</span>}
          </div>
          <span style={{ fontSize: 9, fontWeight: 600, color: pingColor }}>{pingLabel}</span>
        </div>
      </div>

      {/* ── Graphique ping ── */}
      <div style={{
        background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10, padding: "16px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, flexShrink: 0,
              background: `${pingColor}12`, color: pingColor,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Wifi size={18} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4b5563" }}>
                LATENCE RÉSEAU
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", color: pingColor, lineHeight: 1 }}>
                  {ping > 0 ? ping : "—"}
                </span>
                {ping > 0 && <span style={{ fontSize: 14, color: "#4b5563" }}>ms</span>}
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                  background: `${pingColor}15`, border: `1px solid ${pingColor}30`, color: pingColor,
                }}>
                  {pingLabel}
                </span>
              </div>
            </div>
          </div>

          {pingMax > 0 && (
            <div style={{ display: "flex", gap: 18, flexShrink: 0 }}>
              {[
                { label: "Min", value: pingMin === 9999 ? "—" : `${pingMin}` },
                { label: "Moy", value: pingAvg > 0 ? `${pingAvg}` : "—" },
                { label: "Max", value: pingMax > 0 ? `${pingMax}` : "—" },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#cbd5e1" }}>
                    {s.value}{s.value !== "—" ? " ms" : ""}
                  </div>
                  <div style={{ fontSize: 9, color: "#4b5563", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
          <AreaChart data={pingHistory} color={pingColor} max={200} height={56} />
        </div>
      </div>

      {/* ── Interfaces réseau ── */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4b5563", marginBottom: 10 }}>
          INTERFACES RÉSEAU
        </div>

        {netStats.length === 0 ? (
          <div style={{
            background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
            padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <Wifi size={28} style={{ color: "rgba(255,255,255,0.1)" }} />
            <p style={{ fontSize: 13, color: "#4b5563" }}>Chargement des interfaces réseau...</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {netStats.map(iface => {
              const active    = iface.send_kbs > 0.5 || iface.recv_kbs > 0.5;
              const maxKbs    = Math.max(iface.send_kbs, iface.recv_kbs, 1);
              const shortName = iface.name.length > 24 ? iface.name.slice(0, 22) + "…" : iface.name;
              const netColor  = "#10b981";

              return (
                <div key={iface.name} style={{
                  background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10, padding: "16px 18px",
                }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                        background: `${netColor}12`, color: netColor,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Wifi size={14} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={iface.name}>
                        {shortName}
                      </span>
                    </div>
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                      background: active ? "#22c55e" : "rgba(255,255,255,0.1)",
                      boxShadow: active ? "0 0 6px #22c55e" : "none",
                    }} title={active ? "Actif" : "Inactif"} />
                  </div>

                  {/* Débit */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                    {[
                      { icon: <TrendingDown size={11} />, label: "Réception", kbs: iface.recv_kbs, color: netColor },
                      { icon: <TrendingUp   size={11} />, label: "Envoi",     kbs: iface.send_kbs, color: "#38bdf8" },
                    ].map(d => (
                      <div key={d.label}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: d.color }}>
                            {d.icon} {d.label}
                          </div>
                          <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: d.color }}>
                            {fmtSpeed(d.kbs)}
                          </span>
                        </div>
                        <div style={{ height: 4, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
                          <div style={{
                            height: "100%", borderRadius: 2, transition: "width 0.7s ease",
                            width: `${Math.min((d.kbs / maxKbs) * 100, 100)}%`, background: d.color,
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totaux */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                    borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12,
                  }}>
                    <div>
                      <p style={{ fontSize: 9, color: "#4b5563", marginBottom: 3 }}>Total reçu</p>
                      <p style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", color: "#94a3b8" }}>
                        {fmtBytes(iface.bytes_recv)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 9, color: "#4b5563", marginBottom: 3 }}>Total envoyé</p>
                      <p style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", color: "#94a3b8" }}>
                        {fmtBytes(iface.bytes_sent)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
