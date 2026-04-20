import { useState, useCallback, useEffect } from "react";
import { Crown, CheckCircle, Bell, Monitor as MonitorIcon, Power, RefreshCw, AlertTriangle, Copy, LogOut, Zap, Calendar, RotateCcw, HardDrive, Settings, Rocket, FlaskConical, ChevronDown, ChevronUp } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { activatePremiumKey } from "../lib/db";
import type { SystemStats, SystemInfo, StartupProgram } from "../types";
import type { UserData, PlanActivationData } from "../App";
import { TWEAKS } from "../lib/constants";
import PlanGate from "../components/PlanGate";

type InnerTab = "startup" | "settings";

interface Props {
  user:             UserData;
  activeCount:      number;
  perfScore:        number;
  stats:            SystemStats;
  info:             SystemInfo | null;
  onLogout:         () => void;
  onPlanActivated:  (d: PlanActivationData) => void;
}

const PRO_FEATURES = [
  "Overlay gaming in-game",
  "Profils de jeux illimités",
  "Optimisations avancées",
  "Support prioritaire",
  "Historique illimité",
  "Détection auto des jeux",
];

const CHECKOUT_URL_MONTHLY = "https://pcpulse.fr/pro/monthly";
const CHECKOUT_URL_ANNUAL  = "https://pcpulse.fr/pro/annual";

function formatExpiry(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(iso));
}
function daysRemaining(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function Toggle({ active, onClick, loading }: { active: boolean; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        width: 40, height: 22, borderRadius: 11, flexShrink: 0,
        background: active ? "#3b82f6" : "#1f2937",
        position: "relative", border: "none", cursor: loading ? "not-allowed" : "pointer",
        transition: "background 0.2s", opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff" }} className="animate-spin" />
      ) : (
        <div style={{
          position: "absolute", top: 3,
          left: active ? "calc(100% - 19px)" : 3,
          width: 16, height: 16, borderRadius: "50%",
          background: "#fff", transition: "left 0.18s",
        }} />
      )}
    </button>
  );
}

function getImpact(name: string, command: string): { label: string; color: string; bg: string; level: number } {
  const s = (name + " " + command).toLowerCase();
  const HIGH = ["chrome","firefox","edge","brave","opera","discord","steam","epicgames","ubisoft","battlenet","antivirus","defender","update","onedrive","googledrive","dropbox","teams","skype","zoom","slack","spotify","itunes","adobe","obs","geforce","radeon","amd","nvidia","corsair","logitech","razer"];
  const MED  = ["sync","agent","helper","notification","panel","tray","launcher","daemon","service","manager","hub","assistant"];
  if (HIGH.some(k => s.includes(k))) return { label: "Élevé",  color: "#f87171", bg: "rgba(248,113,113,0.12)", level: 3 };
  if (MED.some(k => s.includes(k)))  return { label: "Moyen",  color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  level: 2 };
  return                                     { label: "Faible", color: "#4ade80", bg: "rgba(74,222,128,0.10)", level: 1 };
}

const INNER_TABS: { id: InnerTab; label: string; icon: React.ReactNode }[] = [
  { id: "startup",  label: "Applications au démarrage", icon: <Rocket size={14} /> },
  { id: "settings", label: "Paramètres",                icon: <Settings size={14} /> },
];

export default function SystemTab({ user, activeCount, perfScore, stats, info, onLogout, onPlanActivated }: Props) {
  const isPro = user.plan === "pro";
  const [inner,       setInner]      = useState<InnerTab>("startup");
  const [appVersion,  setAppVersion] = useState("...");

  useEffect(() => { getVersion().then(setAppVersion).catch(() => setAppVersion("0.2.0")); }, []);

  const [programs, setPrograms] = useState<StartupProgram[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const [betaMode,   setBetaMode]   = useState(() => localStorage.getItem("pcpulse_beta") === "true");
  const [vmInfo,     setVmInfo]     = useState<{ ram_total_gb: number; is_auto: boolean; min_mb: number; max_mb: number } | null>(null);
  const [vmLoading,  setVmLoading]  = useState(false);
  const [vmResult,   setVmResult]   = useState<string | null>(null);
  const [keyInput,   setKeyInput]   = useState("");
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError,   setKeyError]   = useState("");
  const [keySuccess, setKeySuccess] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [showProDetails, setShowProDetails] = useState(false);
  const [thresholds, setThresholds] = useState<{ cpu: number; ram: number; temp: number }>(() => {
    try { return JSON.parse(localStorage.getItem("pcpulse_thresholds") || "{}"); }
    catch { return {}; }
  });

  const cpuThr  = thresholds.cpu  ?? 90;
  const ramThr  = thresholds.ram  ?? 90;
  const tempThr = thresholds.temp ?? 85;

  const saveThreshold = useCallback((key: "cpu" | "ram" | "temp", val: number) => {
    const updated = { ...thresholds, [key]: val };
    setThresholds(updated);
    localStorage.setItem("pcpulse_thresholds", JSON.stringify(updated));
  }, [thresholds]);

  const loadVmInfo = async () => {
    try { setVmInfo(await invoke<{ ram_total_gb: number; is_auto: boolean; min_mb: number; max_mb: number }>("get_virtual_memory_info")); } catch {}
  };

  const handleSetVm = async (optimize: boolean) => {
    setVmLoading(true); setVmResult(null);
    try {
      const ok = await invoke<boolean>("set_virtual_memory", { optimize });
      setVmResult(ok ? (optimize ? "Optimisé — redémarrage requis" : "Restauré — redémarrage requis") : "Erreur");
      await loadVmInfo();
    } catch { setVmResult("Erreur"); }
    finally { setVmLoading(false); setTimeout(() => setVmResult(null), 4000); }
  };

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
      const ok = await invoke<boolean>("toggle_startup_program", { name: prog.name, location: prog.location, enable: !prog.enabled });
      if (ok) setPrograms(p => p.map(x => x.name === prog.name && x.location === prog.location ? { ...x, enabled: !x.enabled } : x));
    } catch {}
    setToggling(null);
  };

  const handleActivateKey = async () => {
    const trimmed = keyInput.trim().toUpperCase();
    if (!trimmed) { setKeyError("Entrez une clé d'accès Pro."); return; }
    setKeyLoading(true); setKeyError("");
    try {
      const result = await activatePremiumKey(user.id, trimmed);
      if (!result) { setKeyError("Clé invalide ou déjà utilisée."); return; }
      setKeySuccess(true);
      onPlanActivated(result);
    } catch { setKeyError("Erreur lors de l'activation."); }
    finally { setKeyLoading(false); }
  };

  const copySystemInfo = () => {
    const txt = [`PCPulse — Rapport système`, `─────────────────────────────`, `OS       : ${info?.os_name ?? "—"}`, `Machine  : ${info?.hostname ?? "—"}`, `CPU      : ${info?.cpu_brand ?? "—"}`, `Cœurs    : ${info?.cpu_cores ?? "—"} threads`, `RAM      : ${stats.ram_total_gb > 0 ? `${stats.ram_used_gb} / ${stats.ram_total_gb} GB` : "—"}`, `Disque   : ${stats.disk_total_gb > 0 ? `${stats.disk_used_gb} / ${stats.disk_total_gb} GB` : "—"}`, `Uptime   : ${info ? `${Math.floor(info.uptime_secs / 3600)}h` : "—"}`, `Score    : ${perfScore}/100`, `Tweaks   : ${activeCount}/${TWEAKS.length} actifs`].join("\n");
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {});
  };

  useEffect(() => { loadVmInfo(); }, []);

  const enabled   = programs.filter(p => p.enabled);
  const highCount = programs.filter(p => getImpact(p.name, p.command).level === 3 && p.enabled).length;

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "28px 32px" }} className="animate-fadeIn">

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Rocket size={20} style={{ color: "#3b82f6" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Booster</h1>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "3px 0 0" }}>
              {programs.length === 0 ? "Gérez le démarrage de Windows" : `${enabled.length} programme${enabled.length > 1 ? "s" : ""} actif${enabled.length > 1 ? "s" : ""} au démarrage`}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {highCount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", fontSize: 12, color: "#f87171" }}>
              <AlertTriangle size={13} />
              {highCount} impact élevé
            </div>
          )}
          <button
            onClick={() => { loadPrograms(); }}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, background: "#3b82f6", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "opacity 0.15s" }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }}>
        {INNER_TABS.map(tab => {
          const active = inner === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setInner(tab.id); if (tab.id === "startup" && programs.length === 0) loadPrograms(); }}
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
              {tab.id === "startup" && programs.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: active ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)", color: active ? "#3b82f6" : "#6b7280" }}>
                  {enabled.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Applications au démarrage ── */}
      {inner === "startup" && (
        <div className="animate-fadeIn">
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 20px" }}>
              <div className="animate-spin" style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(59,130,246,0.15)", borderTopColor: "#3b82f6" }} />
              <span style={{ fontSize: 13, color: "#6b7280" }}>Lecture du registre Windows...</span>
            </div>
          ) : programs.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 20px", background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
              <Power size={28} style={{ color: "#374151" }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: "#6b7280", margin: 0 }}>Aucun programme détecté</p>
              <p style={{ fontSize: 12, color: "#4b5563", margin: 0 }}>Cliquez sur Actualiser pour charger les programmes de démarrage</p>
            </div>
          ) : (
            <>
              {/* Résumé par impact */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Impact élevé",  color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)", count: programs.filter(p => getImpact(p.name, p.command).level === 3).length },
                  { label: "Impact moyen",  color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)",  count: programs.filter(p => getImpact(p.name, p.command).level === 2).length },
                  { label: "Impact faible", color: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.2)",  count: programs.filter(p => getImpact(p.name, p.command).level === 1).length },
                ].map(s => (
                  <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.count}</span>
                    <span style={{ fontSize: 12, color: s.color }}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Liste programmes */}
              <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
                {/* Header tableau */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 50px", gap: 12, padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Application</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Impact</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Source</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>État</span>
                </div>

                {programs.map((prog, i) => {
                  const key    = `${prog.name}__${prog.location}`;
                  const isLoad = toggling === key;
                  const imp    = getImpact(prog.name, prog.command);
                  const short  = prog.command.length > 55 ? prog.command.slice(0, 53) + "…" : prog.command;

                  return (
                    <div
                      key={key}
                      style={{
                        display: "grid", gridTemplateColumns: "1fr 80px 80px 50px",
                        gap: 12, padding: "14px 20px", alignItems: "center",
                        borderBottom: i < programs.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        background: prog.enabled ? "rgba(59,130,246,0.03)" : "transparent",
                        transition: "background 0.12s",
                        opacity: isLoad ? 0.7 : 1,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = prog.enabled ? "rgba(59,130,246,0.03)" : "transparent"; }}
                    >
                      {/* App info */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: prog.enabled ? "#fff" : "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {prog.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>
                          {short || "—"}
                        </div>
                      </div>

                      {/* Impact badge */}
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: imp.bg, color: imp.color }}>
                          {imp.label}
                        </span>
                      </div>

                      {/* Source badge */}
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 5, background: prog.location === "HKCU" ? "rgba(99,102,241,0.1)" : "rgba(124,58,237,0.1)", color: prog.location === "HKCU" ? "#818cf8" : "#a78bfa" }}>
                          {prog.location}
                        </span>
                      </div>

                      {/* Toggle */}
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <Toggle active={prog.enabled} loading={isLoad} onClick={() => handleToggle(prog)} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Avertissement */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", marginTop: 16, borderRadius: 10, background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
                <AlertTriangle size={13} style={{ color: "#fbbf24", marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: "#d97706", lineHeight: 1.6, margin: 0 }}>
                  La désactivation n'empêche pas l'utilisation — le programme ne se lance plus au démarrage. Certaines entrées HKLM nécessitent des droits administrateur.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Paramètres ── */}
      {inner === "settings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }} className="animate-fadeIn">

          {/* Compte */}
          <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Compte</span>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, background: isPro ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(59,130,246,0.12)", border: `1px solid ${isPro ? "rgba(168,85,247,0.4)" : "rgba(59,130,246,0.2)"}`, color: isPro ? "#fff" : "#3b82f6" }}>
                  {isPro ? <Crown size={16} /> : user.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{user.username}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{user.email}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={copySystemInfo} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }} onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }} onMouseLeave={e => { e.currentTarget.style.color = "#9ca3af"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
                  <Copy size={12} />{copied ? "Copié !" : "Rapport système"}
                </button>
                <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.15)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}>
                  <LogOut size={12} />Déconnecter
                </button>
              </div>
            </div>
          </div>

          {/* Infos système */}
          {info && (
            <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Système</span>
              </div>
              <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                {[
                  { label: "CPU",       value: info.cpu_brand?.split(" ").slice(0, 5).join(" ") ?? "—" },
                  { label: "Cœurs",     value: info.cpu_cores ? `${info.cpu_cores} threads` : "—" },
                  { label: "OS",        value: info.os_name ?? "—" },
                  { label: "Machine",   value: info.hostname ?? "—" },
                  { label: "Uptime",    value: info.uptime_secs ? `${Math.floor(info.uptime_secs / 3600)}h ${Math.floor((info.uptime_secs % 3600) / 60)}m` : "—" },
                  { label: "Version",   value: `PCPulse v${appVersion}` },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{r.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#d1d5db", wordBreak: "break-word" }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seuils d'alerte */}
          <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
              <Bell size={14} style={{ color: "#f97316" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Seuils d'alerte</span>
            </div>
            <div style={{ padding: "20px" }}>
              {([
                { key: "cpu",  label: "CPU",         unit: "%",  color: "#3b82f6", val: cpuThr,  min: 60, max: 99 },
                { key: "ram",  label: "RAM",         unit: "%",  color: "#8b5cf6", val: ramThr,  min: 60, max: 99 },
                { key: "temp", label: "Température", unit: "°C", color: "#f97316", val: tempThr, min: 50, max: 99 },
              ] as const).map((s, i) => (
                <div key={s.key} style={{ marginBottom: i < 2 ? 20 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: "#d1d5db", fontWeight: 500 }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.color, background: `${s.color}14`, padding: "2px 10px", borderRadius: 6, fontFamily: "monospace" }}>{s.val}{s.unit}</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} value={s.val} onChange={e => saveThreshold(s.key, Number(e.target.value))} style={{ width: "100%", accentColor: s.color, cursor: "pointer" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: "#4b5563" }}>{s.min}{s.unit}</span>
                    <span style={{ fontSize: 11, color: "#4b5563" }}>{s.max}{s.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mémoire Virtuelle */}
          <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
              <HardDrive size={14} style={{ color: "#fbbf24" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>Mémoire virtuelle</span>
            </div>
            <div style={{ padding: "16px 20px" }}>
              {vmInfo && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "10px 14px", marginBottom: 14, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div><span style={{ fontSize: 12, color: "#6b7280" }}>Mode : </span><span style={{ fontSize: 12, fontWeight: 600, color: vmInfo.is_auto ? "#3b82f6" : "#4ade80" }}>{vmInfo.is_auto ? "Géré par Windows" : "Taille fixe"}</span></div>
                  {!vmInfo.is_auto && vmInfo.max_mb > 0 && <div><span style={{ fontSize: 12, color: "#6b7280" }}>Taille : </span><span style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "monospace" }}>{vmInfo.min_mb} – {vmInfo.max_mb} MB</span></div>}
                  <div><span style={{ fontSize: 12, color: "#6b7280" }}>RAM : </span><span style={{ fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: "monospace" }}>{vmInfo.ram_total_gb.toFixed(1)} GB</span></div>
                </div>
              )}
              {vmResult && <div style={{ padding: "9px 14px", borderRadius: 8, marginBottom: 14, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)", fontSize: 12, color: "#4ade80" }} className="animate-fadeIn">{vmResult}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleSetVm(true)} disabled={vmLoading} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.22)", color: "#fbbf24", cursor: vmLoading ? "not-allowed" : "pointer", opacity: vmLoading ? 0.6 : 1 }}>
                  {vmLoading ? <div className="animate-spin" style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(251,191,36,0.2)", borderTopColor: "#fbbf24" }} /> : <Zap size={12} />}
                  Optimiser (×1.5/×3 RAM)
                </button>
                <button onClick={() => handleSetVm(false)} disabled={vmLoading} style={{ padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", cursor: vmLoading ? "not-allowed" : "pointer", opacity: vmLoading ? 0.6 : 1 }}>
                  Restaurer auto
                </button>
              </div>
              <p style={{ fontSize: 12, color: "#4b5563", marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>L'optimisation fixe la taille à 1.5× – 3× la RAM totale. Un redémarrage est nécessaire.</p>
            </div>
          </div>

          {/* Accès Bêta */}
          <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: betaMode ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${betaMode ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.06)"}` }}>
                  <FlaskConical size={16} style={{ color: betaMode ? "#a855f7" : "#6b7280" }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Accès Bêta</span>
                    {betaMode && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>BÊTA</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Fonctionnalités expérimentales en avant-première</div>
                </div>
              </div>
              <Toggle active={betaMode} onClick={() => { const next = !betaMode; setBetaMode(next); localStorage.setItem("pcpulse_beta", next ? "true" : "false"); }} />
            </div>
            {betaMode && (
              <div style={{ margin: "0 20px 16px", padding: "10px 14px", borderRadius: 8, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)", fontSize: 12, color: "#a78bfa", lineHeight: 1.6 }} className="animate-fadeIn">
                ✓ Vous avez accès aux fonctionnalités expérimentales. Merci de reporter les bugs sur Discord.
              </div>
            )}
          </div>

          {/* Overlay Gaming */}
          <PlanGate isPro={isPro} feature="Overlay Gaming">
            <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
              <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.18)" }}>
                    <MonitorIcon size={16} style={{ color: "#3b82f6" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Overlay Gaming</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Mini overlay always-on-top affiché par-dessus vos jeux</div>
                  </div>
                </div>
                <button onClick={() => invoke("open_overlay").catch(() => {})} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#3b82f6", cursor: "pointer" }}>
                  Ouvrir
                </button>
              </div>
            </div>
          </PlanGate>

          {/* Plan Pro */}
          <div style={{ background: "#161616", border: `1px solid ${isPro ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 12 }}>
            <button
              onClick={() => setShowProDetails(!showProDetails)}
              style={{ width: "100%", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: isPro ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(124,58,237,0.1)", border: `1px solid ${isPro ? "rgba(168,85,247,0.5)" : "rgba(124,58,237,0.2)"}` }}>
                  <Crown size={16} style={{ color: isPro ? "#fff" : "#a78bfa" }} />
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Plan Pro</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{isPro ? "Toutes les fonctionnalités débloquées" : "Débloquez l'expérience complète"}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {isPro && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>ACTIF</span>}
                {showProDetails ? <ChevronUp size={16} style={{ color: "#6b7280" }} /> : <ChevronDown size={16} style={{ color: "#6b7280" }} />}
              </div>
            </button>

            {showProDetails && (
              <div style={{ padding: "0 20px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }} className="animate-fadeIn">
                {isPro && (
                  <>
                    {(user.planExpiresAt || user.billingCycle) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", padding: "12px 16px", marginTop: 16, marginBottom: 16, borderRadius: 10, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
                        {user.planExpiresAt && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={12} style={{ color: "#a78bfa" }} /><span style={{ fontSize: 12, color: "#9ca3af" }}>Expire le <span style={{ color: "#fff", fontWeight: 600 }}>{formatExpiry(user.planExpiresAt)}</span></span>{daysRemaining(user.planExpiresAt) <= 7 && <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}>{daysRemaining(user.planExpiresAt)}j restants</span>}</div>}
                        {user.billingCycle && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><RotateCcw size={11} style={{ color: "#a78bfa" }} /><span style={{ fontSize: 12, color: "#9ca3af" }}>{user.billingCycle === "annual" ? "Annuel" : "Mensuel"}</span></div>}
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                      {PRO_FEATURES.map(f => <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}><CheckCircle size={11} style={{ color: "#a78bfa", flexShrink: 0 }} /><span style={{ fontSize: 12, color: "#9ca3af" }}>{f}</span></div>)}
                    </div>
                  </>
                )}

                {!isPro && !keySuccess && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16, marginBottom: 16 }}>
                      <div style={{ borderRadius: 10, padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>Mensuel</span>
                        <div><span style={{ fontSize: 26, fontWeight: 800, color: "#fff" }}>6.99€</span><span style={{ fontSize: 12, color: "#6b7280" }}>/mois</span></div>
                        <button onClick={() => openUrl(CHECKOUT_URL_MONTHLY).catch(() => {})} style={{ padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#d1d5db", cursor: "pointer" }}>Choisir →</button>
                      </div>
                      <div style={{ borderRadius: 10, padding: "16px", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)", display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
                        <span style={{ position: "absolute", top: -1, right: 10, fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: "0 0 6px 6px", background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff" }}>POPULAIRE</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em" }}>Annuel</span>
                        <div>
                          <span style={{ fontSize: 26, fontWeight: 800, color: "#fff" }}>34.99€</span><span style={{ fontSize: 12, color: "#6b7280" }}>/an</span>
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>−58%</span>
                        </div>
                        <button onClick={() => openUrl(CHECKOUT_URL_ANNUAL).catch(() => {})} style={{ padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "none", color: "#fff", cursor: "pointer" }}>Choisir →</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                      <span style={{ fontSize: 11, color: "#4b5563" }}>Déjà un code d'accès ?</span>
                      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input className="input-base" style={{ padding: "9px 14px", fontSize: 13, letterSpacing: "0.1em", fontFamily: "monospace" }} placeholder="XXXX-XXXX-XXXX-XXXX" value={keyInput} onChange={e => { setKeyInput(e.target.value.toUpperCase()); setKeyError(""); }} onKeyDown={e => e.key === "Enter" && handleActivateKey()} />
                      <button onClick={handleActivateKey} disabled={keyLoading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, flexShrink: 0, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa", cursor: keyLoading ? "not-allowed" : "pointer", opacity: keyLoading ? 0.6 : 1 }}>
                        {keyLoading ? <div className="animate-spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(167,139,250,0.2)", borderTopColor: "#a78bfa" }} /> : <><Zap size={13} /> Activer</>}
                      </button>
                    </div>
                    {keyError && <p style={{ fontSize: 12, color: "#f87171", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 5 }} className="animate-fadeIn"><AlertTriangle size={12} />{keyError}</p>}
                  </>
                )}

                {!isPro && keySuccess && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "16px", marginTop: 16, borderRadius: 10, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)", fontSize: 13, fontWeight: 600, color: "#4ade80" }} className="animate-fadeIn">
                    <CheckCircle size={15} /> Plan Pro activé avec succès !
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
