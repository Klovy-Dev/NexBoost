import { useState, useCallback } from "react";
import { Crown, CheckCircle, Bell, Monitor as MonitorIcon, Power, RefreshCw, AlertTriangle, CheckCircle as Check, XCircle, Copy, LogOut } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { activatePremiumKey } from "../lib/db";
import type { SystemStats, SystemInfo, StartupProgram } from "../types";
import type { UserData } from "../App";
import { TWEAKS } from "../lib/constants";

type InnerTab = "startup" | "settings";

interface Props {
  user:               UserData;
  activeCount:        number;
  perfScore:          number;
  stats:              SystemStats;
  info:               SystemInfo | null;
  onLogout:           () => void;
  onPremiumActivated: () => void;
}

const innerTabStyle = (active: boolean): React.CSSProperties => ({
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: active ? 600 : 500,
  color: active ? "#38bdf8" : "#4b5563",
  background: "transparent",
  border: "none",
  borderRadius: 0,
  outline: "none",
  cursor: "pointer",
  borderBottom: `2px solid ${active ? "#38bdf8" : "transparent"}`,
  marginBottom: "-1px",
  transition: "color 0.15s",
});

export default function SystemTab({
  user, activeCount, perfScore, stats, info, onLogout, onPremiumActivated,
}: Props) {
  const [inner, setInner] = useState<InnerTab>("startup");

  const [programs, setPrograms] = useState<StartupProgram[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const [keyInput,   setKeyInput]   = useState("");
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError,   setKeyError]   = useState("");
  const [keySuccess, setKeySuccess] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [thresholds, setThresholds] = useState<{ cpu: number; ram: number; temp: number }>(() => {
    try { return JSON.parse(localStorage.getItem("nexboost_thresholds") || "{}"); }
    catch { return {}; }
  });

  const cpuThr  = thresholds.cpu  ?? 90;
  const ramThr  = thresholds.ram  ?? 90;
  const tempThr = thresholds.temp ?? 85;

  const saveThreshold = useCallback((key: "cpu" | "ram" | "temp", val: number) => {
    const updated = { ...thresholds, [key]: val };
    setThresholds(updated);
    localStorage.setItem("nexboost_thresholds", JSON.stringify(updated));
  }, [thresholds]);

  const loadPrograms = async () => {
    setLoading(true);
    try { setPrograms(await invoke<StartupProgram[]>("get_startup_programs")); }
    catch { setPrograms([]); }
    finally { setLoading(false); }
  };

  const handleToggle = async (prog: StartupProgram) => {
    const key = `${prog.name}__${prog.location}`;
    setToggling(key);
    try {
      const ok = await invoke<boolean>("toggle_startup_program", {
        name: prog.name, location: prog.location, enable: !prog.enabled,
      });
      if (ok) setPrograms(p =>
        p.map(x => x.name === prog.name && x.location === prog.location
          ? { ...x, enabled: !x.enabled } : x)
      );
    } catch {}
    setToggling(null);
  };

  const handleActivateKey = async () => {
    const trimmed = keyInput.trim().toUpperCase();
    if (!trimmed) { setKeyError("Entrez une clé Premium."); return; }
    setKeyLoading(true); setKeyError("");
    try {
      const ok = await activatePremiumKey(user.id, trimmed);
      if (!ok) { setKeyError("Clé invalide ou déjà utilisée."); return; }
      setKeySuccess(true); onPremiumActivated();
    } catch { setKeyError("Erreur lors de l'activation."); }
    finally { setKeyLoading(false); }
  };

  const copySystemInfo = () => {
    const txt = [
      `NexBoost — Rapport système`,
      `─────────────────────────────`,
      `OS       : ${info?.os_name ?? "—"}`,
      `Machine  : ${info?.hostname ?? "—"}`,
      `CPU      : ${info?.cpu_brand ?? "—"}`,
      `Cœurs    : ${info?.cpu_cores ?? "—"} threads`,
      `RAM      : ${stats.ram_total_gb > 0 ? `${stats.ram_used_gb} / ${stats.ram_total_gb} GB` : "—"}`,
      `Disque   : ${stats.disk_total_gb > 0 ? `${stats.disk_used_gb} / ${stats.disk_total_gb} GB` : "—"}`,
      `Uptime   : ${info ? `${Math.floor(info.uptime_secs / 3600)}h` : "—"}`,
      `Score    : ${perfScore}/100`,
      `Tweaks   : ${activeCount}/${TWEAKS.length} actifs`,
    ].join("\n");
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  const enabled = programs.filter(p => p.enabled);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }} className="animate-fadeIn">

      {/* ── En-tête de page ── */}
      <div style={{ padding: "20px 22px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
          {/* Profil utilisateur */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: "#fff",
              background: user.premium
                ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                : "rgba(56,189,248,0.15)",
              border: `1px solid ${user.premium ? "rgba(168,85,247,0.4)" : "rgba(56,189,248,0.3)"}`,
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.2, margin: 0 }}>
                {user.username}
              </h1>
              <p style={{ fontSize: 11, color: "#4b5563", marginTop: 3, marginBottom: 0 }}>
                {user.email}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
                <Crown size={9} style={{ color: user.premium ? "#a78bfa" : "#38bdf8" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: user.premium ? "#a78bfa" : "#38bdf8" }}>
                  {user.premium ? "Plan Premium" : "Plan Gratuit"}
                </span>
              </div>
            </div>
          </div>

          {/* Score carte */}
          <div style={{
            background: "#0c0c1a",
            border: `1px solid ${user.premium ? "rgba(168,85,247,0.2)" : "rgba(56,189,248,0.2)"}`,
            borderRadius: 10, padding: "10px 16px",
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: 4, flexShrink: 0,
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4b5563" }}>
              SCORE
            </span>
            <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "monospace", color: perfScore >= 75 ? "#4ade80" : perfScore >= 50 ? "#fbbf24" : "#f87171", lineHeight: 1 }}>
              {perfScore}
            </span>
            <span style={{ fontSize: 9, color: "#4b5563" }}>/100</span>
          </div>
        </div>

        {/* Onglets internes */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => { setInner("startup"); if (programs.length === 0) loadPrograms(); }}
            style={innerTabStyle(inner === "startup")}
          >
            Démarrage
          </button>
          <button onClick={() => setInner("settings")} style={innerTabStyle(inner === "settings")}>
            Paramètres
          </button>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div style={{ flex: 1, overflow: inner === "settings" ? "auto" : "hidden" }}>
        <div style={{ padding: "16px 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ═══ DÉMARRAGE ═══ */}
          {inner === "startup" && (
            <>
              {/* Header stats */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, padding: "14px 18px",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>Programmes au démarrage</div>
                  <div style={{ fontSize: 11, color: "#4b5563", marginTop: 3 }}>
                    Activez ou désactivez les programmes lancés au démarrage de Windows
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "monospace", color: "#38bdf8", lineHeight: 1 }}>
                      {enabled.length}
                    </div>
                    <div style={{ fontSize: 9, color: "#4b5563", marginTop: 2 }}>actifs</div>
                  </div>
                  <button
                    onClick={loadPrograms}
                    disabled={loading}
                    style={{
                      padding: "7px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8",
                      cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1,
                      display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(56,189,248,0.06)"; e.currentTarget.style.borderColor = "rgba(56,189,248,0.25)"; e.currentTarget.style.color = "#38bdf8"; }}}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#94a3b8"; }}
                  >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    Actualiser
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "40px 20px" }}>
                  <div className="animate-spin" style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(56,189,248,0.15)", borderTopColor: "#38bdf8" }} />
                  <span style={{ fontSize: 13, color: "#4b5563" }}>Lecture du registre Windows...</span>
                </div>
              ) : programs.length === 0 ? (
                <div style={{
                  background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10, padding: "40px 20px", textAlign: "center",
                }}>
                  <Power size={28} style={{ color: "rgba(255,255,255,0.1)", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#4b5563", margin: "0 0 5px" }}>Aucun programme détecté</p>
                  <p style={{ fontSize: 11, color: "#374151", margin: 0 }}>
                    Cliquez sur Actualiser ou vérifiez les droits administrateur
                  </p>
                </div>
              ) : (
                <div style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                  {programs.map((prog, i) => {
                    const key    = `${prog.name}__${prog.location}`;
                    const isLoad = toggling === key;
                    const short  = prog.command.length > 64 ? prog.command.slice(0, 62) + "…" : prog.command;
                    return (
                      <div
                        key={key}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "12px 16px", transition: "background 0.12s",
                          borderBottom: i < programs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          background: prog.enabled ? "rgba(56,189,248,0.06)" : "transparent",
                          opacity: isLoad ? 0.6 : 1,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = prog.enabled ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.03)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = prog.enabled ? "rgba(56,189,248,0.06)" : "transparent"; }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 7, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: prog.enabled ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.05)",
                          }}>
                            {prog.enabled
                              ? <Check size={14} style={{ color: "#38bdf8" }} />
                              : <XCircle size={14} style={{ color: "#4b5563" }} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: prog.enabled ? "#f1f5f9" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {prog.name}
                            </div>
                            <div style={{ fontSize: 10, fontFamily: "monospace", color: "#374151", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {short || "—"}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                            background: prog.location === "HKCU" ? "rgba(56,189,248,0.12)" : "rgba(124,58,237,0.12)",
                            color: prog.location === "HKCU" ? "#38bdf8" : "#a78bfa",
                          }}>
                            {prog.location}
                          </span>
                          {isLoad ? (
                            <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(56,189,248,0.15)", borderTopColor: "#38bdf8" }} />
                          ) : (
                            <button
                              onClick={() => handleToggle(prog)}
                              style={{
                                fontSize: 11, padding: "5px 10px", borderRadius: 7, fontWeight: 600,
                                cursor: "pointer", transition: "all 0.15s",
                                background: prog.enabled ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)",
                                border: `1px solid ${prog.enabled ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.25)"}`,
                                color: prog.enabled ? "#f87171" : "#4ade80",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                            >
                              {prog.enabled ? "Désactiver" : "Activer"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 16px", borderRadius: 8,
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
              }}>
                <AlertTriangle size={12} style={{ color: "#fbbf24", marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: "#fbbf24", lineHeight: 1.6, margin: 0 }}>
                  La désactivation n'empêche pas l'utilisation du programme — il ne se lance simplement plus au démarrage.
                  Certaines entrées HKLM nécessitent des droits administrateur.
                </p>
              </div>
            </>
          )}

          {/* ═══ PARAMÈTRES ═══ */}
          {inner === "settings" && (
            <>
              {/* Stats systèmes */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { label: "Tweaks", value: `${activeCount}/${TWEAKS.length}`, color: "#38bdf8" },
                  { label: "Score",  value: `${perfScore}/100`,                 color: "#4ade80" },
                  { label: "CPU",    value: `${stats.cpu}%`,                    color: "#818cf8" },
                  { label: "RAM",    value: stats.ram_total_gb > 0 ? `${stats.ram_used_gb}G` : "—", color: "#fbbf24" },
                ].map(s => (
                  <div key={s.label} style={{
                    background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10, padding: "12px 14px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: s.color, lineHeight: 1 }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 9, color: "#4b5563", marginTop: 5 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Actions compte */}
              <div style={{
                background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, padding: "16px 18px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>Compte</div>
                  <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{user.email}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={copySystemInfo}
                    style={{
                      padding: "7px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(56,189,248,0.06)"; e.currentTarget.style.color = "#38bdf8"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#94a3b8"; }}
                  >
                    <Copy size={11} />{copied ? "Copié !" : "Copier les infos"}
                  </button>
                  <button
                    onClick={onLogout}
                    style={{
                      padding: "7px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                      background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.2)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(248,113,113,0.1)"; }}
                  >
                    <LogOut size={11} />Déconnecter
                  </button>
                </div>
              </div>

              {/* Seuils d'alerte */}
              <div style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <Bell size={13} style={{ color: "#f97316" }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4b5563" }}>
                    SEUILS D'ALERTE
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {([
                    { key: "cpu",  label: "CPU",         color: "#38bdf8", val: cpuThr,  min: 60, max: 99 },
                    { key: "ram",  label: "RAM",         color: "#818cf8", val: ramThr,  min: 60, max: 99 },
                    { key: "temp", label: "Température", color: "#f97316", val: tempThr, min: 50, max: 99 },
                  ] as const).map(s => (
                    <div key={s.key}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#94a3b8" }}>{s.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: s.color }}>
                          {s.val}{s.key === "temp" ? " °C" : " %"}
                        </span>
                      </div>
                      <input
                        type="range" min={s.min} max={s.max} value={s.val}
                        onChange={e => saveThreshold(s.key, Number(e.target.value))}
                        style={{ width: "100%", accentColor: s.color, cursor: "pointer" }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: "#4b5563" }}>{s.min}{s.key === "temp" ? "°C" : "%"}</span>
                        <span style={{ fontSize: 10, color: "#4b5563" }}>{s.max}{s.key === "temp" ? "°C" : "%"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overlay gaming */}
              <div style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <MonitorIcon size={13} style={{ color: "#38bdf8" }} />
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4b5563" }}>
                    MINI OVERLAY GAMING
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#f1f5f9" }}>Overlay toujours visible</div>
                    <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>
                      Fenêtre compacte affichée au-dessus de vos jeux
                    </div>
                  </div>
                  <button
                    onClick={() => invoke("open_overlay").catch(() => {})}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: "#38bdf8", color: "#020817", border: "none", cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#7dd3fc"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#38bdf8"; }}
                  >
                    Ouvrir
                  </button>
                </div>
              </div>

              {/* Premium */}
              <div style={{
                background: "#0c0c1a",
                border: `1px solid ${user.premium ? "rgba(124,58,237,0.3)" : "rgba(124,58,237,0.15)"}`,
                borderRadius: 10, padding: "16px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Crown size={16} style={{ color: "#a78bfa" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                      {user.premium ? "Premium actif" : "Passer en Premium"}
                      {user.premium && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>
                          ACTIF
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>
                      {user.premium ? "Toutes les fonctionnalités sont actives" : "Débloquez toutes les fonctionnalités"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", marginBottom: 14 }}>
                  {["Profils de jeu personnalisés", "Overlay amélioré", "Optimisations avancées", "Support prioritaire", "Historique illimité", "Détection auto des jeux"].map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <CheckCircle size={11} style={{ color: user.premium ? "#a78bfa" : "#4ade80", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#4b5563" }}>{f}</span>
                    </div>
                  ))}
                </div>

                {user.premium ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)", color: "#a78bfa",
                  }}>
                    <Crown size={13} />Premium activé — Merci !
                  </div>
                ) : keySuccess ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80",
                  }} className="animate-fadeIn">
                    <CheckCircle size={13} />Premium activé avec succès !
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="input-base"
                        style={{ padding: "8px 12px", fontSize: 12, letterSpacing: "0.06em" }}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={keyInput}
                        onChange={e => { setKeyInput(e.target.value.toUpperCase()); setKeyError(""); }}
                        onKeyDown={e => e.key === "Enter" && handleActivateKey()}
                      />
                      <button
                        onClick={handleActivateKey}
                        disabled={keyLoading}
                        style={{
                          padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, flexShrink: 0,
                          background: "linear-gradient(135deg, #7c3aed, #38bdf8)", color: "#fff", border: "none",
                          cursor: keyLoading ? "not-allowed" : "pointer",
                          display: "flex", alignItems: "center", gap: 7, transition: "opacity 0.15s",
                          opacity: keyLoading ? 0.6 : 1,
                        }}
                      >
                        {keyLoading
                          ? <div className="animate-spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff" }} />
                          : <><Crown size={12} />Activer</>}
                      </button>
                    </div>
                    {keyError && <p style={{ fontSize: 11, color: "#f87171", margin: 0 }} className="animate-fadeIn">{keyError}</p>}
                  </div>
                )}
              </div>

              {/* À propos */}
              <div style={{ background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px 18px" }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4b5563", display: "block", marginBottom: 12 }}>
                  À PROPOS DE NEXBOOST
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                  {[
                    { l: "Version",         v: "1.0.0 Alpha"        },
                    { l: "Plateforme",      v: "Windows 10/11"      },
                    { l: "Frontend",        v: "React + TypeScript" },
                    { l: "Backend",         v: "Tauri 2 (Rust)"     },
                    { l: "Stats système",   v: "sysinfo v0.32"      },
                    { l: "Base de données", v: "Turso (LibSQL)"     },
                  ].map(row => (
                    <div key={row.l} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}>
                      <span style={{ fontSize: 11, color: "#4b5563" }}>{row.l}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#94a3b8" }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: 4 }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
