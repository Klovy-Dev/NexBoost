import { useEffect, useState } from "react";
import { AlertTriangle, Search, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { TweakStatus, TweakResult, ProcessInfo } from "../types";
import { TWEAKS, TWEAK_GROUPS, PROFILES } from "../lib/constants";
import Toggle from "../components/Toggle";

interface Props {
  tweakStates:       Record<string, boolean>;
  tweakLoading:      Record<string, boolean>;
  activeCount:       number;
  handleToggleTweak: (id: string) => void;
  setTweakStates:    React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

type InnerTab = "tweaks" | "processes";

/* ── Style onglets internes ── */
const innerTabStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: active ? 600 : 500,
  color: active ? "#38bdf8" : "#4b5563",
  background: "transparent",
  border: "none",
  borderRadius: 0,
  outline: "none",
  cursor: "pointer",
  borderBottom: `2px solid ${active ? "#38bdf8" : "transparent"}`,
  marginBottom: "-1px",
  transition: "color 0.15s",
});

export default function PerformanceTab({
  tweakStates, tweakLoading, activeCount, handleToggleTweak, setTweakStates,
}: Props) {
  const [inner,          setInner]          = useState<InnerTab>("tweaks");
  const [profileLoading, setProfileLoading] = useState(false);
  const [processes,      setProcesses]      = useState<ProcessInfo[]>([]);
  const [search,         setSearch]         = useState("");

  useEffect(() => {
    invoke<TweakStatus[]>("get_tweaks_status")
      .then(statuses => {
        const s: Record<string, boolean> = {};
        statuses.forEach(st => { s[st.id] = st.active; });
        setTweakStates(s);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (inner !== "processes") return;
    const fetch = () =>
      invoke<ProcessInfo[]>("get_processes").then(setProcesses).catch(() => {});
    fetch();
    const iv = setInterval(fetch, 2000);
    return () => clearInterval(iv);
  }, [inner]);

  const handleApplyProfile = async (tweakIds: string[]) => {
    setProfileLoading(true);
    for (const tw of TWEAKS) {
      const should = tweakIds.includes(tw.id);
      const is     = tweakStates[tw.id] ?? false;
      if (should === is) continue;
      try {
        const r = await invoke<TweakResult>(should ? "apply_tweak" : "revert_tweak", { id: tw.id });
        if (r.success) setTweakStates(p => ({ ...p, [tw.id]: should }));
      } catch {}
    }
    setProfileLoading(false);
  };

  const filtered = processes.filter(
    p => search === "" || p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }} className="animate-fadeIn">

      {/* ── En-tête de page ── */}
      <div style={{ padding: "20px 22px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.2, margin: 0 }}>
              Optimisations
            </h1>
            <p style={{ fontSize: 11, color: "#4b5563", marginTop: 5, marginBottom: 0 }}>
              Tweaks système Windows · Entièrement réversibles
            </p>
          </div>

          {/* Compteur tweaks actifs */}
          <div style={{
            background: "#0c0c1a", border: "1px solid rgba(56,189,248,0.2)",
            borderRadius: 10, padding: "10px 16px",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 4, flexShrink: 0,
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4b5563" }}>
              ACTIVES
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", color: "#38bdf8", lineHeight: 1 }}>
                {activeCount}
              </span>
              <span style={{ fontSize: 12, color: "#4b5563" }}>/{TWEAKS.length}</span>
            </div>
            <div style={{ width: 72, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(activeCount / TWEAKS.length) * 100}%`, background: "#38bdf8", borderRadius: 2, transition: "width 0.5s" }} />
            </div>
          </div>
        </div>

        {/* Onglets internes */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setInner("tweaks")} style={innerTabStyle(inner === "tweaks")}>
            Optimisations
            {activeCount > 0 && (
              <span style={{
                marginLeft: 7, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 99,
                background: "rgba(56,189,248,0.15)", color: "#38bdf8",
              }}>
                {activeCount}
              </span>
            )}
          </button>
          <button onClick={() => setInner("processes")} style={innerTabStyle(inner === "processes")}>
            Processus
          </button>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: "16px 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ═══ TWEAKS ═══ */}
          {inner === "tweaks" && (
            <>
              {/* Profils rapides */}
              <div style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{
                  padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4b5563" }}>
                    PROFILS RAPIDES
                  </span>
                  {profileLoading && (
                    <div className="animate-spin" style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(56,189,248,0.15)", borderTopColor: "#38bdf8" }} />
                  )}
                </div>
                <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  {PROFILES.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleApplyProfile(p.tweaks)}
                      disabled={profileLoading}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
                        padding: "12px", borderRadius: 8, cursor: profileLoading ? "not-allowed" : "pointer",
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                        opacity: profileLoading ? 0.5 : 1, transition: "all 0.15s", textAlign: "left",
                      }}
                      onMouseEnter={e => { if (!profileLoading) { e.currentTarget.style.background = "rgba(56,189,248,0.06)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.2)"; }}}
                      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: p.color, fontSize: 10, fontWeight: 700, color: "#fff",
                      }}>
                        {p.label.charAt(0)}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#f1f5f9" }}>{p.label}</span>
                      <span style={{ fontSize: 9, color: "#4b5563", lineHeight: 1.4 }}>{p.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Groupes de tweaks */}
              {TWEAK_GROUPS.map(group => {
                const groupTweaks    = TWEAKS.filter(t => t.group === group.id);
                const activeInGroup  = groupTweaks.filter(t => tweakStates[t.id]).length;

                return (
                  <div key={group.id} style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: group.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4b5563" }}>
                        {group.label}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: "#4b5563" }}>
                        {activeInGroup}/{groupTweaks.length}
                      </span>
                    </div>

                    {groupTweaks.map((tw, i) => {
                      const active  = tweakStates[tw.id] ?? false;
                      const loading = tweakLoading[tw.id];
                      return (
                        <div
                          key={tw.id}
                          onClick={() => !loading && handleToggleTweak(tw.id)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "12px 16px", transition: "background 0.12s",
                            borderBottom: i < groupTweaks.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                            background: active ? "rgba(56,189,248,0.06)" : "transparent",
                            cursor: loading ? "wait" : "pointer",
                            opacity: loading ? 0.7 : 1,
                          }}
                          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = active ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.03)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = active ? "rgba(56,189,248,0.06)" : "transparent"; }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              background: active ? `${tw.color}14` : "rgba(255,255,255,0.05)",
                              color: active ? tw.color : "#4b5563",
                            }}>
                              {tw.icon}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <span style={{ fontSize: 13, fontWeight: 500, color: active ? "#f1f5f9" : "#94a3b8" }}>
                                  {tw.label}
                                </span>
                                {tw.requiresAdmin && (
                                  <span style={{
                                    fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4,
                                    background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
                                    color: "#fbbf24",
                                  }}>
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p style={{
                                fontSize: 11, color: "#4b5563", marginTop: 2,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 440,
                              }}>
                                {tw.desc}
                              </p>
                            </div>
                          </div>
                          <div style={{ flexShrink: 0, marginLeft: 16 }}>
                            {loading
                              ? <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(56,189,248,0.15)", borderTopColor: "#38bdf8" }} />
                              : <Toggle on={active} color={tw.color} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Avertissement */}
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 16px", borderRadius: 8,
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
              }}>
                <AlertTriangle size={12} style={{ color: "#fbbf24", marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: "#fbbf24", lineHeight: 1.6, margin: 0 }}>
                  Ces optimisations modifient des paramètres Windows réels via PowerShell. Elles sont entièrement réversibles.
                  Les tweaks marqués <strong>Admin</strong> nécessitent des droits administrateur.
                </p>
              </div>
            </>
          )}

          {/* ═══ PROCESSUS ═══ */}
          {inner === "processes" && (
            <>
              {/* Barre de recherche */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
                  <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#4b5563", pointerEvents: "none" }} />
                  <input
                    type="text"
                    className="input-base"
                    style={{ paddingLeft: 34, paddingRight: 34, paddingTop: 8, paddingBottom: 8, fontSize: 12 }}
                    placeholder="Filtrer les processus..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#4b5563", cursor: "pointer", padding: 2 }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                <span style={{ fontSize: 11, color: "#4b5563" }}>{filtered.length} processus</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 600, color: "#4ade80" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80" }} className="animate-pulse" />
                  LIVE
                </div>
              </div>

              {/* Table processus */}
              <div style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 56px 130px 100px",
                  padding: "10px 16px", background: "rgba(255,255,255,0.04)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}>
                  {["Processus", "PID", "CPU", "RAM"].map((h, i) => (
                    <span key={h} style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: "#4b5563",
                      textAlign: i > 0 ? "right" : "left",
                    }}>
                      {h}
                    </span>
                  ))}
                </div>

                <div style={{ overflow: "hidden" }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "#4b5563" }}>
                      {processes.length === 0 ? "Chargement des processus..." : "Aucun résultat"}
                    </div>
                  ) : (
                    filtered.slice(0, 50).map(p => (
                      <div
                        key={p.pid}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr 56px 130px 100px",
                          alignItems: "center", padding: "10px 16px",
                          borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.1s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 5, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 700,
                            background: p.cpu > 15 ? "rgba(248,113,113,0.12)" : "rgba(56,189,248,0.12)",
                            color: p.cpu > 15 ? "#f87171" : "#38bdf8",
                          }}>
                            {p.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 12, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.name}>
                            {p.name}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#4b5563", textAlign: "right" }}>
                          {p.pid}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          <div style={{ width: 60, height: 3, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
                            <div style={{
                              height: "100%", borderRadius: 2, transition: "width 0.5s",
                              width: `${Math.min(p.cpu, 100)}%`,
                              background: p.cpu > 50 ? "#ef4444" : p.cpu > 20 ? "#f97316" : "#38bdf8",
                            }} />
                          </div>
                          <span style={{
                            fontSize: 11, fontFamily: "monospace", fontWeight: 600,
                            minWidth: 40, textAlign: "right",
                            color: p.cpu > 50 ? "#ef4444" : p.cpu > 20 ? "#f97316" : "#64748b",
                          }}>
                            {p.cpu.toFixed(1)}%
                          </span>
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#64748b", textAlign: "right" }}>
                          {p.memory_mb >= 1024 ? `${(p.memory_mb / 1024).toFixed(1)} GB` : `${p.memory_mb.toFixed(0)} MB`}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <p style={{ fontSize: 10, color: "#4b5563", margin: 0 }}>
                Affiche les 50 processus triés par charge CPU · Actualisation toutes les 2s
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
