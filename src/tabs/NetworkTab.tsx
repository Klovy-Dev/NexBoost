import { useState, useEffect } from "react";
import { Wifi, TrendingUp, TrendingDown, Activity, Server, RefreshCw, CheckCircle, LayoutList } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { NetworkStats } from "../types";
import { fmtBytes, fmtSpeed } from "../lib/utils";
import AreaChart from "../components/AreaChart";

type NetInnerTab = "interfaces" | "dns";

const DNS_OPTIONS = [
  { id: "fast",    label: "Cloudflare",     servers: "1.1.1.1 + 1.0.0.1",  desc: "Ultra-rapide, privacy-first",  color: "#f97316", tweakId: "dns_fast" },
  { id: "google",  label: "Google",         servers: "8.8.8.8 + 8.8.4.4",  desc: "Stable et mondial",             color: "#3b82f6", tweakId: "dns_fast" },
  { id: "isp",     label: "FAI (défaut)",   servers: "Auto / DHCP",         desc: "Restaurer les DNS d'origine",  color: "#94a3b8", tweakId: null },
];

interface Props {
  ping:        number;
  pingHistory: number[];
}

export default function NetworkTab({ ping, pingHistory }: Props) {
  const [netStats,    setNetStats]    = useState<NetworkStats[]>([]);
  const [innerTab,    setInnerTab]    = useState<NetInnerTab>("interfaces");
  const [dnsActive,   setDnsActive]   = useState<string | null>(null);
  const [dnsLoading,  setDnsLoading]  = useState(false);
  const [dnsResult,   setDnsResult]   = useState<string | null>(null);

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
      invoke<NetworkStats[]>("get_network_stats")
        .then(setNetStats)
        .catch(() => setNetStats([]));
    };
    fetch();
    const iv = setInterval(fetch, 4000);
    return () => clearInterval(iv);
  }, []);

  const pingColor = ping <= 0 ? "#475569" : ping < 20 ? "#4ade80" : ping < 60 ? "#fbbf24" : "#f87171";
  const pingLabel = ping <= 0 ? "—" : ping < 20 ? "Excellente" : ping < 60 ? "Correcte" : "Élevée";
  const pingMin   = pingHistory.filter(v => v > 0).reduce((a, b) => Math.min(a, b), 9999);
  const pingMax   = pingHistory.reduce((a, b) => Math.max(a, b), 0);
  const pingAvg   = (() => {
    const vals = pingHistory.filter(v => v > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  })();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", height: "100%", overflow: "hidden" }} className="animate-fadeIn">

      {/* ═══ COLONNE GAUCHE : Ping ═══ */}
      <div style={{
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "rgba(0,0,0,0.15)",
      }}>
        <div style={{ padding: "20px 18px 16px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Wifi size={18} style={{ color: "#10b981" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", margin: 0 }}>Réseau</h2>
              <p style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>Latence & débit temps réel</p>
            </div>
          </div>

          {/* Big ping card */}
          <div style={{ background: "#0d0d1f", border: "1px solid rgba(16,185,129,0.18)", borderLeft: "3px solid #10b981", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151", marginBottom: 6 }}>LATENCE</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 40, fontWeight: 800, fontFamily: "monospace", color: pingColor, lineHeight: 1 }}>
                {ping > 0 ? ping : "—"}
              </span>
              {ping > 0 && <span style={{ fontSize: 14, color: "#374151" }}>ms</span>}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: pingColor }}>{pingLabel}</span>
          </div>
        </div>

        {/* Stats min/avg/max + chart */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 18px" }}>
          {pingMax > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <div style={{ width: 3, height: 12, borderRadius: 2, background: pingColor }} />
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#374151" }}>STATISTIQUES</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[
                  { label: "MIN",  value: pingMin === 9999 ? "—" : `${pingMin}`, color: "#4ade80" },
                  { label: "MOY",  value: pingAvg > 0 ? `${pingAvg}` : "—",     color: "#fbbf24" },
                  { label: "MAX",  value: pingMax > 0 ? `${pingMax}` : "—",     color: "#f87171" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${s.color}60`, borderRadius: 8, padding: "10px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: "#374151", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>ms {s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Graphique */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: pingColor }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#374151" }}>GRAPHIQUE</span>
          </div>
          <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${pingColor}60`, borderRadius: 10, padding: "14px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${pingColor}14`, color: pingColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={13} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>Ping en direct</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: pingColor, lineHeight: 1 }}>
                    {ping > 0 ? ping : "—"}
                  </span>
                  {ping > 0 && <span style={{ fontSize: 10, color: "#374151" }}>ms</span>}
                </div>
              </div>
            </div>
            <AreaChart data={pingHistory} color={pingColor} max={200} height={50} />
          </div>

          {/* Indicateur refresh */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 12, fontSize: 10, color: "#10b981" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 5px #10b981" }} />
            Actualisation toutes les 4s
          </div>

          {/* Navigation interne */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 18, marginBottom: 8 }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: "#10b981" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#374151" }}>OUTILS</span>
          </div>
          {([
            { id: "interfaces" as NetInnerTab, label: "Interfaces",    icon: <LayoutList size={13} /> },
            { id: "dns"        as NetInnerTab, label: "DNS Optimizer", icon: <Server size={13} /> },
          ]).map(tab => {
            const active = innerTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setInnerTab(tab.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 5, width: "100%", borderRadius: 9, cursor: "pointer", transition: "all 0.15s", textAlign: "left", background: active ? "rgba(16,185,129,0.08)" : "#0d0d1f", border: `1px solid ${active ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.07)"}`, borderLeft: `3px solid ${active ? "#10b981" : "rgba(255,255,255,0.1)"}`, transform: active ? "translateX(3px)" : "none" }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(16,185,129,0.04)"; e.currentTarget.style.transform = "translateX(3px)"; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "#0d0d1f"; e.currentTarget.style.transform = "none"; }}}
              >
                <div style={{ color: active ? "#10b981" : "#374151" }}>{tab.icon}</div>
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#e2e8f0" : "#94a3b8" }}>{tab.label}</span>
                {tab.id === "dns" && dnsActive && dnsActive !== "isp" && <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 5px #10b981" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ COLONNE DROITE ═══ */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px 20px" }}>

          {/* ── DNS Optimizer ── */}
          {innerTab === "dns" && (
            <div className="animate-fadeIn">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: "#10b981" }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>DNS OPTIMIZER</span>
              </div>

              <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(16,185,129,0.5)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#374151", marginBottom: 8 }}>Le DNS traduit les noms de domaine en adresses IP. Un DNS rapide réduit le temps de connexion aux serveurs de jeux.</div>
                {dnsActive && dnsActive !== "isp" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 7, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <CheckCircle size={11} style={{ color: "#10b981" }} />
                    <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>DNS {DNS_OPTIONS.find(d => d.id === dnsActive)?.label} actif</span>
                  </div>
                )}
              </div>

              {dnsResult && (
                <div style={{ padding: "9px 12px", borderRadius: 8, marginBottom: 12, fontSize: 11, fontWeight: 600, background: dnsResult.includes("Erreur") ? "rgba(248,113,113,0.08)" : "rgba(74,222,128,0.08)", border: `1px solid ${dnsResult.includes("Erreur") ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.2)"}`, color: dnsResult.includes("Erreur") ? "#f87171" : "#4ade80" }} className="animate-fadeIn">
                  {dnsResult}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {DNS_OPTIONS.map(opt => {
                  const isActive = dnsActive === opt.id;
                  return (
                    <div key={opt.id} style={{ background: isActive ? `${opt.color}08` : "#0d0d1f", border: `1px solid ${isActive ? opt.color + "35" : "rgba(255,255,255,0.07)"}`, borderLeft: `3px solid ${isActive ? opt.color : `${opt.color}40`}`, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${opt.color}15`, border: `1px solid ${opt.color}25` }}>
                            <Server size={15} style={{ color: opt.color }} />
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#f8fafc" : "#94a3b8" }}>{opt.label}</div>
                            <div style={{ fontSize: 10, fontFamily: "monospace", color: opt.color, marginTop: 1 }}>{opt.servers}</div>
                            <div style={{ fontSize: 10, color: "#374151", marginTop: 1 }}>{opt.desc}</div>
                          </div>
                        </div>
                        <button
                          disabled={dnsLoading || isActive}
                          onClick={() => applyDns(opt)}
                          style={{ padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, flexShrink: 0, transition: "all 0.15s", cursor: dnsLoading || isActive ? "not-allowed" : "pointer", opacity: isActive ? 1 : dnsLoading ? 0.5 : 1, background: isActive ? `${opt.color}15` : "rgba(255,255,255,0.04)", border: `1px solid ${isActive ? opt.color + "40" : "rgba(255,255,255,0.08)"}`, color: isActive ? opt.color : "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}
                          onMouseEnter={e => { if (!dnsLoading && !isActive) { e.currentTarget.style.background = `${opt.color}12`; e.currentTarget.style.color = opt.color; }}}
                          onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#94a3b8"; }}}
                        >
                          {dnsLoading && !isActive ? <div className="animate-spin" style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${opt.color}30`, borderTopColor: opt.color }} /> : isActive ? <><CheckCircle size={11} /> Actif</> : "Appliquer"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)" }}>
                <span style={{ fontSize: 10, color: "#4b5563", lineHeight: 1.6 }}>⚠️ Droits administrateur requis pour modifier les DNS. Le cache DNS est vidé automatiquement après application.</span>
              </div>

              <button
                onClick={async () => { try { await invoke("flush_dns"); setDnsResult("Cache DNS vidé ✓"); setTimeout(() => setDnsResult(null), 3000); } catch {} }}
                style={{ marginTop: 10, width: "100%", padding: "10px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(6,182,212,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(6,182,212,0.06)"; }}
              >
                <RefreshCw size={12} /> Vider le cache DNS
              </button>
            </div>
          )}

          {/* ── Interfaces ── */}
          {innerTab === "interfaces" && <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: "#10b981" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>INTERFACES RÉSEAU</span>
            {netStats.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>
                {netStats.length}
              </span>
            )}
          </div>

          {netStats.length === 0 ? (
            <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <Wifi size={28} style={{ color: "rgba(255,255,255,0.1)" }} />
              <p style={{ fontSize: 13, color: "#374151" }}>Chargement des interfaces...</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {netStats.map(iface => {
                const active    = iface.send_kbs > 0.5 || iface.recv_kbs > 0.5;
                const maxKbs    = Math.max(iface.send_kbs, iface.recv_kbs, 1);
                const shortName = iface.name.length > 22 ? iface.name.slice(0, 20) + "…" : iface.name;
                const borderColor = active ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.15)";

                return (
                  <div key={iface.name} style={{
                    background: "#0d0d1f",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderLeft: `3px solid ${borderColor}`,
                    borderRadius: 10, padding: "14px 16px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, background: active ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)", color: active ? "#10b981" : "#374151", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Wifi size={13} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={iface.name}>
                          {shortName}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 700, color: active ? "#10b981" : "#374151", padding: "2px 8px", borderRadius: 99, background: active ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)" }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: active ? "#10b981" : "#374151", boxShadow: active ? "0 0 5px #10b981" : "none" }} />
                        {active ? "Actif" : "Inactif"}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                      {[
                        { icon: <TrendingDown size={10} />, label: "↓ Réception", kbs: iface.recv_kbs, color: "#10b981" },
                        { icon: <TrendingUp   size={10} />, label: "↑ Envoi",     kbs: iface.send_kbs, color: "#38bdf8" },
                      ].map(d => (
                        <div key={d.label}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: d.color }}>{d.icon} {d.label}</div>
                            <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: d.color }}>{fmtSpeed(d.kbs)}</span>
                          </div>
                          <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 2, transition: "width 0.7s", width: `${Math.min((d.kbs / maxKbs) * 100, 100)}%`, background: d.color }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10 }}>
                      <div>
                        <p style={{ fontSize: 9, color: "#374151", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Reçu</p>
                        <p style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", color: "#94a3b8" }}>{fmtBytes(iface.bytes_recv)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: 9, color: "#374151", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>Envoyé</p>
                        <p style={{ fontSize: 11, fontWeight: 600, fontFamily: "monospace", color: "#94a3b8" }}>{fmtBytes(iface.bytes_sent)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </>}
        </div>
      </div>
    </div>
  );
}
