import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import pcpulseLogo from "../assets/pcpulse-logo.svg";

interface Props { onDone: () => void; }

const STEPS = [
  "Initialisation du système...",
  "Analyse du matériel...",
  "Chargement des modules...",
  "Connexion sécurisée...",
  "Prêt.",
];

const TOTAL_MS = 2600;

export default function SplashScreen({ onDone }: Props) {
  const [progress,  setProgress]  = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [fadeOut,   setFadeOut]   = useState(false);
  const [version,   setVersion]   = useState("…");

  useEffect(() => { getVersion().then(setVersion).catch(() => setVersion("?")); }, []);

  useEffect(() => {
    const progressIv = setInterval(() => {
      setProgress(p => {
        const next = p + 1;
        if (next >= 100) { clearInterval(progressIv); return 100; }
        return next;
      });
    }, TOTAL_MS / 100);

    const stepDur = TOTAL_MS / STEPS.length;
    const stepTos = STEPS.map((_, i) => setTimeout(() => setStepIndex(i), stepDur * i));

    const doneTo = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onDone, 450);
    }, TOTAL_MS + 150);

    return () => {
      clearInterval(progressIv);
      stepTos.forEach(clearTimeout);
      clearTimeout(doneTo);
    };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#08080f",
      backgroundImage: `
        radial-gradient(ellipse at 50% 35%, rgba(59,130,246,0.1) 0%, transparent 55%),
        radial-gradient(ellipse at 20% 75%, rgba(99,102,241,0.06) 0%, transparent 45%)
      `,
      opacity: fadeOut ? 0 : 1,
      transition: "opacity 0.45s ease",
      overflow: "hidden",
    }}>

      {/* Dot grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        pointerEvents: "none",
      }} />

      {/* Glow blob */}
      <div style={{
        position: "absolute",
        width: 300, height: 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
        top: "50%", left: "50%",
        transform: "translate(-50%, -65%)",
        pointerEvents: "none",
      }} />

      {/* ── Logo ── */}
      <div style={{ position: "relative", marginBottom: 28, zIndex: 1 }}>
        <div style={{
          position: "absolute", inset: -16, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
        }} />
        <img
          src={pcpulseLogo}
          alt="PCPulse"
          style={{
            width: 76, height: 76, borderRadius: 18,
            boxShadow: "0 0 32px rgba(59,130,246,0.22), 0 8px 32px rgba(0,0,0,0.5)",
            position: "relative",
          }}
        />
      </div>

      {/* ── Titre ── */}
      <div style={{ textAlign: "center", marginBottom: 36, zIndex: 1 }}>
        <h1 style={{
          fontFamily: "'Orbitron', sans-serif",
          fontWeight: 800, fontSize: 26, color: "#f8fafc",
          letterSpacing: "0.2em", margin: "0 0 6px",
        }}>
          PCPULSE
        </h1>
        <p style={{
          fontSize: 10, fontWeight: 500, letterSpacing: "0.3em",
          textTransform: "uppercase", color: "#475569", margin: 0,
        }}>
          PC Optimizer
        </p>
      </div>

      {/* ── Barre de progression ── */}
      <div style={{ width: 260, zIndex: 1 }}>
        <div style={{
          height: 2, borderRadius: 2, overflow: "hidden", marginBottom: 10,
          background: "rgba(255,255,255,0.07)", position: "relative",
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${progress}%`,
            background: "linear-gradient(90deg, #3b82f6, #6366f1)",
            transition: "width 0.1s linear",
          }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            key={stepIndex}
            className="animate-fadeIn"
            style={{ fontSize: 10, color: "#475569" }}
          >
            {STEPS[stepIndex]}
          </span>
          <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 600, color: "#3b82f6" }}>
            {progress}%
          </span>
        </div>
      </div>

      {/* ── Version ── */}
      <div style={{
        position: "absolute", bottom: 18, zIndex: 1,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{ height: 1, width: 20, background: "rgba(255,255,255,0.06)" }} />
        <span style={{
          fontSize: 9, fontFamily: "'Orbitron', sans-serif",
          letterSpacing: "0.2em", color: "rgba(255,255,255,0.1)",
        }}>
          v{version}
        </span>
        <div style={{ height: 1, width: 20, background: "rgba(255,255,255,0.06)" }} />
      </div>

    </div>
  );
}
