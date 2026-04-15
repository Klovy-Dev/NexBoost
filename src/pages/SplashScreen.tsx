import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import nexboostLogo from "../assets/nexboost-logo.svg";

interface Props { onDone: () => void; }

const STEPS = [
  "Initialisation du système...",
  "Analyse du matériel...",
  "Chargement des profils...",
  "Connexion sécurisée...",
  "Prêt.",
];

const TOTAL_MS = 2800;

// ── Coin décoratif FPSDoctor ──────────────────────────────────
function Corner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const size = 18;
  const t = pos.includes("t") ? 24 : undefined;
  const b = pos.includes("b") ? 24 : undefined;
  const l = pos.includes("l") ? 24 : undefined;
  const r = pos.includes("r") ? 24 : undefined;
  const bt = pos.includes("t") ? "borderTop" : "borderBottom";
  const bl = pos.includes("l") ? "borderLeft" : "borderRight";
  return (
    <div style={{
      position: "absolute", top: t, bottom: b, left: l, right: r,
      width: size, height: size,
      [bt]: "1px solid rgba(56,189,248,0.4)",
      [bl]: "1px solid rgba(56,189,248,0.4)",
    }} />
  );
}

export default function SplashScreen({ onDone }: Props) {
  const [progress,  setProgress]  = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [fadeOut,   setFadeOut]   = useState(false);
  const [scanY,     setScanY]     = useState(0);
  const [version,   setVersion]   = useState("…");

  useEffect(() => { getVersion().then(setVersion).catch(() => setVersion("?")); }, []);

  useEffect(() => {
    // Progression
    const progressIv = setInterval(() => {
      setProgress(p => {
        const next = p + 1;
        if (next >= 100) { clearInterval(progressIv); return 100; }
        return next;
      });
    }, TOTAL_MS / 100);

    // Étapes
    const stepDur = TOTAL_MS / STEPS.length;
    const stepTos = STEPS.map((_, i) => setTimeout(() => setStepIndex(i), stepDur * i));

    // Fin
    const doneTo = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onDone, 500);
    }, TOTAL_MS + 200);

    // Animation scan line
    const scanIv = setInterval(() => {
      setScanY(y => (y + 1) % 100);
    }, 16);

    return () => {
      clearInterval(progressIv);
      clearInterval(scanIv);
      stepTos.forEach(clearTimeout);
      clearTimeout(doneTo);
    };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#07070d",
      backgroundImage: `
        radial-gradient(ellipse at 50% 40%, rgba(56,189,248,0.07) 0%, transparent 55%),
        radial-gradient(ellipse at 20% 80%, rgba(129,140,248,0.04) 0%, transparent 45%)
      `,
      opacity: fadeOut ? 0 : 1,
      transition: "opacity 0.5s ease",
      overflow: "hidden",
    }}>

      {/* Coins décoratifs */}
      <Corner pos="tl" />
      <Corner pos="tr" />
      <Corner pos="bl" />
      <Corner pos="br" />

      {/* Ligne de scan */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 1,
        top: `${scanY}%`,
        background: "linear-gradient(90deg, transparent, rgba(56,189,248,0.12), transparent)",
        pointerEvents: "none",
      }} />

      {/* ── Logo ── */}
      <div style={{ position: "relative", marginBottom: 36 }}>
        {/* Anneaux */}
        <div className="animate-ping" style={{
          position: "absolute", inset: -22, borderRadius: "50%",
          border: "1px solid rgba(56,189,248,0.18)",
          animationDuration: "3s",
        }} />
        <div className="animate-ping" style={{
          position: "absolute", inset: -42, borderRadius: "50%",
          border: "1px solid rgba(56,189,248,0.08)",
          animationDuration: "4s",
          animationDelay: "0.8s",
        }} />

        {/* Logo NB */}
        <img
          src={nexboostLogo}
          alt="NexBoost"
          style={{
            width: 88, height: 88, borderRadius: 20,
            boxShadow: "0 0 40px rgba(0,229,255,0.18), 0 0 80px rgba(0,229,255,0.08)",
            position: "relative",
          }}
        />
      </div>

      {/* ── Titre ── */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <h1 style={{
          fontFamily: "'Orbitron', monospace",
          fontWeight: 900, fontSize: 30, color: "#f1f5f9",
          letterSpacing: "0.25em", margin: "0 0 8px",
          textShadow: "0 0 30px rgba(56,189,248,0.2)",
        }}>
          NEXBOOST
        </h1>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ height: 1, width: 28, background: "rgba(56,189,248,0.3)" }} />
          <p style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.45em",
            textTransform: "uppercase", color: "#38bdf8", margin: 0,
          }}>
            Gaming Optimizer
          </p>
          <div style={{ height: 1, width: 28, background: "rgba(56,189,248,0.3)" }} />
        </div>
      </div>

      {/* ── Barre de progression ── */}
      <div style={{ width: 300 }}>
        {/* Track */}
        <div style={{
          height: 2, borderRadius: 2, overflow: "hidden", marginBottom: 10,
          background: "rgba(255,255,255,0.06)",
          position: "relative",
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${progress}%`,
            background: "linear-gradient(90deg, #0ea5e9, #38bdf8, #7dd3fc)",
            boxShadow: "0 0 10px rgba(56,189,248,0.6)",
            transition: "width 0.1s linear",
          }} />
          {/* Glow point */}
          <div style={{
            position: "absolute", top: "50%", transform: "translateY(-50%)",
            left: `${progress}%`, marginLeft: -4,
            width: 8, height: 8, borderRadius: "50%",
            background: "#38bdf8",
            boxShadow: "0 0 8px rgba(56,189,248,0.9)",
            opacity: progress < 100 ? 1 : 0,
            transition: "left 0.1s linear",
          }} />
        </div>

        {/* Texte */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span
            key={stepIndex}
            className="animate-fadeIn"
            style={{ fontSize: 10, color: "#4b5563" }}
          >
            {STEPS[stepIndex]}
          </span>
          <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: "#38bdf8" }}>
            {progress}%
          </span>
        </div>
      </div>

      {/* ── Version ── */}
      <div style={{
        position: "absolute", bottom: 20,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{ height: 1, width: 16, background: "rgba(255,255,255,0.07)" }} />
        <span style={{
          fontSize: 9, fontFamily: "'Orbitron', monospace",
          letterSpacing: "0.2em", color: "rgba(255,255,255,0.12)",
        }}>
          v{version}
        </span>
        <div style={{ height: 1, width: 16, background: "rgba(255,255,255,0.07)" }} />
      </div>

    </div>
  );
}
