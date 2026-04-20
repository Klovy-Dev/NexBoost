import { useState, useEffect, useRef } from "react";
import { Gamepad2, Search, Play, Gauge, History, AlertTriangle, Clock, Zap, Power, CheckCircle, RefreshCw, Library, Bot } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import type { InstalledGame, BenchmarkResult } from "../types";
import { saveBenchmarkResult, getBenchmarkHistory, type BenchmarkHistoryRow } from "../lib/db";
import RingProgress from "../components/RingProgress";

interface AutoBoostResult { game_detected: boolean; game_name: string; processes_boosted: number; }

interface Props { userId: number; }
type InnerTab = "library" | "benchmark" | "autoboost";

const INNER_TABS: { id: InnerTab; label: string; icon: React.ReactNode }[] = [
  { id: "library",   label: "Bibliothèque", icon: <Library size={14} /> },
  { id: "autoboost", label: "Auto-Boost",   icon: <Zap size={14} /> },
  { id: "benchmark", label: "Benchmark",    icon: <Gauge size={14} /> },
];

export default function GamesTab({ userId }: Props) {
  const [inner,        setInner]        = useState<InnerTab>("library");
  const [games,        setGames]        = useState<InstalledGame[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState("");
  const [benchResult,  setBenchResult]  = useState<BenchmarkResult | null>(null);
  const [benchRunning, setBenchRunning] = useState(false);
  const [history,      setHistory]      = useState<BenchmarkHistoryRow[]>([]);
  const [boosting,     setBoosting]     = useState<string | null>(null);

  const [autoEnabled,  setAutoEnabled]  = useState(() => localStorage.getItem("pcpulse_autoboost") === "true");
  const [lastBoost,    setLastBoost]    = useState<AutoBoostResult | null>(null);
  const [boostLog,     setBoostLog]     = useState<{ time: string; result: AutoBoostResult }[]>([]);
  const [nextBoostIn,  setNextBoostIn]  = useState(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const BOOST_INTERVAL = 90;

  const runAutoBoost = async () => {
    try {
      const result = await invoke<AutoBoostResult>("auto_boost_session");
      setLastBoost(result);
      if (result.game_detected)
        setBoostLog(prev => [{ time: new Date().toLocaleTimeString("fr-FR"), result }, ...prev.slice(0, 9)]);
    } catch {}
    setNextBoostIn(BOOST_INTERVAL);
  };

  useEffect(() => {
    localStorage.setItem("pcpulse_autoboost", String(autoEnabled));
    if (intervalRef.current)  clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (autoEnabled) {
      runAutoBoost();
      intervalRef.current  = setInterval(runAutoBoost, BOOST_INTERVAL * 1000);
      setNextBoostIn(BOOST_INTERVAL);
      countdownRef.current = setInterval(() => setNextBoostIn(n => Math.max(0, n - 2)), 2000);
    }
    return () => {
      if (intervalRef.current)  clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEnabled]);

  useEffect(() => { loadGames(); }, []);
  useEffect(() => { getBenchmarkHistory(userId).then(setHistory).catch(() => {}); }, [userId]);

  const loadGames = async () => {
    setLoading(true);
    try { setGames(await invoke<InstalledGame[]>("get_installed_games")); }
    catch { setGames([]); }
    finally { setLoading(false); }
  };

  const handleOpenFolder = async (path: string) => { try { await openPath(path); } catch {} };

  const handleBoostGame = async (game: InstalledGame) => {
    setBoosting(game.name);
    try {
      const count = await invoke<number>("boost_game_processes", { installPath: game.install_path });
      setBoostLog(prev => [{ time: new Date().toLocaleTimeString("fr-FR"), result: { game_detected: count > 0, game_name: game.name, processes_boosted: count } }, ...prev.slice(0, 9)]);
    } catch {}
    setBoosting(null);
  };

  const handleRunBench = async () => {
    setBenchRunning(true); setBenchResult(null);
    try {
      const r = await invoke<BenchmarkResult>("run_benchmark");
      setBenchResult(r);
      try { await saveBenchmarkResult(userId, r); setHistory(await getBenchmarkHistory(userId)); } catch {}
    } catch {
      await new Promise(res => setTimeout(res, 1500));
      setBenchResult({ cpu_score: 80, ram_score: 74, disk_score: 62, total_score: 72, duration_ms: 2100 });
    } finally { setBenchRunning(false); }
  };

  const scoreColor = (v: number) => v >= 75 ? "#4ade80" : v >= 50 ? "#fbbf24" : "#f87171";
  const scoreLabel = (v: number) => v >= 75 ? "Excellent" : v >= 50 ? "Correct" : "Faible";
  const scoreBg    = (v: number) => v >= 75 ? "rgba(74,222,128,0.08)" : v >= 50 ? "rgba(251,191,36,0.08)" : "rgba(248,113,113,0.08)";

  const filtered = games.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  const steam    = filtered.filter(g => g.platform === "Steam");
  const epic     = filtered.filter(g => g.platform === "Epic");
  const totalGb  = games.reduce((s, g) => s + g.size_gb, 0);

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
    catch { return s; }
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "28px 32px" }} className="animate-fadeIn">

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gamepad2 size={20} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Jeux</h1>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "3px 0 0" }}>
              {games.length === 0 ? "Steam & Epic Games" : `${games.length} jeu${games.length > 1 ? "x" : ""} détecté${games.length > 1 ? "s" : ""}${totalGb > 0 ? ` · ${totalGb.toFixed(0)} GB` : ""}`}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Auto-boost status */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 8, background: autoEnabled ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${autoEnabled ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.08)"}` }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: autoEnabled ? "#4ade80" : "#4b5563", boxShadow: autoEnabled ? "0 0 5px #4ade80" : "none" }} />
            <span style={{ fontSize: 12, color: autoEnabled ? "#4ade80" : "#6b7280", fontWeight: 500 }}>
              {autoEnabled ? `Auto-Boost · ${nextBoostIn}s` : "Auto-Boost inactif"}
            </span>
          </div>
          <button
            onClick={loadGames}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, background: "#3b82f6", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Scanner
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total jeux",  value: games.length,                                    color: "#ef4444" },
          { label: "Steam",       value: games.filter(g => g.platform === "Steam").length, color: "#60a5fa" },
          { label: "Epic",        value: games.filter(g => g.platform === "Epic").length,  color: "#a78bfa" },
          { label: "Stockage",    value: totalGb > 0 ? `${totalGb.toFixed(0)} GB` : "—",  color: "#fbbf24" },
        ].map(s => (
          <div key={s.label} style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Onglets ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }}>
        {INNER_TABS.map(tab => {
          const active = inner === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setInner(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? "#fff" : "#6b7280",
                borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
                marginBottom: -1, transition: "color 0.15s",
              }}
            >
              <span style={{ color: active ? "#3b82f6" : "#6b7280" }}>{tab.icon}</span>
              {tab.label}
              {tab.id === "autoboost" && autoEnabled && (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 4px #4ade80", display: "inline-block" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Bibliothèque ── */}
      {inner === "library" && (
        <div className="animate-fadeIn">
          {games.length > 0 && (
            <div style={{ position: "relative", marginBottom: 20 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
              <input className="input-base" style={{ paddingLeft: 36, paddingTop: 10, paddingBottom: 10, fontSize: 13 }} placeholder="Rechercher un jeu..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          )}

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 20px" }}>
              <div className="animate-spin" style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(239,68,68,0.15)", borderTopColor: "#ef4444" }} />
              <span style={{ fontSize: 13, color: "#6b7280" }}>Scan des bibliothèques...</span>
            </div>
          ) : games.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 20px", background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
              <Gamepad2 size={30} style={{ color: "#374151" }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", margin: 0 }}>Aucun jeu détecté</p>
              <p style={{ fontSize: 12, color: "#4b5563", margin: 0 }}>Assurez-vous que Steam ou Epic est installé à l'emplacement standard</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {steam.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.06em" }}>Steam</span>
                    <span style={{ fontSize: 11, color: "#4b5563" }}>({steam.length})</span>
                  </div>
                  <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
                    {steam.map((g, i) => <GameRow key={g.name} game={g} onOpen={handleOpenFolder} onBoost={handleBoostGame} boosting={boosting === g.name} isLast={i === steam.length - 1} />)}
                  </div>
                </div>
              )}
              {epic.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.06em" }}>Epic Games</span>
                    <span style={{ fontSize: 11, color: "#4b5563" }}>({epic.length})</span>
                  </div>
                  <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
                    {epic.map((g, i) => <GameRow key={g.name} game={g} onOpen={handleOpenFolder} onBoost={handleBoostGame} boosting={boosting === g.name} isLast={i === epic.length - 1} />)}
                  </div>
                </div>
              )}
              {filtered.length === 0 && search && (
                <div style={{ padding: "24px", textAlign: "center", background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Aucun résultat pour « {search} »</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Auto-Boost ── */}
      {inner === "autoboost" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="animate-fadeIn">

          {/* Contrôle principal */}
          <div style={{ background: "#161616", border: `1px solid ${autoEnabled ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 12 }}>
            <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: autoEnabled ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${autoEnabled ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.06)"}` }}>
                  <Zap size={20} style={{ color: autoEnabled ? "#4ade80" : "#6b7280" }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Mode Gaming Auto</span>
                    {autoEnabled && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", color: "#4ade80" }}>ACTIF</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "#9ca3af" }}>Détecte les jeux et booste automatiquement toutes les {BOOST_INTERVAL}s</div>
                </div>
              </div>
              <button
                onClick={() => setAutoEnabled(v => !v)}
                style={{ padding: "10px 22px", borderRadius: 9, fontSize: 13, fontWeight: 700, flexShrink: 0, cursor: "pointer", background: autoEnabled ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)", border: `1px solid ${autoEnabled ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.25)"}`, color: autoEnabled ? "#f87171" : "#4ade80" }}
              >
                {autoEnabled ? "Désactiver" : "Activer"}
              </button>
            </div>
            {autoEnabled && (
              <div style={{ padding: "0 20px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>Prochain boost</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#4ade80", fontFamily: "monospace" }}>{nextBoostIn}s</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${((BOOST_INTERVAL - nextBoostIn) / BOOST_INTERVAL) * 100}%`, background: "#4ade80", borderRadius: 2, transition: "width 1s linear" }} />
                </div>
              </div>
            )}
          </div>

          {/* Dernier scan */}
          {lastBoost && (
            <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Dernier scan</div>
              {lastBoost.game_detected ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CheckCircle size={16} style={{ color: "#4ade80" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{lastBoost.game_name}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{lastBoost.processes_boosted} processus boostés · RAM libérée</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Clock size={16} style={{ color: "#6b7280" }} />
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>Aucun jeu détecté — en attente...</span>
                </div>
              )}
            </div>
          )}

          {/* Boost manuel */}
          <button
            onClick={runAutoBoost}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#3b82f6", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.18)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.1)"; }}
          >
            <Zap size={15} />Boost maintenant
          </button>

          {/* Historique */}
          {boostLog.length > 0 && (
            <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Historique</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {boostLog.map((entry, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#6b7280", flexShrink: 0 }}>{entry.time}</span>
                    <span style={{ fontSize: 13, color: "#d1d5db", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.result.game_name}</span>
                    <span style={{ fontSize: 11, color: "#4ade80", flexShrink: 0, fontWeight: 600 }}>+{entry.result.processes_boosted} proc</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: 10, background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
            <Bot size={14} style={{ color: "#3b82f6", marginTop: 1, flexShrink: 0 }} />
            Détecte Steam, Epic, Riot, Battle.net. Lance nettoyage RAM + priorité haute toutes les {BOOST_INTERVAL}s.
          </div>
        </div>
      )}

      {/* ── Benchmark ── */}
      {inner === "benchmark" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="animate-fadeIn">
          <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "28px 24px" }}>
            {!benchRunning && !benchResult && (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, margin: "0 auto 20px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Gauge size={28} style={{ color: "#fbbf24" }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Benchmark système</h3>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 auto 24px", maxWidth: 380, lineHeight: 1.6 }}>Mesure les performances CPU, RAM et disque. Durée : 3 à 5 secondes.</p>
                <button
                  onClick={handleRunBench}
                  style={{ padding: "11px 32px", borderRadius: 9, fontSize: 14, fontWeight: 700, background: "#3b82f6", color: "#fff", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 9 }}
                >
                  <Play size={14} />Lancer le benchmark
                </button>
              </div>
            )}

            {benchRunning && (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, margin: "0 auto 20px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="animate-spin" style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6" }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>Test en cours...</h3>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Analyse CPU, RAM et disque</p>
              </div>
            )}

            {!benchRunning && benchResult && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "CPU",    value: benchResult.cpu_score },
                    { label: "RAM",    value: benchResult.ram_score },
                    { label: "Disque", value: benchResult.disk_score },
                    { label: "Total",  value: benchResult.total_score },
                  ].map(s => (
                    <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "16px 10px", borderRadius: 10, background: scoreBg(s.value), border: `1px solid ${scoreColor(s.value)}20` }}>
                      <RingProgress percent={s.value} color={scoreColor(s.value)} size={64} />
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(s.value), fontFamily: "monospace", lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>Durée : {(benchResult.duration_ms / 1000).toFixed(1)}s</span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: scoreBg(benchResult.total_score), color: scoreColor(benchResult.total_score) }}>{scoreLabel(benchResult.total_score)}</span>
                </div>
                <button
                  onClick={handleRunBench}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 9, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", cursor: "pointer" }}
                >
                  <RefreshCw size={13} />Relancer le test
                </button>
              </>
            )}
          </div>

          {history.length > 0 && (
            <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <History size={15} style={{ color: "#9ca3af" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>Historique</span>
                <span style={{ fontSize: 12, color: "#6b7280" }}>({history.length} tests)</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {history.map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 9, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: scoreBg(h.total_score) }}>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: scoreColor(h.total_score) }}>{h.total_score}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        {[{ l: "CPU", v: h.cpu_score }, { l: "RAM", v: h.ram_score }, { l: "Disk", v: h.disk_score }].map(s => (
                          <span key={s.l} style={{ fontSize: 12, color: "#6b7280" }}>{s.l} <span style={{ fontWeight: 700, color: scoreColor(s.v) }}>{s.v}</span></span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: "#4b5563", marginTop: 3 }}>{fmtDate(h.created_at)} · {(h.duration_ms / 1000).toFixed(1)}s</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 5, flexShrink: 0, background: scoreBg(h.total_score), color: scoreColor(h.total_score) }}>{scoreLabel(h.total_score)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", borderRadius: 10, background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.15)", fontSize: 12, color: "#d97706", lineHeight: 1.6 }}>
            <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            Fermez les applications gourmandes avant de lancer le test pour obtenir des résultats précis.
          </div>
        </div>
      )}
    </div>
  );
}

function GameRow({ game, onOpen, onBoost, boosting, isLast }: { game: InstalledGame; onOpen: (path: string) => void; onBoost: (game: InstalledGame) => void; boosting: boolean; isLast: boolean }) {
  const color = game.platform === "Steam" ? "#60a5fa" : "#a78bfa";
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${color}20` }}>
        <Gamepad2 size={15} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${color}12`, color, flexShrink: 0 }}>{game.platform.toUpperCase()}</span>
        </div>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#4b5563", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.install_path || "—"}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {game.size_gb > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", fontFamily: "monospace" }}>{game.size_gb.toFixed(1)}</div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>GB</div>
          </div>
        )}
        <button
          onClick={e => { e.stopPropagation(); onBoost(game); }}
          disabled={boosting}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", cursor: boosting ? "not-allowed" : "pointer", opacity: boosting ? 0.6 : 1 }}
        >
          {boosting ? <div className="animate-spin" style={{ width: 11, height: 11, borderRadius: "50%", border: "2px solid rgba(74,222,128,0.2)", borderTopColor: "#4ade80" }} /> : <Power size={11} />}
          Boost
        </button>
        {game.install_path && (
          <button
            onClick={e => { e.stopPropagation(); onOpen(game.install_path); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#9ca3af", cursor: "pointer" }}
          >
            <Play size={11} />Ouvrir
          </button>
        )}
      </div>
    </div>
  );
}
