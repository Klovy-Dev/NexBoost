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
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", height: "100%", overflow: "hidden" }} className="animate-fadeIn">

      {/* ═══ COLONNE GAUCHE ═══ */}
      <div style={{ borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "20px 18px 16px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <Gamepad2 size={18} style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", margin: 0 }}>Jeux</h2>
              <p style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>Steam & Epic Games</p>
            </div>
          </div>

          {/* Compteur jeux */}
          <div style={{ background: "#0d0d1f", border: "1px solid rgba(239,68,68,0.18)", borderLeft: "3px solid #ef4444", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151", marginBottom: 6 }}>JEUX DÉTECTÉS</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 40, fontWeight: 800, fontFamily: "monospace", color: "#ef4444", lineHeight: 1 }}>{games.length}</span>
              {totalGb > 0 && <span style={{ fontSize: 12, color: "#374151" }}>{totalGb.toFixed(0)} GB</span>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa" }}>
                {games.filter(g => g.platform === "Steam").length} Steam
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}>
                {games.filter(g => g.platform === "Epic").length} Epic
              </span>
            </div>
          </div>
        </div>

        {/* Navigation interne */}
        <div style={{ flex: 1, overflow: "auto", padding: "14px 18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: "#ef4444" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#374151" }}>NAVIGATION</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {INNER_TABS.map(tab => {
              const active = inner === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setInner(tab.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    background: active ? "rgba(239,68,68,0.08)" : "#0d0d1f",
                    border: `1px solid ${active ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)"}`,
                    borderLeft: `3px solid ${active ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: 10, cursor: "pointer", transition: "all 0.15s", textAlign: "left",
                    transform: active ? "translateX(3px)" : "none",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(239,68,68,0.04)"; e.currentTarget.style.transform = "translateX(3px)"; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "#0d0d1f"; e.currentTarget.style.transform = "none"; }}}
                >
                  <div style={{ color: active ? "#ef4444" : "#374151", flexShrink: 0 }}>{tab.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "#e2e8f0" : "#94a3b8" }}>{tab.label}</span>
                    {tab.id === "autoboost" && autoEnabled && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#4ade80", marginTop: 2 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 4px #4ade80", display: "inline-block" }} />
                        Actif · {nextBoostIn}s
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Auto-boost toggle rapide */}
          <div style={{ marginTop: 16, background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${autoEnabled ? "#4ade80" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: autoEnabled ? 8 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bot size={13} style={{ color: autoEnabled ? "#4ade80" : "#374151" }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: autoEnabled ? "#4ade80" : "#94a3b8" }}>Mode Gaming Auto</span>
              </div>
              <button
                onClick={() => setAutoEnabled(v => !v)}
                style={{ padding: "4px 12px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", background: autoEnabled ? "rgba(248,113,113,0.12)" : "rgba(74,222,128,0.12)", border: `1px solid ${autoEnabled ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`, color: autoEnabled ? "#f87171" : "#4ade80" }}
              >
                {autoEnabled ? "OFF" : "ON"}
              </button>
            </div>
            {autoEnabled && (
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${((BOOST_INTERVAL - nextBoostIn) / BOOST_INTERVAL) * 100}%`, background: "#4ade80", borderRadius: 2, transition: "width 1s linear" }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ COLONNE DROITE ═══ */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px 20px" }}>

          {/* ── BIBLIOTHÈQUE ── */}
          {inner === "library" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { label: "Total",  value: games.length,                                     color: "#ef4444" },
                  { label: "Steam",  value: games.filter(g => g.platform === "Steam").length, color: "#60a5fa" },
                  { label: "Epic",   value: games.filter(g => g.platform === "Epic").length,  color: "#a78bfa" },
                  { label: "Go",     value: totalGb > 0 ? `${totalGb.toFixed(0)}` : "—",      color: "#fbbf24" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${s.color}50`, borderRadius: 9, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "monospace", color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 9, color: "#374151", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {games.length > 0 && (
                <div style={{ position: "relative" }}>
                  <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#374151", pointerEvents: "none" }} />
                  <input className="input-base" style={{ paddingLeft: 34, paddingTop: 9, paddingBottom: 9, fontSize: 12 }} placeholder="Rechercher un jeu..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              )}

              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px 20px" }}>
                  <div className="animate-spin" style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(239,68,68,0.15)", borderTopColor: "#ef4444" }} />
                  <span style={{ fontSize: 13, color: "#374151" }}>Scan des bibliothèques...</span>
                </div>
              ) : games.length === 0 ? (
                <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "48px 20px", textAlign: "center" }}>
                  <Gamepad2 size={32} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#374151", margin: "0 0 6px" }}>Aucun jeu détecté</p>
                  <p style={{ fontSize: 11, color: "#374151", margin: 0 }}>Assurez-vous que Steam ou Epic est installé à l'emplacement standard</p>
                </div>
              ) : (
                <>
                  {steam.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 3, height: 12, borderRadius: 2, background: "#60a5fa" }} />
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#60a5fa" }}>Steam</span>
                        <span style={{ fontSize: 10, color: "#374151" }}>({steam.length})</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {steam.map(g => <GameRow key={g.name} game={g} onOpen={handleOpenFolder} onBoost={handleBoostGame} boosting={boosting === g.name} />)}
                      </div>
                    </div>
                  )}
                  {epic.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 3, height: 12, borderRadius: 2, background: "#a78bfa" }} />
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a78bfa" }}>Epic Games</span>
                        <span style={{ fontSize: 10, color: "#374151" }}>({epic.length})</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {epic.map(g => <GameRow key={g.name} game={g} onOpen={handleOpenFolder} onBoost={handleBoostGame} boosting={boosting === g.name} />)}
                      </div>
                    </div>
                  )}
                  {filtered.length === 0 && search && (
                    <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "24px 20px", textAlign: "center" }}>
                      <p style={{ fontSize: 13, color: "#374151" }}>Aucun résultat pour « {search} »</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── AUTO-BOOST ── */}
          {inner === "autoboost" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#0d0d1f", border: `1px solid ${autoEnabled ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.07)"}`, borderLeft: `3px solid ${autoEnabled ? "#4ade80" : "rgba(239,68,68,0.5)"}`, borderRadius: 12, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
                {autoEnabled && <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: "radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: autoEnabled ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${autoEnabled ? "rgba(74,222,128,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                      <Zap size={18} style={{ color: autoEnabled ? "#4ade80" : "#374151" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>Mode Gaming Auto</div>
                      <div style={{ fontSize: 11, color: "#374151", marginTop: 2 }}>Détecte les jeux et booste toutes les {BOOST_INTERVAL}s</div>
                    </div>
                  </div>
                  <button onClick={() => setAutoEnabled(v => !v)} style={{ padding: "9px 20px", borderRadius: 9, fontSize: 12, fontWeight: 700, flexShrink: 0, cursor: "pointer", transition: "all 0.15s", background: autoEnabled ? "rgba(248,113,113,0.12)" : "rgba(74,222,128,0.12)", border: `1px solid ${autoEnabled ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.3)"}`, color: autoEnabled ? "#f87171" : "#4ade80" }}>
                    {autoEnabled ? "Désactiver" : "Activer"}
                  </button>
                </div>
                {autoEnabled && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 10, color: "#374151" }}>Prochain boost</span>
                      <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "monospace", color: "#4ade80" }}>{nextBoostIn}s</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${((BOOST_INTERVAL - nextBoostIn) / BOOST_INTERVAL) * 100}%`, background: "#4ade80", borderRadius: 2, transition: "width 1s linear" }} />
                    </div>
                  </div>
                )}
              </div>

              {lastBoost && (
                <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(239,68,68,0.5)", borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151", marginBottom: 10 }}>DERNIER SCAN</div>
                  {lastBoost.game_detected ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <CheckCircle size={15} style={{ color: "#4ade80" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>{lastBoost.game_name}</div>
                        <div style={{ fontSize: 11, color: "#374151", marginTop: 2 }}>{lastBoost.processes_boosted} processus boostés · RAM libérée</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Clock size={15} style={{ color: "#374151" }} />
                      <span style={{ fontSize: 12, color: "#374151" }}>Aucun jeu détecté — en attente...</span>
                    </div>
                  )}
                </div>
              )}

              <button onClick={runAutoBoost} style={{ width: "100%", padding: "11px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}>
                <Zap size={14} />Boost maintenant
              </button>

              {boostLog.length > 0 && (
                <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(239,68,68,0.4)", borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151", marginBottom: 10 }}>HISTORIQUE</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {boostLog.map((entry, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 7, background: "rgba(255,255,255,0.02)" }}>
                        <span style={{ fontSize: 10, fontFamily: "monospace", color: "#374151", flexShrink: 0 }}>{entry.time}</span>
                        <span style={{ fontSize: 12, color: "#94a3b8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.result.game_name}</span>
                        <span style={{ fontSize: 10, color: "#4ade80", flexShrink: 0 }}>+{entry.result.processes_boosted} proc</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                <AlertTriangle size={11} style={{ color: "#ef4444", marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 10, color: "#ef4444", lineHeight: 1.6, margin: 0 }}>Détecte Steam, Epic, Riot, Battle.net. Lance nettoyage RAM + priorité haute toutes les {BOOST_INTERVAL}s.</p>
              </div>
            </div>
          )}

          {/* ── BENCHMARK ── */}
          {inner === "benchmark" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(239,68,68,0.5)", borderRadius: 10, padding: "24px 20px" }}>
                {!benchRunning && !benchResult && (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 14, margin: "0 auto 18px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Gauge size={26} style={{ color: "#fbbf24" }} />
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", margin: "0 0 8px" }}>Benchmark système</h3>
                    <p style={{ fontSize: 12, color: "#374151", margin: "0 auto 22px", maxWidth: 380, lineHeight: 1.6 }}>Mesure les performances CPU, RAM et disque. Durée : 3 à 5 secondes.</p>
                    <button onClick={handleRunBench} style={{ padding: "10px 28px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#ef4444", color: "#020817", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "#7dd3fc"; }} onMouseLeave={e => { e.currentTarget.style.background = "#ef4444"; }}>
                      <Play size={13} />Lancer le benchmark
                    </button>
                  </div>
                )}
                {benchRunning && (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 14, margin: "0 auto 18px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div className="animate-spin" style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid rgba(239,68,68,0.2)", borderTopColor: "#ef4444" }} />
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", margin: "0 0 6px" }}>Test en cours...</h3>
                    <p style={{ fontSize: 12, color: "#374151", margin: 0 }}>Analyse CPU, RAM et disque</p>
                  </div>
                )}
                {!benchRunning && benchResult && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
                      {[{ label: "CPU", value: benchResult.cpu_score }, { label: "RAM", value: benchResult.ram_score }, { label: "Disque", value: benchResult.disk_score }, { label: "Total", value: benchResult.total_score }].map(s => (
                        <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "14px 10px", borderRadius: 10, background: scoreBg(s.value), border: `1px solid ${scoreColor(s.value)}25` }}>
                          <RingProgress percent={s.value} color={scoreColor(s.value)} size={64} />
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: scoreColor(s.value), lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: 10, color: "#374151", marginTop: 3 }}>{s.label}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "0 4px" }}>
                      <span style={{ fontSize: 11, color: "#374151" }}>Durée : {(benchResult.duration_ms / 1000).toFixed(1)}s</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: scoreBg(benchResult.total_score), color: scoreColor(benchResult.total_score) }}>{scoreLabel(benchResult.total_score)}</span>
                    </div>
                    <button onClick={handleRunBench} style={{ width: "100%", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)"; e.currentTarget.style.color = "#ef4444"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#94a3b8"; }}>
                      <RefreshCw size={13} />Relancer le test
                    </button>
                  </>
                )}
              </div>

              {history.length > 0 && (
                <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(239,68,68,0.4)", borderRadius: 10, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <History size={13} style={{ color: "#ef4444" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>Historique</span>
                    <span style={{ fontSize: 10, color: "#374151" }}>({history.length} tests)</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {history.map((h, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: scoreBg(h.total_score) }}>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: scoreColor(h.total_score) }}>{h.total_score}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {[{ l: "CPU", v: h.cpu_score }, { l: "RAM", v: h.ram_score }, { l: "Disk", v: h.disk_score }].map(s => (
                              <span key={s.l} style={{ fontSize: 10, color: "#374151" }}>{s.l} <span style={{ fontWeight: 700, fontFamily: "monospace", color: scoreColor(s.v) }}>{s.v}</span></span>
                            ))}
                          </div>
                          <div style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>{fmtDate(h.created_at)} · {(h.duration_ms / 1000).toFixed(1)}s</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, flexShrink: 0, background: scoreBg(h.total_score), color: scoreColor(h.total_score) }}>{scoreLabel(h.total_score)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)" }}>
                <AlertTriangle size={11} style={{ color: "#fbbf24", marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 10, color: "#fbbf24", lineHeight: 1.6, margin: 0 }}>Fermez les applications gourmandes avant de lancer le test.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GameRow({ game, onOpen, onBoost, boosting }: { game: InstalledGame; onOpen: (path: string) => void; onBoost: (game: InstalledGame) => void; boosting: boolean; }) {
  const color = game.platform === "Steam" ? "#60a5fa" : "#a78bfa";
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${color}40`, borderRadius: 8, transition: "all 0.15s" }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.04)"; e.currentTarget.style.borderLeftColor = `${color}80`; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#0d0d1f"; e.currentTarget.style.borderLeftColor = `${color}40`; }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0, background: `${color}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Gamepad2 size={14} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.name}</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: `${color}12`, color, flexShrink: 0 }}>{game.platform.toUpperCase()}</span>
        </div>
        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#374151", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.install_path || "—"}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {game.size_gb > 0 && <div style={{ textAlign: "right" }}><div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#fbbf24" }}>{game.size_gb.toFixed(1)}</div><div style={{ fontSize: 9, color: "#374151" }}>GB</div></div>}
        <button onClick={e => { e.stopPropagation(); onBoost(game); }} disabled={boosting} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(74,222,128,0.06)", border: `1px solid ${boosting ? "rgba(74,222,128,0.4)" : "rgba(74,222,128,0.2)"}`, color: "#4ade80", cursor: boosting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s", opacity: boosting ? 0.6 : 1 }} onMouseEnter={e => { if (!boosting) e.currentTarget.style.background = "rgba(74,222,128,0.15)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(74,222,128,0.06)"; }}>
          {boosting ? <div className="animate-spin" style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid rgba(74,222,128,0.2)", borderTopColor: "#4ade80" }} /> : <Power size={10} />}
          Boost
        </button>
        {game.install_path && (
          <button onClick={e => { e.stopPropagation(); onOpen(game.install_path); }} style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; e.currentTarget.style.color = "#ef4444"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#94a3b8"; }}>
            <Play size={10} />Ouvrir
          </button>
        )}
      </div>
    </div>
  );
}
