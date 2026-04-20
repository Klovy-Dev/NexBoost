import { useState, useEffect } from "react";
import { Wifi, TrendingUp, TrendingDown, Activity, Server, RefreshCw, CheckCircle, LayoutList } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { NetworkStats } from "../types";
import { fmtBytes, fmtSpeed } from "../lib/utils";
import AreaChart from "../components/AreaChart";

type NetInnerTab = "interfaces" | "dns";

const DNS_OPTIONS = [
  { id: "fast",   label: "Cloudflare",   servers: "1.1.1.1 + 1.0.0.1",  desc: "Ultra-rapide, privacy-first",  color: "#f97316", tweakId: "dns_fast" },
  { id: "google", label: "Google",       servers: "8.8.8.8 + 8.8.4.4",  desc: "Stable et mondial",            color: "#3b82f6", tweakId: "dns_fast" },
  { id: "isp",    label: "FAI (défaut)", servers: "Auto / DHCP",         desc: "Restaurer les DNS d'origine",  color: "#9ca3af", tweakId: null },
];

interface Props {
  ping:        number;
  pingHistory: number[];
}

export default function NetworkTab({ ping, pingHistory }: Props) {
  const [netStats,   setNetStats]   = useState<NetworkStats[]>([]);
  const [innerTab,   setInnerTab]   = useState<NetInnerTab>("interfaces");
  const [dnsActive,  setDnsActive]  = useState<string | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);
  const [dnsResult,  setDnsResult]  = useState<string | null>(null);

  const applyDns = async (opt: typeof DNS_OPTIONS[0]) => {
    setDnsLoading(true); setDnsResult(null);
    try {
      if (opt.id === "isp") {
        await invoke("revert_tweak", { id: "dns_fast" });
      } else {
        await invoke("apply_tweak", { id: "dns_fast" });
      }
      try { await invoke("flush_dns"); } catch {}
      setDnsActive(opt.id);
      setDnsResult(`DNS ${opt.label} appliqué ✓`);
    } catch {
      setDnsResult("Erreur — droits administrateur requis");
    }
    setDnsLoading(false);
    setTimeout(() => setDnsResult(null), 4000);
  };

  useEffect(() => {
    const fetch = () => {
      if (document.hidden) return;
      invoke<NetworkStats[]>("get_network_stats").then(setNetStats).catch(() => setNetStats([]));
    };
    fetch();
    const iv = setInterval(fetch, 4000);
    return () => clearInterval(iv);
  }, []);

  const pingColor = ping <= 0 ? "#4b5563" : ping < 20 ? "#4ade80" : ping < 60 ? "#fbbf24" : "#f87171";
  const pingLabel = ping <= 0 ? "—" : ping < 20 ? "Excellente" : ping < 60 ? "Correcte" : "Élevée";
  const pingVals  = pingHistory.filter(v => v > 0);
  const pingMin   = pingVals.reduce((a, b) => Math.min(a, b), 9999);
  const pingMax   = pingHistory.reduce((a, b) => Math.max(a, b), 0);
  const pingAvg   = pingVals.length ? Math.round(pingVals.reduce((a, b) => a + b, 0) / pingVals.length) : 0;

  const TABS: { id: NetInnerTab; label: string; icon: React.ReactNode }[] = [
    { id: "interfaces", label: "Interfaces réseau", icon: <LayoutList size={14} /> },
    { id: "dns",        label: "DNS Optimizer",     icon: <Server size={14} /> },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "28px 32px" }} className="animate-fadeIn">

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wifi size={20} style={{ color: "#10b981" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Réseau</h1>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "3px 0 0" }}>Latence & débit en temps réel</p>
          </div>
        </div>

        {/* Ping live badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: `${pingColor}12`, border: `1px solid ${pingColor}30` }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: pingColor, boxShadow: `0 0 6px ${pingColor}` }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: pingColor, fontFamily: "monospace" }}>
              {ping > 0 ? `${ping} ms` : "— ms"}
            </span>
            <span style={{ fontSize: 12, color: pingColor }}>{pingLabel}</span>
          </div>
        </div>
      </div>

      {/* ── Stats ping ── */}
      {pingMax > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr) 2fr", gap: 12, marginBottom: 24 }}>
          {[
            { label: "MIN", value: pingMin === 9999 ? "—" : `${pingMin} ms`, color: "#4ade80" },
            { label: "MOY", value: pingAvg > 0 ? `${pingAvg} ms` : "—",     color: "#fbbf24" },
            { label: "MAX", value: pingMax > 0 ? `${pingMax} ms` : "—",     color: "#f87171" },
          ].map(s => (
            <div key={s.label} style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
            </div>
          ))}
          {/* Graphique ping */}
          <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Activity size={13} style={{ color: pingColor }} />
              <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ping en direct</span>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#10b981" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 5px #10b981" }} />
                Live
              </div>
            </div>
            <AreaChart data={pingHistory} color={pingColor} max={200} height={38} />
          </div>
        </div>
      )}

      {/* ── Onglets ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }}>
        {TABS.map(tab => {
          const active = innerTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setInnerTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? "#fff" : "#6b7280",
                borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
                marginBottom: -1, transition: "color 0.15s",
              }}
            >
              <span style={{ color: active ? "#3b82f6" : "#6b7280" }}>{tab.icon}</span>
              {tab.label}
              {tab.id === "dns" && dnsActive && dnsActive !== "isp" && (
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 5px #10b981" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Interfaces ── */}
      {innerTab === "interfaces" && (
        <div className="animate-fadeIn">
          {netStats.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 20px", background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
              <Wifi size={28} style={{ color: "#374151" }} />
              <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Chargement des interfaces...</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {netStats.map(iface => {
                const active    = iface.send_kbs > 0.5 || iface.recv_kbs > 0.5;
                const maxKbs    = Math.max(iface.send_kbs, iface.recv_kbs, 1);
                const shortName = iface.name.length > 22 ? iface.name.slice(0, 20) + "…" : iface.name;

                return (
                  <div key={iface.name} style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: active ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)", color: active ? "#10b981" : "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${active ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                          <Wifi size={14} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={iface.name}>
                          {shortName}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: active ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)", color: active ? "#10b981" : "#6b7280", display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: active ? "#10b981" : "#6b7280", boxShadow: active ? "0 0 4px #10b981" : "none" }} />
                        {active ? "Actif" : "Inactif"}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                      {[
                        { icon: <TrendingDown size={11} />, label: "↓ Réception", kbs: iface.recv_kbs, color: "#10b981" },
                        { icon: <TrendingUp   size={11} />, label: "↑ Envoi",     kbs: iface.send_kbs, color: "#38bdf8" },
                      ].map(d => (
                        <div key={d.label}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: d.color }}>{d.icon} {d.label}</div>
                            <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: d.color }}>{fmtSpeed(d.kbs)}</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 2, transition: "width 0.7s", width: `${Math.min((d.kbs / maxKbs) * 100, 100)}%`, background: d.color }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
                      <div>
                        <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 3px" }}>Reçu total</p>
                        <p style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: "#9ca3af", margin: 0 }}>{fmtBytes(iface.bytes_recv)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 3px" }}>Envoyé total</p>
                        <p style={{ fontSize: 12, fontWeight: 600, fontFamily: "monospace", color: "#9ca3af", margin: 0 }}>{fmtBytes(iface.bytes_sent)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DNS Optimizer ── */}
      {innerTab === "dns" && (
        <div className="animate-fadeIn">
          {/* Info banner */}
          <div style={{ padding: "12px 16px", marginBottom: 16, borderRadius: 10, background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)", fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
            Le DNS traduit les noms de domaine en adresses IP. Un DNS rapide réduit le temps de connexion aux serveurs de jeux et améliore la navigation.
          </div>

          {dnsActive && dnsActive !== "isp" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 16, borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}>
              <CheckCircle size={13} style={{ color: "#10b981" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#10b981" }}>DNS {DNS_OPTIONS.find(d => d.id === dnsActive)?.label} actif</span>
            </div>
          )}

          {dnsResult && (
            <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 10, fontSize: 13, fontWeight: 600, background: dnsResult.includes("Erreur") ? "rgba(248,113,113,0.06)" : "rgba(74,222,128,0.06)", border: `1px solid ${dnsResult.includes("Erreur") ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.18)"}`, color: dnsResult.includes("Erreur") ? "#f87171" : "#4ade80" }} className="animate-fadeIn">
              {dnsResult}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {DNS_OPTIONS.map(opt => {
              const isActive = dnsActive === opt.id;
              return (
                <div key={opt.id} style={{ background: isActive ? `${opt.color}08` : "#161616", border: `1px solid ${isActive ? opt.color + "30" : "rgba(255,255,255,0.06)"}`, borderRadius: 12, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${opt.color}12`, border: `1px solid ${opt.color}22` }}>
                        <Server size={16} style={{ color: opt.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: isActive ? "#fff" : "#d1d5db" }}>{opt.label}</div>
                        <div style={{ fontSize: 12, fontFamily: "monospace", color: opt.color, marginTop: 2 }}>{opt.servers}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{opt.desc}</div>
                      </div>
                    </div>
                    <button
                      disabled={dnsLoading || isActive}
                      onClick={() => applyDns(opt)}
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, flexShrink: 0, cursor: dnsLoading || isActive ? "not-allowed" : "pointer", opacity: isActive ? 1 : dnsLoading ? 0.5 : 1, background: isActive ? `${opt.color}12` : "rgba(255,255,255,0.05)", border: `1px solid ${isActive ? opt.color + "35" : "rgba(255,255,255,0.08)"}`, color: isActive ? opt.color : "#9ca3af", transition: "all 0.15s" }}
                      onMouseEnter={e => { if (!dnsLoading && !isActive) { e.currentTarget.style.background = `${opt.color}10`; e.currentTarget.style.color = opt.color; }}}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#9ca3af"; }}}
                    >
                      {dnsLoading && !isActive
                        ? <div className="animate-spin" style={{ width: 13, height: 13, borderRadius: "50%", border: `2px solid ${opt.color}25`, borderTopColor: opt.color }} />
                        : isActive
                          ? <><CheckCircle size={13} /> Actif</>
                          : "Appliquer"
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={async () => { try { await invoke("flush_dns"); setDnsResult("Cache DNS vidé ✓"); setTimeout(() => setDnsResult(null), 3000); } catch {} }}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.18)", color: "#06b6d4", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(6,182,212,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(6,182,212,0.06)"; }}
          >
            <RefreshCw size={14} /> Vider le cache DNS
          </button>

          <p style={{ fontSize: 12, color: "#4b5563", marginTop: 12, lineHeight: 1.6 }}>
            ⚠️ Droits administrateur requis pour modifier les DNS. Le cache DNS est vidé automatiquement après application.
          </p>
        </div>
      )}
    </div>
  );
}
