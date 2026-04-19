import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Power, ChevronRight, Check, Gamepad2, Cpu, Shield } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import pcpulseLogo from "../assets/pcpulse-logo.svg";
import TitleBar from "../components/TitleBar";

type Step = 1 | 2 | 3;

const FEATURES = [
  { icon: <Cpu size={16} />,      color: "#3b82f6", title: "Monitoring temps réel",  desc: "CPU, RAM, réseau en direct" },
  { icon: <Zap size={16} />,      color: "#f59e0b", title: "35 tweaks Windows",      desc: "Entièrement réversibles" },
  { icon: <Gamepad2 size={16} />, color: "#ef4444", title: "Optimiseur gaming",      desc: "FPS, latence, réactivité" },
  { icon: <Shield size={16} />,   color: "#10b981", title: "100% local",             desc: "Rien n'est envoyé hors du PC" },
];

interface Props { onDone: () => void; }

export default function Onboarding({ onDone }: Props) {
  const navigate  = useNavigate();
  const [step,        setStep]        = useState<Step>(1);
  const [autostart,   setAutostart]   = useState(false);
  const [astLoading,  setAstLoading]  = useState(false);

  const toggleAutostart = async () => {
    const next = !autostart;
    setAstLoading(true);
    try { await invoke("set_autostart", { enable: next }); } catch {}
    setAutostart(next);
    setAstLoading(false);
  };

  const finish = () => {
    localStorage.setItem("pcpulse_onboarded", "true");
    onDone();
    navigate("/login");
  };

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      background: "#08080f",
      backgroundImage: `
        radial-gradient(ellipse at 30% 30%, rgba(59,130,246,0.09) 0%, transparent 55%),
        radial-gradient(ellipse at 75% 70%, rgba(99,102,241,0.07) 0%, transparent 50%)
      `,
    }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />
      <TitleBar />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", zIndex: 1 }}>

        {/* Indicateur d'étapes */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          {([1, 2, 3] as Step[]).map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: s < step ? 22 : s === step ? 22 : 18, height: s < step ? 22 : s === step ? 22 : 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s", background: s < step ? "#3b82f6" : s === step ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)", border: `2px solid ${s <= step ? "#3b82f6" : "rgba(255,255,255,0.1)"}` }}>
                {s < step
                  ? <Check size={11} style={{ color: "#fff" }} />
                  : <span style={{ fontSize: 10, fontWeight: 700, color: s === step ? "#3b82f6" : "#374151" }}>{s}</span>}
              </div>
              {s < 3 && <div style={{ width: 32, height: 2, borderRadius: 1, background: s < step ? "#3b82f6" : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />}
            </div>
          ))}
        </div>

        {/* ── Étape 1 : Bienvenue ── */}
        {step === 1 && (
          <div style={{ width: "100%", maxWidth: 440, textAlign: "center" }} className="animate-fadeIn">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", boxShadow: "0 0 40px rgba(99,102,241,0.15)" }}>
                <img src={pcpulseLogo} alt="PCPulse" style={{ width: 48, height: 48, borderRadius: 12 }} />
              </div>
            </div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 11, color: "#818cf8", letterSpacing: "0.2em", marginBottom: 8 }}>PCPULSE</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f8fafc", margin: "0 0 10px", lineHeight: 1.2 }}>
              Bienvenue sur<br /><span style={{ color: "#3b82f6" }}>PCPulse</span>
            </h1>
            <p style={{ fontSize: 13, color: "#475569", marginBottom: 28, lineHeight: 1.7 }}>
              L'optimiseur PC gaming pour Windows.<br />Rapide, réversible, 100% local.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 28 }}>
              {FEATURES.map(f => (
                <div key={f.title} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "left" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${f.color}14`, color: f.color }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{f.title}</div>
                    <div style={{ fontSize: 10, color: "#374151", marginTop: 1 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              style={{ width: "100%", padding: "13px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", transition: "all 0.18s", background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.9))", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", boxShadow: "0 4px 20px rgba(59,130,246,0.3)" }}
              onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
            >
              Commencer <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Étape 2 : Préférences ── */}
        {step === 2 && (
          <div style={{ width: "100%", maxWidth: 400 }} className="animate-fadeIn">
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#f8fafc", margin: "0 0 8px" }}>Préférences</h2>
              <p style={{ fontSize: 12, color: "#475569" }}>Configurez PCPulse selon vos besoins</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>

              {/* Lancer au démarrage */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 18px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${autostart ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}`, borderLeft: `3px solid ${autostart ? "#3b82f6" : "rgba(255,255,255,0.1)"}`, transition: "all 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: autostart ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)", border: `1px solid ${autostart ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                    <Power size={15} style={{ color: autostart ? "#3b82f6" : "#374151" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>Lancer au démarrage</div>
                    <div style={{ fontSize: 11, color: "#374151", marginTop: 2 }}>PCPulse démarre avec Windows</div>
                  </div>
                </div>
                <button
                  onClick={toggleAutostart}
                  disabled={astLoading}
                  style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: astLoading ? "wait" : "pointer", transition: "all 0.2s", background: autostart ? "#3b82f6" : "rgba(255,255,255,0.1)", position: "relative", flexShrink: 0 }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, transition: "left 0.2s", left: autostart ? 23 : 3 }} />
                </button>
              </div>

              {/* Info performances */}
              <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)", borderLeft: "3px solid rgba(245,158,11,0.4)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <Zap size={15} style={{ color: "#f59e0b" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>Tweaks réversibles</div>
                    <div style={{ fontSize: 11, color: "#374151", marginTop: 2 }}>Tous les tweaks peuvent être annulés à tout moment depuis l'onglet Optimisations</div>
                  </div>
                </div>
              </div>

              {/* Info vie privée */}
              <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderLeft: "3px solid rgba(16,185,129,0.4)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <Shield size={15} style={{ color: "#10b981" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>Données locales uniquement</div>
                    <div style={{ fontSize: 11, color: "#374151", marginTop: 2 }}>PCPulse ne collecte aucune donnée personnelle et ne communique pas avec des serveurs tiers</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setStep(1)}
                style={{ padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#475569", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.color = "#94a3b8"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "#475569"; }}
              >
                ← Retour
              </button>
              <button
                onClick={() => setStep(3)}
                style={{ flex: 1, padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.18s", background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.9))", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", boxShadow: "0 4px 20px rgba(59,130,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
              >
                Continuer <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Étape 3 : Prêt ── */}
        {step === 3 && (
          <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }} className="animate-fadeIn">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(74,222,128,0.12)", border: "2px solid rgba(74,222,128,0.35)", boxShadow: "0 0 40px rgba(74,222,128,0.15)" }}>
                <Check size={32} style={{ color: "#4ade80" }} />
              </div>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc", margin: "0 0 10px" }}>
              PCPulse est prêt !
            </h2>
            <p style={{ fontSize: 12, color: "#475569", marginBottom: 24, lineHeight: 1.7 }}>
              Créez un compte ou connectez-vous pour commencer<br />à optimiser votre PC gaming.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24, padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "left" }}>
              {[
                { label: "Lancement au démarrage", value: autostart ? "Activé" : "Désactivé", ok: autostart },
                { label: "Mode bêta",              value: "Disponible dans Système → Paramètres", ok: true },
                { label: "Données locales",        value: "100% sur votre PC", ok: true },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "#475569" }}>{item.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: item.ok ? "#4ade80" : "#fbbf24" }}>{item.value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={finish}
              style={{ width: "100%", padding: "14px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.18s", background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.9))", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", boxShadow: "0 4px 24px rgba(59,130,246,0.35)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
              onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
            >
              <Zap size={16} /> Accéder à PCPulse
            </button>
            <button
              onClick={() => setStep(2)}
              style={{ marginTop: 10, fontSize: 11, color: "#374151", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#94a3b8"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#374151"; }}
            >
              ← Modifier les préférences
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
