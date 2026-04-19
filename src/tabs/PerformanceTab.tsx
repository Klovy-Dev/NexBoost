import { useEffect, useState } from "react";
import { AlertTriangle, Zap, CheckCircle, ChevronRight, ArrowLeft, Gamepad2, Wifi, MousePointer2, RotateCcw } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { TweakStatus, TweakResult } from "../types";
import { TWEAKS, TWEAK_GROUPS, PROFILES } from "../lib/constants";
import Toggle from "../components/Toggle";

type WizardStep = 0 | 1 | 2 | 3;

const WIZARD_GOALS = [
  { id: "fps",     label: "FPS Gaming",     desc: "Maximiser les images/sec",      color: "#f59e0b", icon: <Gamepad2 size={20} />,     groups: ["fps", "gpu"] as string[] },
  { id: "latency", label: "Réseau & Ping",  desc: "Réduire la latence online",     color: "#10b981", icon: <Wifi size={20} />,          groups: ["latency", "network"] as string[] },
  { id: "input",   label: "Réactivité",     desc: "Souris et clavier parfaits",    color: "#8b5cf6", icon: <MousePointer2 size={20} />, groups: ["input"] as string[] },
  { id: "all",     label: "Tout optimiser", desc: "Appliquer les 35 tweaks",       color: "#ef4444", icon: <Zap size={20} />,           groups: ["fps","latency","network","input","gpu","services"] as string[] },
];

interface Props {
  tweakStates:       Record<string, boolean>;
  tweakLoading:      Record<string, boolean>;
  activeCount:       number;
  handleToggleTweak: (id: string) => void;
  setTweakStates:    React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export default function PerformanceTab({ tweakStates, tweakLoading, activeCount, handleToggleTweak, setTweakStates }: Props) {
  const [profileLoading, setProfileLoading] = useState(false);
  const [wizardStep,    setWizardStep]    = useState<WizardStep>(0);
  const [wizardGoals,   setWizardGoals]   = useState<string[]>([]);
  const [wizardProg,    setWizardProg]    = useState(0);
  const [wizardResults, setWizardResults] = useState<Array<{ id: string; label: string; color: string; success: boolean }>>([]);

  useEffect(() => {
    invoke<TweakStatus[]>("get_tweaks_status")
      .then(statuses => {
        const s: Record<string, boolean> = {};
        statuses.forEach(st => { s[st.id] = st.active; });
        setTweakStates(s);
      }).catch(() => {});
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

  const runWizard = async () => {
    setWizardStep(2);
    setWizardProg(0);
    const targetGroups = WIZARD_GOALS.filter(g => wizardGoals.includes(g.id)).flatMap(g => g.groups);
    const targetTweaks = TWEAKS.filter(t => targetGroups.includes(t.group) && !(tweakStates[t.id] ?? false));
    const results: Array<{ id: string; label: string; color: string; success: boolean }> = [];
    for (let i = 0; i < targetTweaks.length; i++) {
      const tw = targetTweaks[i];
      try {
        const r = await invoke<TweakResult>("apply_tweak", { id: tw.id });
        if (r.success) setTweakStates(p => ({ ...p, [tw.id]: true }));
        results.push({ id: tw.id, label: tw.label, color: tw.color, success: r.success });
      } catch {
        results.push({ id: tw.id, label: tw.label, color: tw.color, success: false });
      }
      setWizardProg(Math.round(((i + 1) / targetTweaks.length) * 100));
    }
    setWizardResults(results);
    setWizardStep(3);
  };

  const pct = Math.round((activeCount / TWEAKS.length) * 100);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", height: "100%", overflow: "hidden" }} className="animate-fadeIn">

      {/* ═══ COLONNE GAUCHE : Profils + Compteur ═══ */}
      <div style={{
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "rgba(0,0,0,0.15)",
      }}>
        {/* En-tête colonne */}
        <div style={{ padding: "20px 20px 16px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <Zap size={18} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", margin: 0 }}>Optimisations</h2>
              <p style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>Tweaks Windows réversibles</p>
            </div>
          </div>

          {/* Compteur */}
          <div style={{ background: "#0d0d1f", border: "1px solid rgba(245,158,11,0.18)", borderLeft: "3px solid #f59e0b", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151" }}>TWEAKS ACTIFS</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b" }}>{pct}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 36, fontWeight: 800, fontFamily: "monospace", color: "#f59e0b", lineHeight: 1 }}>{activeCount}</span>
              <span style={{ fontSize: 14, color: "#374151" }}>/{TWEAKS.length}</span>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#f59e0b,#ef4444)", borderRadius: 3, transition: "width 0.5s" }} />
            </div>
          </div>
        </div>

        {/* Profils rapides */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#374151" }}>PROFILS RAPIDES</span>
            {profileLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#f59e0b" }}>
                <div className="animate-spin" style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(245,158,11,0.15)", borderTopColor: "#f59e0b" }} />
                Application...
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PROFILES.map(p => (
              <button
                key={p.id}
                onClick={() => handleApplyProfile(p.tweaks)}
                disabled={profileLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 14px",
                  background: "#0d0d1f",
                  border: `1px solid rgba(255,255,255,0.07)`,
                  borderLeft: `3px solid ${p.color}`,
                  borderRadius: 10, cursor: profileLoading ? "not-allowed" : "pointer",
                  opacity: profileLoading ? 0.5 : 1, transition: "all 0.15s", textAlign: "left",
                }}
                onMouseEnter={e => { if (!profileLoading) { e.currentTarget.style.background = `${p.color}0a`; e.currentTarget.style.transform = "translateX(3px)"; }}}
                onMouseLeave={e => { e.currentTarget.style.background = "#0d0d1f"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: `${p.color}18`, color: p.color, fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                  {p.label.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{p.label}</span>
                  <span style={{ display: "block", fontSize: 10, color: "#374151", lineHeight: 1.4, marginTop: 2 }}>{p.desc}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: p.color }}>{p.tweaks.length}</span>
                  <ChevronRight size={11} style={{ color: p.color }} />
                </div>
              </button>
            ))}
          </div>

          {/* Quick Optimize */}
          <button
            onClick={() => { setWizardStep(1); setWizardGoals([]); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", marginTop: 12,
              width: "100%", borderRadius: 10, cursor: "pointer", transition: "all 0.15s", textAlign: "left",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderLeft: "3px solid #f59e0b",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.14)"; e.currentTarget.style.transform = "translateX(3px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.08)"; e.currentTarget.style.transform = "none"; }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,158,11,0.15)", flexShrink: 0 }}>
              <Zap size={15} style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>Quick Optimize</div>
              <div style={{ fontSize: 10, color: "#4b5563", marginTop: 1 }}>Assistant optimisation guidé</div>
            </div>
          </button>

          {/* Avertissement */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 14px", borderRadius: 10, background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)", marginTop: 12 }}>
            <AlertTriangle size={12} style={{ color: "#fbbf24", marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 10, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
              Tweaks via PowerShell · entièrement réversibles · <strong style={{ color: "#fbbf24" }}>Admin</strong> requis pour certains.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ COLONNE DROITE ═══ */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px 20px" }}>

          {/* ── Wizard Step 1 : Choix des objectifs ── */}
          {wizardStep === 1 && (
            <div className="animate-fadeIn">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <button onClick={() => setWizardStep(0)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "6px 10px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}><ArrowLeft size={12} /> Retour</button>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Quick Optimize</div>
                  <div style={{ fontSize: 10, color: "#374151" }}>Sélectionnez vos objectifs (plusieurs choix)</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                {WIZARD_GOALS.map(g => {
                  const sel = wizardGoals.includes(g.id);
                  return (
                    <button key={g.id} onClick={() => setWizardGoals(prev => sel ? prev.filter(x => x !== g.id) : [...prev.filter(x => x !== "all"), g.id === "all" ? "all" : g.id])}
                      style={{ padding: "18px 16px", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "all 0.15s", background: sel ? `${g.color}10` : "#0d0d1f", border: `1px solid ${sel ? g.color + "50" : "rgba(255,255,255,0.07)"}`, borderLeft: `3px solid ${sel ? g.color : "rgba(255,255,255,0.1)"}`, transform: sel ? "translateX(3px)" : "none" }}>
                      <div style={{ color: sel ? g.color : "#374151", marginBottom: 10 }}>{g.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: sel ? "#f8fafc" : "#94a3b8", marginBottom: 3 }}>{g.label}</div>
                      <div style={{ fontSize: 10, color: "#374151" }}>{g.desc}</div>
                      {sel && <div style={{ marginTop: 8, fontSize: 9, fontWeight: 700, color: g.color }}>✓ Sélectionné</div>}
                    </button>
                  );
                })}
              </div>
              <button
                disabled={wizardGoals.length === 0}
                onClick={runWizard}
                style={{ width: "100%", padding: "13px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s", cursor: wizardGoals.length === 0 ? "not-allowed" : "pointer", opacity: wizardGoals.length === 0 ? 0.4 : 1, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.35)", borderLeft: "3px solid #f59e0b", color: "#f59e0b" }}
                onMouseEnter={e => { if (wizardGoals.length > 0) e.currentTarget.style.filter = "brightness(1.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
              >
                <Zap size={15} /> Lancer l'optimisation
              </button>
            </div>
          )}

          {/* ── Wizard Step 2 : Processing ── */}
          {wizardStep === 2 && (
            <div className="animate-fadeIn" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <Zap size={28} style={{ color: "#f59e0b" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Optimisation en cours...</div>
                <div style={{ fontSize: 12, color: "#374151" }}>Application des tweaks sélectionnés</div>
              </div>
              <div style={{ width: "100%", maxWidth: 360 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: "#374151" }}>
                  <span>Progression</span>
                  <span style={{ color: "#f59e0b", fontWeight: 700, fontFamily: "monospace" }}>{wizardProg}%</span>
                </div>
                <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${wizardProg}%`, background: "linear-gradient(90deg,#f59e0b,#ef4444)", borderRadius: 4, transition: "width 0.4s" }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Wizard Step 3 : Résultats ── */}
          {wizardStep === 3 && (
            <div className="animate-fadeIn">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", flexShrink: 0 }}>
                  <CheckCircle size={18} style={{ color: "#4ade80" }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Optimisation terminée</div>
                  <div style={{ fontSize: 10, color: "#374151" }}>{wizardResults.filter(r => r.success).length}/{wizardResults.length} tweaks appliqués avec succès</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexShrink: 0 }}>
                  {wizardResults.some(r => r.success) && (
                    <button
                      onClick={async () => {
                        const toRevert = wizardResults.filter(r => r.success);
                        for (const r of toRevert) {
                          try { await invoke<TweakResult>("revert_tweak", { id: r.id }); setTweakStates(p => ({ ...p, [r.id]: false })); } catch {}
                        }
                        setWizardResults([]); setWizardStep(0);
                      }}
                      style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)", borderRadius: 7, padding: "6px 10px", color: "#f87171", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <RotateCcw size={11} /> Annuler tout
                    </button>
                  )}
                  <button onClick={() => setWizardStep(0)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "6px 10px", color: "#94a3b8", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}><ArrowLeft size={12} /> Terminer</button>
                </div>
              </div>
              <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(74,222,128,0.5)", borderRadius: 10, overflow: "hidden" }}>
                {wizardResults.map((r, i) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: i < wizardResults.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: r.success ? `${r.color}07` : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.success ? "#4ade80" : "#f87171", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: r.success ? "#e2e8f0" : "#64748b" }}>{r.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {r.success && (
                        <button
                          onClick={async () => { try { await invoke<TweakResult>("revert_tweak", { id: r.id }); setTweakStates(p => ({ ...p, [r.id]: false })); setWizardResults(prev => prev.filter(x => x.id !== r.id)); } catch {} }}
                          style={{ fontSize: 10, padding: "3px 9px", borderRadius: 5, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <RotateCcw size={10} /> Annuler
                        </button>
                      )}
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: r.success ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)", color: r.success ? "#4ade80" : "#f87171" }}>{r.success ? "OK" : "Erreur"}</span>
                    </div>
                  </div>
                ))}
                {wizardResults.length === 0 && (
                  <div style={{ padding: "30px 20px", textAlign: "center", color: "#374151", fontSize: 12 }}>Tous les tweaks sélectionnés étaient déjà actifs.</div>
                )}
              </div>
            </div>
          )}

          {/* ── Liste normale ── */}
          {wizardStep === 0 && TWEAK_GROUPS.map(group => {
            const groupTweaks   = TWEAKS.filter(t => t.group === group.id);
            const activeInGroup = groupTweaks.filter(t => tweakStates[t.id]).length;
            return (
              <div key={group.id} style={{ marginBottom: 18 }}>
                {/* Header groupe */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: group.color }} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>{group.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: `${group.color}15`, border: `1px solid ${group.color}28`, color: group.color }}>
                    {activeInGroup}/{groupTweaks.length}
                  </span>
                </div>
                {/* Tweaks */}
                <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${group.color}50`, borderRadius: 10, overflow: "hidden" }}>
                  {groupTweaks.map((tw, i) => {
                    const active  = tweakStates[tw.id] ?? false;
                    const loading = tweakLoading[tw.id];
                    return (
                      <div
                        key={tw.id}
                        onClick={() => !loading && handleToggleTweak(tw.id)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "11px 16px",
                          borderBottom: i < groupTweaks.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          background: active ? `${tw.color}07` : "transparent",
                          cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = active ? `${tw.color}10` : "rgba(255,255,255,0.02)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = active ? `${tw.color}07` : "transparent"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: active ? `${tw.color}14` : "rgba(255,255,255,0.04)", color: active ? tw.color : "#374151", transition: "all 0.2s" }}>
                            {tw.icon}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? "#e2e8f0" : "#94a3b8" }}>{tw.label}</span>
                              {tw.requiresAdmin && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>Admin</span>}
                              {active && <CheckCircle size={10} style={{ color: tw.color }} />}
                            </div>
                            <p style={{ fontSize: 10, color: "#374151", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 500 }}>{tw.desc}</p>
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, marginLeft: 12 }}>
                          {loading
                            ? <div className="animate-spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(245,158,11,0.15)", borderTopColor: "#f59e0b" }} />
                            : <Toggle on={active} color={tw.color} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
