import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  LayoutDashboard, Zap, Wifi, ListFilter, Trash2, Gamepad2,
  ArrowRight, Shield,
} from "lucide-react";
import TitleBar from "../components/TitleBar";
import pcpulseLogo from "../assets/pcpulse-logo.svg";

const FEATURES = [
  {
    id: "dashboard",
    icon: <LayoutDashboard size={15} />,
    label: "Dashboard",
    desc: "Score santé, actions rapides, monitoring en direct",
    color: "#3b82f6",
  },
  {
    id: "performance",
    icon: <Zap size={15} />,
    label: "Optimiseur",
    desc: "Tweaks Windows réversibles par catégorie",
    color: "#f59e0b",
  },
  {
    id: "network",
    icon: <Wifi size={15} />,
    label: "Réseau",
    desc: "DNS, TCP, latence — tout optimisé",
    color: "#10b981",
  },
  {
    id: "processes",
    icon: <ListFilter size={15} />,
    label: "Processus",
    desc: "Gérez ce qui tourne en arrière-plan",
    color: "#8b5cf6",
  },
  {
    id: "cleanup",
    icon: <Trash2 size={15} />,
    label: "Nettoyage",
    desc: "Libérez de l'espace en quelques secondes",
    color: "#06b6d4",
  },
  {
    id: "games",
    icon: <Gamepad2 size={15} />,
    label: "Jeux",
    desc: "Profils FPS, overlay, boost par jeu",
    color: "#ef4444",
  },
];

interface SystemStats { cpu: number; ram_used_gb: number; ram_total_gb: number; }

export default function Home() {
  const navigate = useNavigate();
  const [cpuFree, setCpuFree] = useState<string | null>(null);
  const [freeRam, setFreeRam] = useState<string | null>(null);
  const [ping,    setPing]    = useState<string | null>(null);

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
      background: "#08080f",
      backgroundImage: `
        radial-gradient(ellipse at 25% 30%, rgba(59,130,246,0.08) 0%, transparent 55%),
        radial-gradient(ellipse at 80% 70%, rgba(99,102,241,0.06) 0%, transparent 50%)
      `,
    }}>
      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "24px 24px", pointerEvents: "none", zIndex: 0,
      }} />

      <TitleBar />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* ── Panneau gauche — Branding ── */}
        <div style={{
          width: 300, flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          padding: "28px 24px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <div>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 28 }}>
              <img src={pcpulseLogo} alt="PCPulse" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 13, color: "#f8fafc", letterSpacing: "0.12em" }}>PCPULSE</div>
                <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>PC Optimizer</div>
              </div>
            </div>

            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 20, marginBottom: 16,
              background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
            }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#3b82f6" }} className="animate-pulse" />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#3b82f6" }}>Beta publique · Gratuit</span>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", lineHeight: 1.2, margin: "0 0 10px", letterSpacing: "-0.02em" }}>
              Optimisez votre PC.
              <br />
              <span style={{ color: "#3b82f6" }}>Jouez mieux.</span>
            </h1>
            <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, margin: "0 0 24px", maxWidth: 240 }}>
              Monitoring temps réel et optimisations Windows en un seul outil.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              <button
                onClick={() => navigate("/register")}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "11px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                  background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.9))",
                  border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
                  cursor: "pointer", transition: "all 0.18s",
                  boxShadow: "0 2px 16px rgba(59,130,246,0.3)",
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
              >
                <Zap size={13} /> Commencer gratuitement
              </button>
              <button
                onClick={() => navigate("/login")}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8",
                  cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#f8fafc"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#94a3b8"; }}
              >
                Se connecter <ArrowRight size={12} />
              </button>
            </div>

            {/* Garanties */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
              {[
                { dot: "#3b82f6", label: "100% local" },
                { dot: "#10b981", label: "Windows 10/11" },
                { dot: "#8b5cf6", label: "Open source" },
              ].map(g => (
                <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: g.dot }} />
                  <span style={{ fontSize: 10, color: "#475569" }}>{g.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats live */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
            paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)",
          }}>
            {[
              { label: "CPU libre",  value: cpuFree ? `${cpuFree}%`   : "…", color: "#3b82f6" },
              { label: "RAM libre",  value: freeRam ? `${freeRam} GB` : "…", color: "#10b981" },
              { label: "Ping",       value: ping    ? `${ping} ms`    : "…", color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{
                textAlign: "center", padding: "8px 4px",
                background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "#475569", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Panneau droit — Feature overview ── */}
        <div style={{ flex: 1, padding: "28px 24px", display: "flex", flexDirection: "column", overflowY: "auto" }}>

          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ height: 1, width: 20, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#475569" }}>
                Fonctionnalités
              </span>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc", letterSpacing: "-0.01em" }}>
              Six outils, une seule app
            </h2>
          </div>

          {/* Feature cards grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flex: 1,
          }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.id}
                className="animate-fadeIn"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "14px 16px",
                  display: "flex", flexDirection: "column", gap: 10,
                  transition: "all 0.18s", cursor: "pointer",
                  animationDelay: `${i * 0.05}s`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `${f.color}0a`;
                  e.currentTarget.style.borderColor = `${f.color}35`;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                {/* Icon + label */}
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: `${f.color}18`, color: f.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {f.icon}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#f8fafc" }}>{f.label}</span>
                </div>

                {/* Description */}
                <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.5, margin: 0 }}>{f.desc}</p>

                {/* Divider + color chip */}
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 3, height: 3, borderRadius: "50%", background: f.color, opacity: 0.7 }} />
                  <div style={{ height: 1, flex: 1, background: `${f.color}20` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom CTA */}
          <div style={{
            marginTop: 16, padding: "14px 16px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "rgba(16,185,129,0.12)", color: "#10b981",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Shield size={13} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#f8fafc" }}>100% local & sécurisé</div>
                <div style={{ fontSize: 10, color: "#475569" }}>Rien n'est envoyé hors de votre PC</div>
              </div>
            </div>
            <button
              onClick={() => navigate("/register")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#3b82f6",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; }}
            >
              Démarrer <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
