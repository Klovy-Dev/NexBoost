import { useState, useEffect, useRef } from "react";
import pcpulseLogo from "../assets/pcpulse-logo.svg";
import { AlertTriangle, CheckCircle, Crown, LogOut, Minus, X, Zap, Settings, Wifi, Trash2, Gamepad2, LayoutDashboard, ShieldAlert, ShieldCheck, Download, ListFilter } from "lucide-react";
import { check as checkUpdate } from "@tauri-apps/plugin-updater";
import { exit as processExit } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { UserData } from "../App";
import type { GpuStats, TweakResult, TweakStatus, Tab } from "../types";
import { TWEAKS } from "../lib/constants";
import { useSystemStats } from "../hooks/useSystemStats";
import { notify } from "../lib/notify";

import DashboardTab   from "../tabs/DashboardTab";
import PerformanceTab from "../tabs/PerformanceTab";
import NetworkTab     from "../tabs/NetworkTab";
import ProcessTab     from "../tabs/ProcessTab";
import CleanupTab     from "../tabs/CleanupTab";
import GamesTab       from "../tabs/GamesTab";
import SystemTab      from "../tabs/SystemTab";

import type { PlanActivationData } from "../App";
interface Props { user: UserData; onLogout: () => void; onPlanActivated: (d: PlanActivationData) => void; }

const BG = {
  background: "#060612",
  backgroundImage: `
    radial-gradient(ellipse 80% 60% at 0% 0%,    rgba(59,130,246,0.10) 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 100% 100%, rgba(99,102,241,0.08) 0%, transparent 55%)
  `,
} as React.CSSProperties;

const NAV_ITEMS: { id: Tab; icon: React.ReactNode; label: string; color: string }[] = [
  { id: "dashboard",   icon: <LayoutDashboard size={14} />, label: "Dashboard",     color: "#3b82f6" },
  { id: "performance", icon: <Zap size={14} />,             label: "Optimisations", color: "#f59e0b" },
  { id: "network",     icon: <Wifi size={14} />,            label: "Réseau",        color: "#10b981" },
  { id: "processes",   icon: <ListFilter size={14} />,      label: "Processus",     color: "#8b5cf6" },
  { id: "cleanup",     icon: <Trash2 size={14} />,          label: "Nettoyage",     color: "#06b6d4" },
  { id: "games",       icon: <Gamepad2 size={14} />,        label: "Jeux",          color: "#ef4444" },
  { id: "system",      icon: <Settings size={14} />,        label: "Système",       color: "#6366f1" },
];

const win = getCurrentWindow();
const handleDragStart = (e: React.MouseEvent) => {
  if (e.button !== 0) return;
  if ((e.target as HTMLElement).closest("button")) return;
  win.startDragging().catch(() => {});
};

export default function Dashboard({ user, onLogout, onPlanActivated }: Props) {
  const isPro   = user.plan === "pro";
  const isBeta  = localStorage.getItem("pcpulse_beta") === "true";
  const { stats, history, info, ping, pingHistory } = useSystemStats();

  const [activeTab,      setActiveTab]      = useState<Tab>("dashboard");
  const [tweakStates,    setTweakStates]    = useState<Record<string, boolean>>({});
  const [tweakLoading,   setTweakLoading]   = useState<Record<string, boolean>>({});
  const [toasts,         setToasts]         = useState<{ id: number; msg: string; ok: boolean }[]>([]);
  const [optimizing,     setOptimizing]     = useState(false);
  const [optimizedCount, setOptimizedCount] = useState(0);
  const [gpuHistory,     setGpuHistory]     = useState<number[]>(Array(30).fill(0));
  const [isAdmin,        setIsAdmin]        = useState<boolean | null>(null);
  const [relaunching,    setRelaunching]    = useState(false);
  const [updateVersion,  setUpdateVersion]  = useState<string | null>(null);
  const [installing,     setInstalling]     = useState(false);
  const [updateError,    setUpdateError]    = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const tempNotifSentAt = useRef<number>(0);
  const cpuNotifSentAt  = useRef<number>(0);
  const ramNotifSentAt  = useRef<number>(0);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const update = await checkUpdate();
        if (update?.available) {
          setUpdateVersion(update.version);
          setShowUpdateModal(true);
          notify("🔄 Mise à jour disponible", `PCPulse v${update.version} est prêt !`);
        }
      } catch {}
    }, 15_000);
    return () => clearTimeout(t);
  }, []);

  const handleInstallUpdate = async () => {
    setInstalling(true); setUpdateError(null);
    try {
      const update = await checkUpdate();
      if (update?.available) { await update.downloadAndInstall(); await processExit(0); }
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : String(e));
      setInstalling(false);
    }
  };

  useEffect(() => { invoke<boolean>("is_admin").then(setIsAdmin).catch(() => setIsAdmin(false)); }, []);
  const handleRelaunchAdmin = async () => {
    setRelaunching(true);
    try { await invoke("relaunch_as_admin"); } catch {}
    setRelaunching(false);
  };

  useEffect(() => {
    invoke<TweakStatus[]>("get_tweaks_status")
      .then(statuses => {
        const s: Record<string, boolean> = {};
        statuses.forEach(st => { s[st.id] = st.active; });
        setTweakStates(s);
      }).catch(() => {});
  }, []);

  const thresholds = (() => {
    try { return { temp: 85, cpu: 90, ram: 90, ...JSON.parse(localStorage.getItem("pcpulse_thresholds") || "{}") }; }
    catch { return { temp: 85, cpu: 90, ram: 90 }; }
  })();
  const tempAlert   = stats.temp > thresholds.temp && stats.temp > 0;
  const ramAlert    = stats.ram_total_gb > 0 && (stats.ram_used_gb / stats.ram_total_gb) * 100 > thresholds.ram;
  const perfScore   = Math.max(0, Math.min(100, Math.floor(100 - (stats.cpu + stats.ram) / 4)));
  const activeCount = Object.values(tweakStates).filter(Boolean).length;

  useEffect(() => {
    if (stats.temp > 0 && stats.temp > thresholds.temp) {
      const now = Date.now();
      if (now - tempNotifSentAt.current > 5 * 60 * 1000) { tempNotifSentAt.current = now; notify("⚠️ Température CPU élevée", `CPU à ${stats.temp}°C`); }
    }
  }, [stats.temp, thresholds.temp]);
  useEffect(() => {
    if (stats.cpu > thresholds.cpu) {
      const now = Date.now();
      if (now - cpuNotifSentAt.current > 5 * 60 * 1000) { cpuNotifSentAt.current = now; notify("⚠️ Charge CPU élevée", `CPU à ${stats.cpu}%`); }
    }
  }, [stats.cpu, thresholds.cpu]);
  useEffect(() => {
    if (ramAlert) {
      const now = Date.now();
      if (now - ramNotifSentAt.current > 5 * 60 * 1000) {
        ramNotifSentAt.current = now;
        notify("⚠️ RAM élevée", `RAM à ${Math.round((stats.ram_used_gb / stats.ram_total_gb) * 100)}%`);
      }
    }
  }, [ramAlert, thresholds.ram]);

  useEffect(() => {
    const fetch = () => { if (document.hidden) return; invoke<GpuStats>("get_gpu_stats").then(g => setGpuHistory(h => [...h.slice(-29), g.usage])).catch(() => {}); };
    fetch(); const iv = setInterval(fetch, 5000); return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const TABS: Tab[] = ["dashboard", "performance", "network", "processes", "cleanup", "games", "system"];
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = parseInt(e.key) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < TABS.length) setActiveTab(TABS[idx]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toast = (msg: string, ok: boolean) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, ok }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  const parseTweakMsg = (result: TweakResult, id: string, wasActive: boolean): string => {
    if (result.success) {
      const tw = TWEAKS.find(t => t.id === id);
      return wasActive ? `${tw?.label ?? id} — désactivé` : `${tw?.label ?? id} — activé`;
    }
    const m = (result.message ?? "").toLowerCase();
    if (m.includes("admin") || m.includes("privilege") || m.includes("access denied") || m.includes("elevation"))
      return `Admin requis — relancez PCPulse en administrateur`;
    if (m.includes("unsupported") || m.includes("not supported") || m.includes("not found") || m.includes("introuvable"))
      return `Non supporté sur ce système Windows`;
    if (m.includes("blocked") || m.includes("restricted") || m.includes("policy"))
      return `Bloqué par une stratégie Windows`;
    return result.message || `Échec pour '${TWEAKS.find(t => t.id === id)?.label ?? id}'`;
  };

  const handleToggleTweak = async (id: string) => {
    const isActive = tweakStates[id] ?? false;
    setTweakLoading(p => ({ ...p, [id]: true }));
    try {
      const result = await invoke<TweakResult>(isActive ? "revert_tweak" : "apply_tweak", { id });
      if (result.success) setTweakStates(p => ({ ...p, [id]: !isActive }));
      toast(parseTweakMsg(result, id, isActive), result.success);
    } catch { toast(`Erreur réseau pour '${TWEAKS.find(t => t.id === id)?.label ?? id}'`, false); }
    finally { setTweakLoading(p => ({ ...p, [id]: false })); }
  };

  const handleBigBoost = async () => {
    setOptimizing(true); setOptimizedCount(0);
    for (let i = 0; i < TWEAKS.length; i++) {
      try {
        const result = await invoke<TweakResult>("apply_tweak", { id: TWEAKS[i].id });
        if (result.success) setTweakStates(p => ({ ...p, [TWEAKS[i].id]: true }));
      } catch {}
      setOptimizedCount(i + 1);
    }
    setOptimizing(false);
    toast(`Boost appliqué — ${TWEAKS.length} optimisations`, true);
    notify("✅ Boost terminé", `${TWEAKS.length} optimisations appliquées.`);
    setActiveTab("performance");
  };

  return (
    <div className="fixed inset-0 select-none animate-fadeIn" style={BG}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

        {/* ══ Barre titre (drag) ══ */}
        <div
          onMouseDown={handleDragStart}
          style={{
            height: 34, flexShrink: 0,
            display: "flex", alignItems: "center", padding: "0 10px 0 14px",
            userSelect: "none", cursor: "default",
            background: "rgba(4,4,14,0.97)",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            zIndex: 10,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={pcpulseLogo} alt="PCPulse" style={{ width: 14, height: 14, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 10, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, color: "#818cf8", letterSpacing: "0.15em" }}>
              PCPULSE
            </span>
          </div>

          {/* Status */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "0 18px" }}>
            {isAdmin !== false ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 5px #22c55e" }} />
                <span style={{ fontSize: 8, color: "#22c55e", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>LIVE</span>
              </div>
            ) : (
              <>
                <ShieldAlert size={9} style={{ color: "#fbbf24" }} />
                <span style={{ fontSize: 9, color: "#fbbf24" }}>Mode limité</span>
                <button
                  onClick={handleRelaunchAdmin} disabled={relaunching}
                  style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24", cursor: "pointer" }}
                >
                  {relaunching ? "..." : "→ Admin"}
                </button>
              </>
            )}
            {updateVersion && !showUpdateModal && (
              <button onClick={() => setShowUpdateModal(true)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa", cursor: "pointer" }}>
                <Download size={8} /> v{updateVersion}
              </button>
            )}
            {tempAlert && (
              <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, color: "#f87171" }}>
                <AlertTriangle size={9} /> {stats.temp}°C
              </div>
            )}
          </div>

          {/* User */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 8 }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              background: isPro ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(59,130,246,0.15)",
              border: `1px solid ${isPro ? "rgba(168,85,247,0.4)" : "rgba(59,130,246,0.25)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 800, color: isPro ? "#fff" : "#60a5fa",
            }}>
              {isPro ? <Crown size={9} /> : user.username.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 10, color: "#374151" }}>{user.username}</span>
            {isBeta && (
              <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.35)", color: "#c084fc", letterSpacing: "0.08em" }}>BÊTA</span>
            )}
          </div>

          {/* Window controls */}
          <div style={{ display: "flex", gap: 2 }}>
            {[
              { onClick: () => win.minimize(), icon: <Minus size={9} />, hover: "rgba(255,255,255,0.08)", hoverColor: "#94a3b8" },
              { onClick: () => win.close(),    icon: <X size={9} />,     hover: "rgba(239,68,68,0.15)",  hoverColor: "#ef4444" },
            ].map((btn, i) => (
              <button
                key={i}
                onClick={btn.onClick}
                style={{ width: 24, height: 24, borderRadius: 5, background: "transparent", border: "none", color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}
                onMouseEnter={e => { e.currentTarget.style.background = btn.hover; e.currentTarget.style.color = btn.hoverColor; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#374151"; }}
              >
                {btn.icon}
              </button>
            ))}
          </div>
        </div>

        {/* ══ Navigation horizontale ══ */}
        <nav style={{
          height: 50, flexShrink: 0,
          display: "flex", alignItems: "stretch",
          background: "rgba(6,6,16,0.98)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "0 6px",
          gap: 1,
        }}>
          {NAV_ITEMS.map(({ id, icon, label, color }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "0 20px", flexShrink: 0,
                  background: active ? `${color}0e` : "transparent",
                  border: "none",
                  borderBottom: `2px solid ${active ? color : "transparent"}`,
                  borderTop: "2px solid transparent",
                  color: active ? color : "#374151",
                  cursor: "pointer", transition: "all 0.12s",
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  borderRadius: 0, outline: "none",
                  position: "relative",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = "#374151"; e.currentTarget.style.background = "transparent"; }}}
              >
                <span style={{ display: "flex", opacity: active ? 1 : 0.45 }}>{icon}</span>
                {label}
                {id === "dashboard" && tempAlert && (
                  <span style={{ position: "absolute", top: 8, right: 6, width: 5, height: 5, borderRadius: "50%", background: "#f87171", boxShadow: "0 0 4px #f87171" }} />
                )}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* Admin + Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "0 6px" }}>
            {isAdmin !== null && (
              <div
                title={isAdmin ? "Administrateur" : "Mode limité — cliquer pour relancer"}
                onClick={isAdmin ? undefined : handleRelaunchAdmin}
                style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isAdmin ? "rgba(74,222,128,0.08)" : "rgba(251,191,36,0.08)",
                  border: `1px solid ${isAdmin ? "rgba(74,222,128,0.18)" : "rgba(251,191,36,0.22)"}`,
                  color: isAdmin ? "#4ade80" : "#fbbf24",
                  cursor: isAdmin ? "default" : "pointer", transition: "all 0.15s",
                }}
              >
                {isAdmin ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
              </div>
            )}
            <button
              onClick={onLogout} title="Déconnexion"
              style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid transparent", color: "#374151", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.1)"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.22)"; e.currentTarget.style.color = "#f87171"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.color = "#374151"; }}
            >
              <LogOut size={13} />
            </button>
          </div>
        </nav>

        {/* ══ Contenu ══ */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeTab === "dashboard" && (
            <DashboardTab stats={stats} history={history} gpuHistory={gpuHistory} perfScore={perfScore} activeCount={activeCount} optimizing={optimizing} optimizedCount={optimizedCount} handleBigBoost={handleBigBoost} username={user.username} isPro={isPro} isBeta={isBeta} setActiveTab={setActiveTab} />
          )}
          {activeTab === "performance" && (
            <PerformanceTab tweakStates={tweakStates} tweakLoading={tweakLoading} activeCount={activeCount} handleToggleTweak={handleToggleTweak} setTweakStates={setTweakStates} />
          )}
          {activeTab === "network"    && <NetworkTab ping={ping} pingHistory={pingHistory} />}
          {activeTab === "processes"  && <ProcessTab />}
          {activeTab === "cleanup"    && <CleanupTab />}
          {activeTab === "games"      && <GamesTab userId={user.id} />}
          {activeTab === "system"     && <SystemTab user={user} activeCount={activeCount} perfScore={perfScore} stats={stats} info={info} onLogout={onLogout} onPlanActivated={onPlanActivated} />}
        </div>
      </div>

      {/* ══ Modal update ══ */}
      {showUpdateModal && updateVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} onClick={() => { if (!installing) setShowUpdateModal(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0d0d1f", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 16, padding: "28px", width: 340, boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}>
                <Download size={18} style={{ color: "#60a5fa" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>Mise à jour disponible</div>
                <div style={{ fontSize: 11, color: "#374151" }}>PCPulse v{updateVersion}</div>
              </div>
              {!installing && <button onClick={() => setShowUpdateModal(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#374151", cursor: "pointer", padding: 4, display: "flex", borderRadius: 6 }} onMouseEnter={e => { e.currentTarget.style.color = "#94a3b8"; }} onMouseLeave={e => { e.currentTarget.style.color = "#374151"; }}><X size={14} /></button>}
            </div>
            <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.6, marginBottom: 16 }}>L'application se relancera automatiquement après l'installation.</p>
            {updateError && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, marginBottom: 14, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}><AlertTriangle size={13} style={{ color: "#f87171" }} /><span style={{ fontSize: 11, color: "#f87171" }}>{updateError}</span></div>}
            {installing && <div style={{ marginBottom: 16 }}><div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#3b82f6,#6366f1)", animation: "progress-indeterminate 1.5s ease-in-out infinite", width: "40%" }} /></div></div>}
            <div style={{ display: "flex", gap: 8 }}>
              {!installing && !updateError && <button onClick={() => setShowUpdateModal(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#4b5563", cursor: "pointer" }}>Plus tard</button>}
              <button onClick={updateError ? () => { setUpdateError(null); handleInstallUpdate(); } : handleInstallUpdate} disabled={installing} style={{ flex: 2, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", cursor: installing ? "not-allowed" : "pointer", opacity: installing ? 0.8 : 1 }}>
                {installing ? <><div className="animate-spin" style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6" }} />Installation...</> : <><Download size={13} />{updateError ? "Réessayer" : "Installer"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Toasts ══ */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium animate-fadeIn" style={{ background: t.ok ? "rgba(34,197,94,0.1)" : "rgba(248,113,113,0.1)", border: `1px solid ${t.ok ? "rgba(34,197,94,0.3)" : "rgba(248,113,113,0.3)"}`, color: t.ok ? "#4ade80" : "#f87171", boxShadow: "0 4px 16px rgba(0,0,0,0.5)", maxWidth: 300 }}>
              {t.ok ? <CheckCircle size={12} style={{ flexShrink: 0 }} /> : <AlertTriangle size={12} style={{ flexShrink: 0 }} />}
              {t.msg}
            </div>
          ))}
        </div>
      )}

      {/* ══ Boost overlay ══ */}
      {optimizing && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-xl z-50 animate-fadeIn" style={{ background: "#0d0d1f", border: "1px solid rgba(59,130,246,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(59,130,246,0.2)", borderTopColor: "#3b82f6" }} />
          <span className="text-sm font-medium" style={{ color: "#e2e8f0" }}>Boost en cours... {optimizedCount}/{TWEAKS.length}</span>
          <Zap size={14} style={{ color: "#3b82f6" }} />
        </div>
      )}
    </div>
  );
}
