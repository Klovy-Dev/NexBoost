import { Zap, Wifi, Trash2, Gamepad2, Settings, TrendingUp, TrendingDown, Activity, Crown, FlaskConical } from "lucide-react";
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

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 44, circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" style={{ width: 130, height: 130 }}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${circ}`}
        strokeDashoffset={`${circ * (1 - score / 100)}`}
        transform="rotate(-90 50 50)"
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="50" y="44" textAnchor="middle" fontSize="22" fontWeight="800" fill={color} fontFamily="monospace">{score}</text>
      <text x="50" y="57" textAnchor="middle" fontSize="8" fill="#374151" fontFamily="monospace">/100</text>
    </svg>
  );
}

function MultiLineChart({ cpuData, ramData, gpuData }: { cpuData: number[]; ramData: number[]; gpuData: number[] }) {
  const W = 600, H = 100, pad = 2;
  const toY = (v: number) => pad + (1 - Math.min(Math.max(v, 0), 100) / 100) * (H - pad * 2);
  const makePath = (data: number[]) => {
    if (data.length < 2) return "";
    const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: toY(v) }));
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i-1], p1 = pts[i];
      const cpx = ((p0.x + p1.x) / 2).toFixed(1);
      d += ` C ${cpx} ${p0.y.toFixed(1)} ${cpx} ${p1.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return d;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f} x1="0" y1={H*f} x2={W} y2={H*f} stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" strokeDasharray="4 4" />
      ))}
      <path d={makePath(ramData)} fill="none" stroke="#8b5cf6" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <path d={makePath(cpuData)} fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <path d={makePath(gpuData)} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="3 2" />
    </svg>
  );
}

function StatBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden", marginTop: 8 }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: "width 0.6s" }} />
    </div>
  );
}

export default function DashboardTab({ stats, history, gpuHistory, perfScore, activeCount, optimizing, optimizedCount, handleBigBoost, username, isPro, isBeta, setActiveTab }: Props) {
  const scoreColor = perfScore >= 75 ? "#4ade80" : perfScore >= 50 ? "#fbbf24" : "#f87171";
  const cpuColor   = stats.cpu > 85 ? "#ef4444" : stats.cpu > 65 ? "#f97316" : "#3b82f6";
  const ramPct     = stats.ram_total_gb > 0 ? Math.round((stats.ram_used_gb / stats.ram_total_gb) * 100) : stats.ram;
  const diskPct    = stats.disk_total_gb > 0 ? Math.round((stats.disk_used_gb / stats.disk_total_gb) * 100) : 0;
  const tempColor  = stats.temp > 85 ? "#ef4444" : stats.temp > 70 ? "#f97316" : "#10b981";

  const metrics = [
    {
      label: "CPU", tab: "performance" as Tab, color: cpuColor,
      value: `${stats.cpu}%`,
      sub: stats.cpu > 85 ? "Surchargé" : stats.cpu > 65 ? "Élevé" : "Normal",
      pct: stats.cpu, icon: <Activity size={14} />,
    },
    {
      label: "RAM", tab: "system" as Tab, color: stats.ram > 85 ? "#ef4444" : stats.ram > 65 ? "#f97316" : "#8b5cf6",
      value: stats.ram_total_gb > 0 ? `${stats.ram_used_gb.toFixed(1)} GB` : `${stats.ram}%`,
      sub: stats.ram_total_gb > 0 ? `/ ${stats.ram_total_gb} GB` : "—",
      pct: ramPct, icon: <TrendingUp size={14} />,
    },
    {
      label: "Disque", tab: "cleanup" as Tab, color: diskPct > 85 ? "#ef4444" : diskPct > 65 ? "#f97316" : "#06b6d4",
      value: stats.disk_total_gb > 0 ? `${stats.disk_used_gb.toFixed(0)} GB` : "—",
      sub: stats.disk_total_gb > 0 ? `/ ${stats.disk_total_gb.toFixed(0)} GB` : "—",
      pct: diskPct, icon: <TrendingDown size={14} />,
    },
    {
      label: "Temp", tab: "performance" as Tab, color: tempColor,
      value: stats.temp > 0 ? `${stats.temp}°C` : "—",
      sub: stats.temp > 85 ? "Critique" : stats.temp > 70 ? "Chaud" : stats.temp > 0 ? "OK" : "—",
      pct: stats.temp > 0 ? (stats.temp / 100) * 100 : 0, icon: <Activity size={14} />,
    },
  ];

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

  const shortcuts = [
    { icon: <Wifi size={15} />,     label: "Réseau",        sub: "DNS · Interfaces",          color: "#10b981", tab: "network"     as Tab },
    { icon: <Trash2 size={15} />,   label: "Nettoyage",     sub: lastCleaned,                 color: "#06b6d4", tab: "cleanup"     as Tab },
    { icon: <Settings size={15} />, label: "Système",       sub: "Démarrage · Paramètres",    color: "#6366f1", tab: "system"      as Tab },
    { icon: <Gamepad2 size={15} />, label: "Jeux",          sub: "Bibliothèque · Auto-Boost", color: "#ef4444", tab: "games"       as Tab },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, padding: "20px 24px", height: "100%", overflow: "hidden" }} className="animate-fadeIn">

      {/* ═══ COLONNE GAUCHE ═══ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>

        {/* Greeting */}
        <div style={{ flexShrink: 0 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#e2e8f0", lineHeight: 1.2, margin: 0 }}>
            Bonjour, <span style={{ color: "#3b82f6" }}>{username}</span> 👋
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#22c55e" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
              Surveillance active
            </div>
            {activeCount > 0 && (
              <div style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.22)", color: "#3b82f6", display: "flex", alignItems: "center", gap: 5 }}>
                <Zap size={9} /> {activeCount} optimisation{activeCount > 1 ? "s" : ""} active{activeCount > 1 ? "s" : ""}
              </div>
            )}
            {isPro && (
              <div style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#c084fc", display: "flex", alignItems: "center", gap: 5 }}>
                <Crown size={9} /> Pro
              </div>
            )}
            {isBeta && (
              <div style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", color: "#a78bfa", display: "flex", alignItems: "center", gap: 5 }}>
                <FlaskConical size={9} /> Bêta
              </div>
            )}
          </div>
        </div>

        {/* 4 métriques */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, flexShrink: 0 }}>
          {metrics.map(m => (
            <div
              key={m.label}
              onClick={() => setActiveTab(m.tab)}
              style={{
                background: "#0d0d1f",
                border: `1px solid ${m.color}18`,
                borderLeft: `3px solid ${m.color}`,
                borderRadius: 12, padding: "14px 16px",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${m.color}08`; e.currentTarget.style.borderColor = `${m.color}35`; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#0d0d1f"; e.currentTarget.style.borderColor = `${m.color}18`; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#374151" }}>{m.label}</span>
                <div style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: `${m.color}15`, color: m.color }}>
                  {m.icon}
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "monospace", color: m.color, lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 10, color: "#374151", marginTop: 3 }}>{m.sub}</div>
              <StatBar pct={m.pct} color={m.color} />
            </div>
          ))}
        </div>

        {/* Graphique */}
        <div style={{
          flex: 1, minHeight: 0,
          background: "#0d0d1f",
          border: "1px solid rgba(255,255,255,0.07)",
          borderLeft: "3px solid rgba(59,130,246,0.5)",
          borderRadius: 12, padding: "14px 16px",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151" }}>
              UTILISATION SYSTÈME
            </span>
            <div style={{ display: "flex", gap: 12 }}>
              {([["CPU", "#3b82f6", stats.cpu + "%"], ["RAM", "#8b5cf6", stats.ram + "%"], ["GPU", "#6366f1", "—"]] as const).map(([lbl, col, val]) => (
                <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 2, background: col, borderRadius: 1 }} />
                  <span style={{ fontSize: 9, color: "#374151" }}>{lbl}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", color: col }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <MultiLineChart cpuData={history.cpu} ramData={history.ram} gpuData={gpuHistory} />
          </div>
        </div>
      </div>

      {/* ═══ COLONNE DROITE ═══ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>

        {/* Score */}
        <div style={{ background: "#0d0d1f", border: `1px solid ${scoreColor}20`, borderLeft: `3px solid ${scoreColor}`, borderRadius: 12, padding: "16px 18px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#374151" }}>SCORE PC</span>
            <div style={{ display: "flex", gap: 5 }}>
              {isPro && <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>PRO</span>}
              {isBeta && <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)", color: "#a78bfa" }}>BÊTA</span>}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flexShrink: 0 }}>
              <ScoreRing score={perfScore} color={scoreColor} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: scoreColor }}>
                {perfScore >= 75 ? "Excellent" : perfScore >= 50 ? "Moyen" : "À optimiser"}
              </div>
              {[
                { label: "Tweaks", value: `${activeCount}/${TWEAKS.length}`, pct: (activeCount / TWEAKS.length) * 100, color: "#f59e0b" },
                { label: "CPU libre", value: `${100 - stats.cpu}%`, pct: 100 - stats.cpu, color: "#3b82f6" },
                { label: "RAM libre", value: stats.ram_total_gb > 0 ? `${(stats.ram_total_gb - stats.ram_used_gb).toFixed(1)}GB` : `${100 - stats.ram}%`, pct: stats.ram_total_gb > 0 ? ((stats.ram_total_gb - stats.ram_used_gb) / stats.ram_total_gb) * 100 : 100 - stats.ram, color: "#8b5cf6" },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 9, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "monospace", color: item.color }}>{item.value}</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(item.pct, 100)}%`, background: item.color, borderRadius: 2, transition: "width 0.6s" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Boost */}
        <button
          onClick={handleBigBoost} disabled={optimizing}
          style={{
            flexShrink: 0, padding: "16px", borderRadius: 12,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            background: optimizing
              ? "rgba(245,158,11,0.06)"
              : "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(239,68,68,0.12))",
            border: `1px solid ${optimizing ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.4)"}`,
            cursor: optimizing ? "not-allowed" : "pointer",
            transition: "all 0.18s",
            boxShadow: optimizing ? "none" : "0 6px 24px rgba(245,158,11,0.12)",
          }}
          onMouseEnter={e => { if (!optimizing) { e.currentTarget.style.background = "linear-gradient(135deg, rgba(245,158,11,0.26), rgba(239,68,68,0.18))"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(245,158,11,0.22)"; }}}
          onMouseLeave={e => { if (!optimizing) { e.currentTarget.style.background = "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(239,68,68,0.12))"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(245,158,11,0.12)"; }}}
        >
          <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: optimizing ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.35)" }}>
            {optimizing
              ? <div className="animate-spin" style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(245,158,11,0.2)", borderTopColor: "#f59e0b" }} />
              : <Zap size={20} style={{ color: "#f59e0b" }} />}
          </div>
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: optimizing ? "#94a3b8" : "#e2e8f0" }}>
              {optimizing ? `Application — ${optimizedCount}/${TWEAKS.length}` : "Optimiser en 1 clic"}
            </div>
            <div style={{ fontSize: 10, color: "rgba(245,158,11,0.7)", marginTop: 2 }}>
              {optimizing ? "Tweaks en cours..." : `${TWEAKS.length} tweaks Windows`}
            </div>
            {optimizing && (
              <div style={{ marginTop: 8, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", width: "100%" }}>
                <div style={{ height: "100%", width: `${(optimizedCount / TWEAKS.length) * 100}%`, background: "linear-gradient(90deg,#f59e0b,#ef4444)", borderRadius: 2, transition: "width 0.3s" }} />
              </div>
            )}
          </div>
        </button>

        {/* Raccourcis */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151", flexShrink: 0 }}>
            ACCÈS RAPIDE
          </span>
          {shortcuts.map(s => (
            <button
              key={s.label}
              onClick={() => setActiveTab(s.tab)}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                background: "#0d0d1f",
                border: `1px solid rgba(255,255,255,0.07)`,
                borderLeft: `3px solid ${s.color}`,
                borderRadius: 10, cursor: "pointer",
                transition: "all 0.15s", textAlign: "left", flex: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${s.color}0a`; e.currentTarget.style.borderColor = `${s.color}25`; e.currentTarget.style.transform = "translateX(3px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#0d0d1f"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `${s.color}15`, color: s.color, flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "#374151", marginTop: 1 }}>{s.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
