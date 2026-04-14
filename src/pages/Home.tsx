import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { Zap, Activity, Shield, Monitor, ArrowRight } from "lucide-react";
import TitleBar from "../components/TitleBar";

const FEATURES = [
  { icon: <Activity size={14} />, label: "Monitoring CPU · RAM · Temp en direct", color: "#38bdf8" },
  { icon: <Zap size={14} />,      label: "Boost Windows en 1 seul clic",          color: "#818cf8" },
  { icon: <Monitor size={14} />,  label: "Interface claire, rapide, intuitive",   color: "#f97316" },
  { icon: <Shield size={14} />,   label: "100% local — rien n'est envoyé",        color: "#4ade80" },
];

interface SystemStats { cpu: number; ram_used_gb: number; ram_total_gb: number; }

export default function Home() {
  const navigate = useNavigate();
  const [cpuFree,  setCpuFree]  = useState<string | null>(null);
  const [freeRam,  setFreeRam]  = useState<string | null>(null);
  const [ping,     setPing]     = useState<string | null>(null);

  useEffect(() => {
    invoke<SystemStats>("get_system_stats")
      .then(s => {
        setCpuFree(String(Math.max(0, 100 - Math.round(s.cpu))));
        setFreeRam((s.ram_total_gb - s.ram_used_gb).toFixed(1));
      })
      .catch(() => {});

    invoke<number>("measure_ping")
      .then(ms => { if (ms > 0) setPing(String(ms)); })
      .catch(() => {});
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      background: "#07070d",
      backgroundImage: "radial-gradient(ellipse at 25% 40%, rgba(56,189,248,0.05) 0%, transparent 55%), radial-gradient(ellipse at 75% 65%, rgba(129,140,248,0.05) 0%, transparent 55%)",
    }}>
      <TitleBar />

      {/* ── Contenu centré ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 48px", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 48, alignItems: "center", width: "100%" }}>

          {/* ── Branding gauche ── */}
          <div style={{ flex: 1 }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 10, color: "#38bdf8" }}>NB</span>
              </div>
              <div>
                <div style={{ fontFamily: "'Orbitron', monospace", fontWeight: 700, fontSize: 14, color: "#f1f5f9", letterSpacing: "0.15em" }}>NEXBOOST</div>
                <div style={{ fontSize: 10, color: "#4b5563", marginTop: 1 }}>Gaming Optimizer</div>
              </div>
            </div>

            {/* Badge version */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 20, marginBottom: 14,
              background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.18)",
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#38bdf8" }} className="animate-pulse" />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#38bdf8" }}>v1.0.0 Alpha · Gratuit pour toujours</span>
            </div>

            <h1 style={{ fontSize: 30, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.2, margin: "0 0 10px" }}>
              Optimisez votre PC.<br />
              <span style={{ color: "#38bdf8" }}>Jouez mieux.</span>
            </h1>
            <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.7, margin: "0 0 26px", maxWidth: 340 }}>
              Surveillez vos performances et appliquez les meilleures optimisations Windows en un seul clic.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
              <button
                onClick={() => navigate("/register")}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "11px 22px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.35)", color: "#38bdf8",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(56,189,248,0.22)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(56,189,248,0.12)"; }}
              >
                <Zap size={13} /> Commencer gratuitement
              </button>
              <button
                onClick={() => navigate("/login")}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "11px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#f1f5f9"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#94a3b8"; }}
              >
                Se connecter <ArrowRight size={12} />
              </button>
            </div>

            {/* Garanties */}
            <div style={{ display: "flex", gap: 18 }}>
              {["Gratuit", "100% local", "Windows 10/11"].map(g => (
                <div key={g} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#38bdf8", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: "#4b5563" }}>{g}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Carte droite ── */}
          <div style={{
            background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 14, padding: "22px 24px", width: 288, flexShrink: 0,
          }}>
            {/* Fonctionnalités */}
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4b5563", marginBottom: 14 }}>
              FONCTIONNALITÉS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {FEATURES.map(f => (
                <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: `${f.color}14`, color: f.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{f.icon}</div>
                  <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.3 }}>{f.label}</span>
                </div>
              ))}
            </div>

            {/* Stats live */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
              marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)",
            }}>
              {[
                { label: "CPU libre",  value: cpuFree  != null ? `${cpuFree}%`    : "…", color: "#38bdf8" },
                { label: "RAM libre",  value: freeRam  != null ? `${freeRam} GB`  : "…", color: "#818cf8" },
                { label: "Ping",       value: ping     != null ? `${ping} ms`     : "…", color: "#4ade80" },
              ].map(s => (
                <div key={s.label} style={{
                  textAlign: "center", padding: "9px 4px",
                  background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 8, color: "#4b5563", marginTop: 4, lineHeight: 1.2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Témoignage */}
            <div style={{
              marginTop: 14, padding: "12px 14px",
              background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)",
            }}>
              <div style={{ display: "flex", gap: 2, marginBottom: 5 }}>
                {[0,1,2,3,4].map(i => <span key={i} style={{ color: "#fbbf24", fontSize: 10 }}>★</span>)}
              </div>
              <p style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5, margin: "0 0 8px" }}>
                "Mon jeu tourne maintenant à 110 FPS stables au lieu de 85."
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "rgba(56,189,248,0.15)", color: "#38bdf8",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700,
                }}>K</div>
                <span style={{ fontSize: 10, color: "#4b5563" }}>Karthos_GG</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Barre du bas ── */}
      <div style={{
        padding: "7px 20px", borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: "#4b5563" }}>v1.0.0 Alpha</span>
        <span style={{ fontSize: 10, color: "#4b5563" }}>Aucune donnée partagée · Windows 10/11</span>
      </div>
    </div>
  );
}
