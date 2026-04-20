import { Zap, Trash2, Gauge, Crown, FlaskConical, Gamepad2, Wifi, Monitor } from "lucide-react";
import type { SystemStats, History, Tab } from "../types";
import { TWEAKS } from "../lib/constants";

interface Props {
  stats:          SystemStats;
  history:        History;
  gpuHistory:     number[];
  perfScore:      number;
  activeCount:    number;
  optimizing:     boolean;
  optimizedCount: number;
  handleBigBoost: () => void;
  username:       string;
  isPro:          boolean;
  isBeta:         boolean;
  setActiveTab:   (t: Tab) => void;
}

const S = {
  bg:      "#0d0d0d",
  surface: "#161616",
  border:  "rgba(255,255,255,0.06)",
  accent:  "#3b82f6",
  text:    "#ffffff",
  text2:   "#9ca3af",
  text3:   "#4b5563",
};

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const W = 200, H = 40, pad = 2;
  const toY = (v: number) => pad + (1 - Math.min(Math.max(v, 0), 100) / 100) * (H - pad * 2);
  const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: toY(v) }));
  if (pts.length < 2) return null;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const cx = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C ${cx} ${p0.y.toFixed(1)} ${cx} ${p1.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  const areaD = `${d} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 40, display: "block" }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace("#","")})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 40, circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" style={{ width: 110, height: 110 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${circ}`} strokeDashoffset={`${circ * (1 - score / 100)}`}
        transform="rotate(-90 50 50)" strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="50" y="47" textAnchor="middle" fontSize="20" fontWeight="800" fill={color} fontFamily="sans-serif">{score}</text>
      <text x="50" y="59" textAnchor="middle" fontSize="8" fill="#4b5563" fontFamily="sans-serif">/100</text>
    </svg>
  );
}

export default function DashboardTab({ stats, history, gpuHistory, perfScore, activeCount, optimizing, optimizedCount, handleBigBoost, username, isPro, isBeta, setActiveTab }: Props) {
  const scoreColor = perfScore >= 75 ? "#4ade80" : perfScore >= 50 ? "#fbbf24" : "#f87171";
  const ramPct     = stats.ram_total_gb > 0 ? Math.round((stats.ram_used_gb / stats.ram_total_gb) * 100) : stats.ram;

  const lastCleaned = (() => {
    const v = localStorage.getItem("pcpulse_last_cleaned");
    if (!v) return "Jamais nettoyé";
    const d = new Date(v);
    const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (diff === 0) return "Nettoyé aujourd'hui";
    if (diff === 1) return "Nettoyé hier";
    if (diff < 7)  return `Il y a ${diff} jours`;
    return `Le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
  })();

  const statCards = [
    { label: "Optimizer", icon: <Zap size={18} />, color: "#f59e0b", value: `${activeCount}/${TWEAKS.length}`, sub: "tweaks actifs", tab: "performance" as Tab },
    { label: "Cleaner",   icon: <Trash2 size={18} />, color: "#06b6d4", value: lastCleaned, sub: "dernier nettoyage", tab: "cleanup" as Tab },
    { label: "Booster",   icon: <Gauge size={18} />,  color: "#8b5cf6", value: `${stats.cpu}%`, sub: "utilisation CPU", tab: "system" as Tab },
    { label: "Réseau",    icon: <Wifi size={18} />,   color: "#10b981", value: `${stats.ram_used_gb > 0 ? stats.ram_used_gb.toFixed(1) : stats.ram + "%"}`, sub: stats.ram_used_gb > 0 ? `/ ${stats.ram_total_gb} GB RAM` : "utilisation RAM", tab: "network" as Tab },
  ];

  const metricCards = [
    { label: "Utilisation CPU", sub: stats.cpu > 85 ? "Surchargé" : stats.cpu > 65 ? "Élevé" : "Normal", value: `${stats.cpu} %`, color: stats.cpu > 85 ? "#ef4444" : stats.cpu > 65 ? "#f97316" : "#3b82f6", data: history.cpu },
    { label: "Utilisation RAM", sub: stats.ram_total_gb > 0 ? `${stats.ram_used_gb.toFixed(1)} GB / ${stats.ram_total_gb} GB` : `${stats.ram}%`, value: `${ramPct} %`, color: ramPct > 85 ? "#ef4444" : "#8b5cf6", data: history.ram },
    { label: "Réseau", sub: "Interface principale", value: "—", color: "#10b981", data: gpuHistory },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24, background: S.bg }} className="animate-fadeIn">

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: S.text, margin: "0 0 4px" }}>
            Bonjour, <span style={{ color: S.accent }}>{username}</span> 👋
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 12, color: S.text3, display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" }} />
              Surveillance active
            </div>
            {isPro && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: "#c084fc", display: "flex", alignItems: "center", gap: 4 }}><Crown size={9} /> Pro</span>}
            {isBeta && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", color: "#a78bfa", display: "flex", alignItems: "center", gap: 4 }}><FlaskConical size={9} /> Bêta</span>}
          </div>
        </div>

        {/* Score ring */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px", background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14 }}>
          <ScoreRing score={perfScore} color={scoreColor} />
          <div>
            <div style={{ fontSize: 11, color: S.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Votre score PC</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor, marginBottom: 8 }}>
              {perfScore >= 75 ? "Excellent" : perfScore >= 50 ? "Moyen" : "À optimiser"}
            </div>
            <button
              style={{ fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 6, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.22)", color: "#60a5fa", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
              onClick={() => setActiveTab("performance")}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; }}
            >
              <Zap size={10} /> Analyser
            </button>
          </div>
        </div>
      </div>

      {/* ══ 4 STAT CARDS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {statCards.map(c => (
          <button
            key={c.label}
            onClick={() => setActiveTab(c.tab)}
            style={{ padding: "16px 18px", background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, textAlign: "left", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.color}35`; e.currentTarget.style.background = `${c.color}08`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.background = S.surface; }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: `${c.color}15`, color: c.color, marginBottom: 12 }}>
              {c.icon}
            </div>
            <div style={{ fontSize: 11, color: S.text3, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: S.text, marginBottom: 2 }}>{c.value}</div>
            <div style={{ fontSize: 10, color: S.text3 }}>{c.sub}</div>
          </button>
        ))}
      </div>

      {/* ══ OPTIMISATIONS RECOMMANDÉES ══ */}
      <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 14, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: S.text, marginBottom: 3 }}>
              Optimisations recommandées
            </div>
            <div style={{ fontSize: 12, color: S.text3 }}>
              Vous avez appliqué <strong style={{ color: S.accent }}>{activeCount}</strong> sur {TWEAKS.length} optimisations disponibles.
            </div>
          </div>
          <button
            onClick={handleBigBoost} disabled={optimizing}
            style={{
              padding: "9px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6,
              background: optimizing ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.25)",
              color: "#60a5fa", cursor: optimizing ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!optimizing) e.currentTarget.style.background = "rgba(59,130,246,0.2)"; }}
            onMouseLeave={e => { if (!optimizing) e.currentTarget.style.background = "rgba(59,130,246,0.12)"; }}
          >
            {optimizing ? (
              <><div className="animate-spin" style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6" }} />
              {optimizedCount}/{TWEAKS.length}</>
            ) : (
              <><Zap size={13} /> Optimiser maintenant</>
            )}
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: optimizing ? `${(optimizedCount / TWEAKS.length) * 100}%` : `${(activeCount / TWEAKS.length) * 100}%`, background: "linear-gradient(90deg,#3b82f6,#6366f1)", borderRadius: 3, transition: "width 0.4s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10, color: S.text3 }}>{activeCount} actives</span>
          <span style={{ fontSize: 10, color: S.text3 }}>{TWEAKS.length - activeCount} disponibles</span>
        </div>
      </div>

      {/* ══ 3 METRIC CARDS ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {metricCards.map(m => (
          <div key={m.label} style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: S.text2 }}>{m.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: "monospace" }}>{m.value}</div>
            </div>
            <div style={{ fontSize: 11, color: S.text3, marginBottom: 10 }}>{m.sub}</div>
            <MiniChart data={m.data} color={m.color} />
          </div>
        ))}
      </div>

      {/* ══ SHORTCUTS ══ */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: S.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Accès rapide</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {[
            { icon: <Zap size={14} />,      label: "Optimizer",  sub: `${activeCount} tweaks actifs`,    color: "#f59e0b", tab: "performance" as Tab },
            { icon: <Trash2 size={14} />,   label: "Cleaner",    sub: lastCleaned,                       color: "#06b6d4", tab: "cleanup"     as Tab },
            { icon: <Gamepad2 size={14} />, label: "Jeux",       sub: "Bibliothèque & boost",            color: "#ef4444", tab: "games"       as Tab },
            { icon: <Monitor size={14} />,  label: "Votre PC",   sub: `${stats.cpu_cores || "—"} cœurs CPU`,    color: "#8b5cf6", tab: "processes"  as Tab },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => setActiveTab(s.tab)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                background: S.surface, border: `1px solid ${S.border}`, borderRadius: 10,
                cursor: "pointer", transition: "all 0.15s", textAlign: "left",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${s.color}0a`; e.currentTarget.style.borderColor = `${s.color}28`; }}
              onMouseLeave={e => { e.currentTarget.style.background = S.surface; e.currentTarget.style.borderColor = S.border; }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `${s.color}15`, color: s.color, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: S.text2 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: S.text3, marginTop: 1 }}>{s.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
