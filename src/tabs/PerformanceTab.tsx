import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { TweakStatus, TweakResult } from "../types";
import { TWEAKS, TWEAK_GROUPS, PROFILES } from "../lib/constants";
import Toggle from "../components/Toggle";

interface Props {
  tweakStates:       Record<string, boolean>;
  tweakLoading:      Record<string, boolean>;
  activeCount:       number;
  handleToggleTweak: (id: string) => void;
  setTweakStates:    React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export default function PerformanceTab({
  tweakStates, tweakLoading, activeCount, handleToggleTweak, setTweakStates,
}: Props) {
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    invoke<TweakStatus[]>("get_tweaks_status")
      .then(statuses => {
        const s: Record<string, boolean> = {};
        statuses.forEach(st => { s[st.id] = st.active; });
        setTweakStates(s);
      })
      .catch(() => {});
  }, []);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }} className="animate-fadeIn">

      {/* ── En-tête de page ── */}
      <div style={{ padding: "20px 22px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
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
      </div>

      {/* ── Contenu ── */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

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
            const groupTweaks   = TWEAKS.filter(t => t.group === group.id);
            const activeInGroup = groupTweaks.filter(t => tweakStates[t.id]).length;

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
        </div>
      </div>
    </div>
  );
}
