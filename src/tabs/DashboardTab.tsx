import { Zap, Wifi, Trash2, Gamepad2, Settings } from "lucide-react";
import type { SystemStats, History, Tab } from "../types";
import { TWEAKS } from "../lib/constants";

interface Props {
  stats:          SystemStats;
  history:        History;
  gpuHistory:     number[];
  perfScore:      number;
  activeCount:    number;
  optimizing:     boolean;
  handleBigBoost: () => void;
  username:       string;
  setActiveTab:   (t: Tab) => void;
}

/* ── Ring de statut avec % centré ── */
function CircleStatus({ score, scoreColor }: { score: number; scoreColor: string }) {
  const size = 84;
  const strokeW = 5;
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(score, 100) / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size} height={size}
        style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}
      >
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeW}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={scoreColor} strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 1,
      }}>
        <span style={{
          fontSize: 15, fontWeight: 800, fontFamily: "monospace",
          color: scoreColor, lineHeight: 1,
        }}>
          {score}%
        </span>
      </div>
    </div>
  );
}

/* ── Carte statistique (valeur + label + bouton) ── */
function StatCard({ value, label, buttonLabel, onClick, color, unit = "" }: {
  value: number; label: string; buttonLabel: string;
  onClick: () => void; color: string; unit?: string;
}) {
  return (
    <div style={{
      background: "#0c0c1a",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 10,
      padding: "8px 12px",
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{
        fontSize: 27, fontWeight: 800, fontFamily: "monospace",
        color, lineHeight: 1,
      }}>
        {value}{unit}
      </div>
      <div style={{ fontSize: 9, color: "#4b5563", lineHeight: 1.3 }}>{label}</div>
      <button
        onClick={onClick}
        style={{
          marginTop: 3,
          padding: "4px 8px", borderRadius: 4,
          fontSize: 8, fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          cursor: "pointer",
          background: `${color}18`,
          border: `1px solid ${color}35`,
          color,
          transition: "all 0.15s",
          alignSelf: "flex-start",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${color}28`; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${color}18`; }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

/* ── Graphique multi-courbes (CPU / RAM / GPU) ── */
function MultiLineChart({
  cpuData, ramData, gpuData,
}: {
  cpuData: number[]; ramData: number[]; gpuData: number[];
}) {
  const W = 400, H = 100, pad = 3;
  const toY = (v: number) => pad + (1 - Math.min(Math.max(v, 0), 100) / 100) * (H - pad * 2);

  const makePath = (data: number[]) => {
    if (data.length < 2) return "";
    const pts = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: toY(v) }));
    let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i];
      const cpx = ((p0.x + p1.x) / 2).toFixed(1);
      path += ` C ${cpx} ${p0.y.toFixed(1)} ${cpx} ${p1.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return path;
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      {/* Lignes de grille */}
      {[0.25, 0.5, 0.75].map(f => (
        <line key={f}
          x1="0" y1={H * f} x2={W} y2={H * f}
          stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" strokeDasharray="4 4"
        />
      ))}
      {/* RAM */}
      <path d={makePath(ramData)} fill="none" stroke="#818cf8" strokeWidth="1.6"
        strokeLinejoin="round" strokeLinecap="round" />
      {/* CPU */}
      <path d={makePath(cpuData)} fill="none" stroke="#38bdf8" strokeWidth="1.6"
        strokeLinejoin="round" strokeLinecap="round" />
      {/* GPU */}
      <path d={makePath(gpuData)} fill="none" stroke="#a78bfa" strokeWidth="1.6"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardTab({
  stats, history, gpuHistory,
  perfScore, activeCount, optimizing, handleBigBoost,
  username, setActiveTab,
}: Props) {
  const scoreColor = perfScore >= 75 ? "#4ade80" : perfScore >= 50 ? "#fbbf24" : "#f87171";
  const cpuColor   = stats.cpu > 85 ? "#ef4444" : stats.cpu > 65 ? "#f97316" : "#38bdf8";

  const shortcuts = [
    { icon: <Zap size={20} />,      label: "Boost",      color: "#38bdf8", onClick: handleBigBoost,                active: optimizing },
    { icon: <Wifi size={20} />,     label: "Réseau",     color: "#4ade80", onClick: () => setActiveTab("network"),  active: false },
    { icon: <Trash2 size={20} />,   label: "Nettoyage",  color: "#fb923c", onClick: () => setActiveTab("cleanup"),  active: false },
    { icon: <Settings size={20} />, label: "Paramètres", color: "#94a3b8", onClick: () => setActiveTab("system"),   active: false },
    { icon: <Gamepad2 size={20} />, label: "Jeux",       color: "#a78bfa", onClick: () => setActiveTab("games"),    active: false },
  ];

  return (
    <div style={{
      padding: "16px 20px",
      display: "flex", flexDirection: "column", gap: 12,
      height: "100%", overflow: "hidden",
    }}>

      {/* ── En-tête : salutation + STATUT DU PC ── */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
        flexShrink: 0,
      }}>

        {/* Gauche : salutation */}
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontSize: 26, fontWeight: 800, lineHeight: 1.2,
            color: "#f1f5f9", margin: 0,
          }}>
            Bonjour,{" "}
            <span style={{ color: "#38bdf8" }}>{username}</span>{" "}!
          </h1>
          <p style={{ fontSize: 11, color: "#4b5563", marginTop: 5, marginBottom: 0 }}>
            Bienvenue dans ton espace d'optimisation
          </p>

          {/* Badges état */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#4ade80" }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%", background: "#4ade80",
                boxShadow: "0 0 6px #4ade80",
              }} />
              Surveillance active
            </div>
            {activeCount > 0 && (
              <div style={{
                fontSize: 10, fontWeight: 600, color: "#38bdf8",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <Zap size={9} />
                {activeCount} optimisation{activeCount > 1 ? "s" : ""} active{activeCount > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>

        {/* Droite : STATUT DU PC */}
        <div style={{
          background: "#0c0c1a",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: "14px 18px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          flexShrink: 0, minWidth: 130,
        }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#4b5563",
          }}>
            STATUT DU PC
          </span>
          <CircleStatus score={perfScore} scoreColor={scoreColor} />
          <span style={{
            fontSize: 10, fontWeight: 600, color: scoreColor,
            letterSpacing: "0.04em",
          }}>
            {perfScore >= 75 ? "Excellent" : perfScore >= 50 ? "Moyen" : "À optimiser"}
          </span>
        </div>
      </div>

      {/* ── Bouton optimisation 1 clic ── */}
      <button
        onClick={handleBigBoost}
        disabled={optimizing}
        style={{
          width: "100%", padding: "10px 18px", borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: optimizing ? "rgba(56,189,248,0.06)" : "rgba(56,189,248,0.09)",
          border: `1px solid ${optimizing ? "rgba(56,189,248,0.15)" : "rgba(56,189,248,0.25)"}`,
          cursor: optimizing ? "not-allowed" : "pointer",
          transition: "all 0.15s", flexShrink: 0,
        }}
        onMouseEnter={e => { if (!optimizing) { e.currentTarget.style.background = "rgba(56,189,248,0.15)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.4)"; }}}
        onMouseLeave={e => { e.currentTarget.style.background = optimizing ? "rgba(56,189,248,0.06)" : "rgba(56,189,248,0.09)"; e.currentTarget.style.borderColor = optimizing ? "rgba(56,189,248,0.15)" : "rgba(56,189,248,0.25)"; }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: optimizing ? "#4b5563" : "#f1f5f9" }}>
            {optimizing ? "Optimisation en cours..." : "Optimiser en 1 clic"}
          </div>
          <div style={{ fontSize: 10, color: "#4b5563", marginTop: 3 }}>
            {optimizing
              ? "Application des tweaks Windows..."
              : `${TWEAKS.length} optimisations Windows · Plan haute perf · Priorité CPU · Game Mode`}
          </div>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: optimizing ? "rgba(56,189,248,0.08)" : "rgba(56,189,248,0.15)",
          border: "1px solid rgba(56,189,248,0.2)",
        }}>
          {optimizing
            ? <div className="animate-spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(56,189,248,0.2)", borderTopColor: "#38bdf8" }} />
            : <Zap size={16} style={{ color: "#38bdf8" }} />}
        </div>
      </button>

      {/* ── 3 cartes de statistiques ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
        flexShrink: 0,
      }}>
        <StatCard
          value={activeCount}
          label="Optimisations actives"
          buttonLabel="OPTIMISATIONS"
          onClick={() => setActiveTab("performance")}
          color="#38bdf8"
        />
        <StatCard
          value={stats.cpu}
          label="% CPU utilisé"
          buttonLabel="PERFORMANCES"
          onClick={() => setActiveTab("performance")}
          color={cpuColor}
          unit="%"
        />
        <StatCard
          value={stats.ram}
          label="% RAM utilisée"
          buttonLabel="SYSTÈME"
          onClick={() => setActiveTab("system")}
          color="#818cf8"
          unit="%"
        />
      </div>

      {/* ── UTILISATION SYSTÈME ── */}
      <div style={{
        background: "#0c0c1a",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: "29px 33px",
        display: "flex", flexDirection: "column", gap: 8,
        flexShrink: 0,
      }}>
        {/* Header + légende */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: 9, fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase", color: "#4b5563",
          }}>
            UTILISATION SYSTÈME
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            {([["RAM", "#818cf8"], ["CPU", "#38bdf8"], ["GPU", "#a78bfa"]] as const).map(([label, color]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 2, background: color, borderRadius: 1 }} />
                <span style={{ fontSize: 9, color: "#4b5563" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Graphique */}
        <div style={{ height: 220 }}>
          <MultiLineChart
            cpuData={history.cpu}
            ramData={history.ram}
            gpuData={gpuHistory}
          />
        </div>

        {/* Valeurs actuelles */}
        <div style={{
          display: "flex", gap: 16, flexShrink: 0,
          borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 8,
        }}>
          {[
            { label: "CPU",  value: stats.cpu,  color: "#38bdf8", unit: "%" },
            { label: "RAM",  value: stats.ram,  color: "#818cf8", unit: "%" },
            { label: "TEMP", value: stats.temp, color: "#fb923c", unit: "°C" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: "#374151", fontWeight: 600 }}>{s.label}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                color: s.color,
              }}>
                {s.value > 0 ? `${s.value}${s.unit}` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Raccourcis rapides ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8,
        flexShrink: 0, paddingBottom: 2,
      }}>
        {shortcuts.map(({ icon, label, color, onClick, active }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              padding: "16px 10px",
              background: active ? `${color}14` : "rgba(255,255,255,0.03)",
              border: active ? `1px solid ${color}40` : "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${color}12`;
              e.currentTarget.style.borderColor = `${color}35`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = active ? `${color}14` : "rgba(255,255,255,0.03)";
              e.currentTarget.style.borderColor = active ? `${color}40` : "rgba(255,255,255,0.06)";
            }}
          >
            <span style={{ color: active ? color : "#4b5563", transition: "color 0.15s" }}>
              {icon}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
              textTransform: "uppercase", color: "#374151",
            }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
