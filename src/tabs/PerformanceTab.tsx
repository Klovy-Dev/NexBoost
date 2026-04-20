import { useEffect, useState } from "react";
import { Zap, CheckCircle, AlertTriangle, Gamepad2, Wifi, MousePointer2, RotateCcw, ChevronRight } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { TweakStatus, TweakResult } from "../types";
import { TWEAKS } from "../lib/constants";

type WizardStep = 0 | 1 | 2 | 3;
type InnerTab = "recommended" | "all" | "wizard";

const WIZARD_GOALS = [
  { id: "fps",     label: "FPS Gaming",    desc: "Maximiser les images/sec",    color: "#f59e0b", icon: <Gamepad2 size={18} />,     groups: ["fps", "gpu"] as string[] },
  { id: "latency", label: "Réseau & Ping", desc: "Réduire la latence online",   color: "#10b981", icon: <Wifi size={18} />,          groups: ["latency", "network"] as string[] },
  { id: "input",   label: "Réactivité",    desc: "Souris et clavier parfaits",  color: "#8b5cf6", icon: <MousePointer2 size={18} />, groups: ["input"] as string[] },
  { id: "all",     label: "Tout optimiser",desc: "Appliquer les 35 tweaks",     color: "#ef4444", icon: <Zap size={18} />,           groups: ["fps","latency","network","input","gpu","services"] as string[] },
];

const GROUP_LABELS: Record<string, string> = {
  fps:      "Performance",
  latency:  "Latence système",
  network:  "Réseau",
  input:    "Clavier & Souris",
  services: "Services",
  gpu:      "GPU",
};

const RECOMMENDED_GROUPS = ["fps", "latency", "network"];

const S = {
  bg:      "#0d0d0d",
  surface: "#161616",
  border:  "rgba(255,255,255,0.06)",
  accent:  "#3b82f6",
  text:    "#ffffff",
  text2:   "#9ca3af",
  text3:   "#4b5563",
};

function Toggle({ active, onClick, loading }: { active: boolean; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={loading}
      style={{
        width: 40, height: 22, borderRadius: 11, border: "none", flexShrink: 0,
        background: active ? "#3b82f6" : "#1f2937",
        cursor: loading ? "not-allowed" : "pointer",
        position: "relative", transition: "background 0.2s",
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <div style={{ position: "absolute", top: 3, left: active ? "calc(100% - 19px)" : 3, width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", animation: "spin 0.6s linear infinite" }} />
      ) : (
        <div style={{ position: "absolute", top: 3, left: active ? "calc(100% - 19px)" : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.18s", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
      )}
    </button>
  );
}

interface Props {
  tweakStates:       Record<string, boolean>;
  tweakLoading:      Record<string, boolean>;
  activeCount:       number;
  handleToggleTweak: (id: string) => void;
  setTweakStates:    React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export default function PerformanceTab({ tweakStates, tweakLoading, activeCount, handleToggleTweak, setTweakStates }: Props) {
  const [innerTab,     setInnerTab]     = useState<InnerTab>("recommended");
  const [wizardStep,   setWizardStep]   = useState<WizardStep>(0);
  const [wizardGoals,  setWizardGoals]  = useState<string[]>([]);
  const [wizardProg,   setWizardProg]   = useState(0);
  const [wizardResults,setWizardResults]= useState<Array<{ id: string; label: string; color: string; success: boolean }>>([]);

  useEffect(() => {
    invoke<TweakStatus[]>("get_tweaks_status")
      .then(s => { const m: Record<string, boolean> = {}; s.forEach(x => { m[x.id] = x.active; }); setTweakStates(m); })
      .catch(() => {});
  }, []);

  const runWizard = async () => {
    setWizardStep(2); setWizardProg(0);
    const groups   = WIZARD_GOALS.filter(g => wizardGoals.includes(g.id)).flatMap(g => g.groups);
    const targets  = TWEAKS.filter(t => groups.includes(t.group) && !(tweakStates[t.id] ?? false));
    const results: Array<{ id: string; label: string; color: string; success: boolean }> = [];
    for (let i = 0; i < targets.length; i++) {
      const tw = targets[i];
      try {
        const r = await invoke<TweakResult>("apply_tweak", { id: tw.id });
        if (r.success) setTweakStates(p => ({ ...p, [tw.id]: true }));
        results.push({ id: tw.id, label: tw.label, color: tw.color, success: r.success });
      } catch { results.push({ id: tw.id, label: tw.label, color: tw.color, success: false }); }
      setWizardProg(Math.round(((i + 1) / targets.length) * 100));
    }
    setWizardResults(results); setWizardStep(3);
  };

  const displayedTweaks = innerTab === "recommended"
    ? TWEAKS.filter(t => RECOMMENDED_GROUPS.includes(t.group))
    : TWEAKS;

  const groups = [...new Set(displayedTweaks.map(t => t.group))];

  const pct = Math.round((activeCount / TWEAKS.length) * 100);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: S.bg, display: "flex", flexDirection: "column", gap: 20 }} className="animate-fadeIn">

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Zap size={18} style={{ color: "#f59e0b" }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: S.text, margin: 0 }}>
              Optimizer
              <span style={{ fontSize: 12, fontWeight: 400, color: S.text3, marginLeft: 10 }}>{activeCount}/{TWEAKS.length} tweaks actifs</span>
            </h1>
          </div>
          <p style={{ fontSize: 12, color: S.text3, margin: 0 }}>Optimisez Windows avec des tweaks réversibles pour améliorer les performances de votre PC.</p>
        </div>
        <button
          onClick={() => { setInnerTab("wizard"); setWizardStep(1); }}
          style={{ padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b", cursor: "pointer", flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.1)"; }}
        >
          <Zap size={13} /> Optimisation rapide
        </button>
      </div>

      {/* ══ PROGRESS ══ */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: S.text2, fontWeight: 500 }}>{activeCount} tweaks actifs sur {TWEAKS.length}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>{pct}%</span>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#f59e0b,#ef4444)", borderRadius: 3, transition: "width 0.5s" }} />
          </div>
        </div>
      </div>

      {/* ══ TABS ══ */}
      {innerTab !== "wizard" && (
        <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, gap: 0 }}>
          {([["recommended","Recommandé"],["all","Tout"]] as [InnerTab,string][]).map(([id,label]) => (
            <button
              key={id} onClick={() => setInnerTab(id)}
              style={{
                padding: "10px 18px", background: "none", border: "none",
                color: innerTab === id ? S.accent : S.text3,
                borderBottom: `2px solid ${innerTab === id ? S.accent : "transparent"}`,
                fontSize: 13, fontWeight: innerTab === id ? 600 : 400,
                cursor: "pointer", marginBottom: -1, transition: "all 0.12s",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ══ WIZARD ══ */}
      {innerTab === "wizard" && (
        <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, overflow: "hidden" }}>
          {/* Step 0: back button */}
          {wizardStep === 0 && (
            <div style={{ padding: "20px 24px" }}>
              <button onClick={() => setInnerTab("recommended")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: S.text3, fontSize: 12, cursor: "pointer", marginBottom: 16 }}>
                ← Retour
              </button>
            </div>
          )}
          {/* Step 1: goal selection */}
          {wizardStep === 1 && (
            <div style={{ padding: "28px 32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <button onClick={() => { setInnerTab("recommended"); setWizardStep(0); }} style={{ background: "none", border: "none", color: S.text3, cursor: "pointer", display: "flex", fontSize: 12 }}>← Retour</button>
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: S.text, marginBottom: 6 }}>Quel est votre objectif ?</h2>
              <p style={{ fontSize: 12, color: S.text3, marginBottom: 20 }}>Sélectionnez un ou plusieurs profils à appliquer.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {WIZARD_GOALS.map(g => {
                  const sel = wizardGoals.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => setWizardGoals(p => sel ? p.filter(x => x !== g.id) : [...p, g.id])}
                      style={{
                        padding: "16px 18px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                        background: sel ? `${g.color}12` : "transparent",
                        border: `1px solid ${sel ? g.color + "50" : S.border}`,
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: `${g.color}15`, color: g.color, marginBottom: 10 }}>{g.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: S.text, marginBottom: 3 }}>{g.label}</div>
                      <div style={{ fontSize: 11, color: S.text3 }}>{g.desc}</div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={runWizard} disabled={wizardGoals.length === 0}
                style={{ width: "100%", padding: "11px 0", borderRadius: 8, fontSize: 13, fontWeight: 700, background: wizardGoals.length ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${wizardGoals.length ? "rgba(59,130,246,0.3)" : S.border}`, color: wizardGoals.length ? "#60a5fa" : S.text3, cursor: wizardGoals.length ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
              >
                <Zap size={14} /> Appliquer les optimisations <ChevronRight size={14} />
              </button>
            </div>
          )}
          {/* Step 2: progress */}
          {wizardStep === 2 && (
            <div style={{ padding: "40px 32px", textAlign: "center" }}>
              <div className="animate-spin" style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(59,130,246,0.15)", borderTopColor: "#3b82f6", margin: "0 auto 20px" }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: S.text, marginBottom: 6 }}>Application en cours...</div>
              <div style={{ fontSize: 12, color: S.text3, marginBottom: 20 }}>{wizardProg}% terminé</div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", maxWidth: 300, margin: "0 auto" }}>
                <div style={{ height: "100%", width: `${wizardProg}%`, background: "linear-gradient(90deg,#3b82f6,#6366f1)", borderRadius: 3, transition: "width 0.3s" }} />
              </div>
            </div>
          )}
          {/* Step 3: results */}
          {wizardStep === 3 && (
            <div style={{ padding: "28px 32px" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: S.text, marginBottom: 4 }}>Optimisation terminée !</div>
              <div style={{ fontSize: 12, color: S.text3, marginBottom: 20 }}>
                {wizardResults.filter(r => r.success).length} optimisations appliquées sur {wizardResults.length}.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20, maxHeight: 200, overflowY: "auto" }}>
                {wizardResults.map(r => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: r.success ? "rgba(34,197,94,0.06)" : "rgba(248,113,113,0.06)", border: `1px solid ${r.success ? "rgba(34,197,94,0.15)" : "rgba(248,113,113,0.15)"}`, borderRadius: 7 }}>
                    {r.success ? <CheckCircle size={13} style={{ color: "#4ade80", flexShrink: 0 }} /> : <AlertTriangle size={13} style={{ color: "#f87171", flexShrink: 0 }} />}
                    <span style={{ fontSize: 12, color: S.text2, flex: 1 }}>{r.label}</span>
                    {r.success && (
                      <button onClick={async () => { try { await invoke<TweakResult>("revert_tweak", { id: r.id }); setTweakStates(p => ({ ...p, [r.id]: false })); } catch {} setWizardResults(p => p.filter(x => x.id !== r.id)); }}
                        style={{ fontSize: 10, color: S.text3, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                        <RotateCcw size={10} /> Annuler
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => { const toRevert = wizardResults.filter(r => r.success); for (const r of toRevert) { try { await invoke<TweakResult>("revert_tweak", { id: r.id }); setTweakStates(p => ({ ...p, [r.id]: false })); } catch {} } setWizardResults([]); setWizardStep(0); setInnerTab("recommended"); }}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", cursor: "pointer" }}
                >
                  Annuler tout
                </button>
                <button
                  onClick={() => { setWizardStep(0); setWizardResults([]); setInnerTab("recommended"); }}
                  style={{ flex: 2, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa", cursor: "pointer" }}
                >
                  Terminer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TWEAKS LIST ══ */}
      {innerTab !== "wizard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {groups.map(group => {
            const groupTweaks = displayedTweaks.filter(t => t.group === group);
            return (
              <div key={group}>
                {/* Section header */}
                <div style={{ padding: "10px 0 8px", borderBottom: `1px solid ${S.border}`, marginBottom: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: S.text3, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    {GROUP_LABELS[group] ?? group}
                  </span>
                </div>
                {/* Tweak rows */}
                {groupTweaks.map(tw => {
                  const active  = tweakStates[tw.id] ?? false;
                  const loading = tweakLoading[tw.id] ?? false;
                  return (
                    <div
                      key={tw.id}
                      style={{ display: "flex", alignItems: "flex-start", padding: "14px 0", borderBottom: `1px solid rgba(255,255,255,0.04)`, gap: 12 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: active ? S.text : S.text2 }}>{tw.label}</span>
                          {tw.requiresAdmin && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(251,191,36,0.1)", color: "#fbbf24", flexShrink: 0 }}>Admin</span>
                          )}
                          {active && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(34,197,94,0.1)", color: "#4ade80", flexShrink: 0 }}>Actif</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: S.text3, lineHeight: 1.5 }}>{tw.desc}</div>
                      </div>
                      <Toggle active={active} onClick={() => handleToggleTweak(tw.id)} loading={loading} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
