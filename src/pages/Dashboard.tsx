import { useState, useEffect, useRef } from "react";
import pcpulseLogo from "../assets/pcpulse-logo.svg";
import {
  AlertTriangle, CheckCircle, Crown, LogOut, Minus, X, Zap, Settings, Wifi,
  Trash2, Gamepad2, LayoutDashboard, ShieldAlert, ShieldCheck, Download, Monitor,
  Gauge, ChevronUp, Bell, User, HelpCircle, Send,
} from "lucide-react";
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

const win = getCurrentWindow();

const NAV_ITEMS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "dashboard",   icon: <LayoutDashboard size={15} />, label: "Accueil"    },
  { id: "performance", icon: <Zap size={15} />,             label: "Optimizer"  },
  { id: "cleanup",     icon: <Trash2 size={15} />,          label: "Cleaner"    },
  { id: "system",      icon: <Gauge size={15} />,           label: "Booster"    },
  { id: "games",       icon: <Gamepad2 size={15} />,        label: "Jeux"       },
  { id: "network",     icon: <Wifi size={15} />,            label: "Réseau"     },
  { id: "processes",   icon: <Monitor size={15} />,         label: "Votre PC"   },
];

export default function Dashboard({ user, onLogout, onPlanActivated }: Props) {
  const isPro   = user.plan === "pro";
  const isBeta  = localStorage.getItem("pcpulse_beta") === "true";
  const { stats, history, info, ping, pingHistory } = useSystemStats();

  const [activeTab,       setActiveTab]       = useState<Tab>("dashboard");
  const [tweakStates,     setTweakStates]     = useState<Record<string, boolean>>({});
  const [tweakLoading,    setTweakLoading]    = useState<Record<string, boolean>>({});
  const [toasts,          setToasts]          = useState<{ id: number; msg: string; ok: boolean }[]>([]);
  const [optimizing,      setOptimizing]      = useState(false);
  const [optimizedCount,  setOptimizedCount]  = useState(0);
  const [gpuHistory,      setGpuHistory]      = useState<number[]>(Array(30).fill(0));
  const [isAdmin,         setIsAdmin]         = useState<boolean | null>(null);
  const [relaunching,     setRelaunching]     = useState(false);
  const [updateVersion,   setUpdateVersion]   = useState<string | null>(null);
  const [installing,      setInstalling]      = useState(false);
  const [updateError,     setUpdateError]     = useState<string | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showUserMenu,    setShowUserMenu]    = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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
    const TABS: Tab[] = ["dashboard", "performance", "cleanup", "system", "games", "network", "processes"];
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

  const S = {
    bg:      "#0d0d0d",
    sidebar: "#0a0a0a",
    border:  "rgba(255,255,255,0.06)",
    accent:  "#3b82f6",
    text:    "#ffffff",
    text2:   "#9ca3af",
    text3:   "#4b5563",
  };

  return (
    <div className="fixed inset-0 select-none" style={{ background: S.bg, display: "flex", flexDirection: "column" }}>

      {/* ══ TITLEBAR ══ */}
      <div
        data-tauri-drag-region
        style={{
          height: 38, flexShrink: 0,
          display: "flex", alignItems: "center",
          background: S.sidebar,
          borderBottom: `1px solid ${S.border}`,
          padding: "0 12px",
          userSelect: "none", position: "relative", zIndex: 20,
        }}
      >
        {/* Left: logo + name + badges + pro button */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src={pcpulseLogo} alt="PCPulse"
            style={{ width: 22, height: 22, borderRadius: 6, filter: "brightness(1.2) drop-shadow(0 0 4px rgba(66,165,245,0.5))", flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: S.text, letterSpacing: "0.01em" }}>PCPulse</span>
          {isBeta && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 4, background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", color: "#fb923c" }}>
              Bêta
            </span>
          )}
          {!isPro && (
            <button
              style={{ fontSize: 10, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.22)", color: "#60a5fa", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.16)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.08)"; }}
            >
              <Crown size={9} /> Passer Pro
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} data-tauri-drag-region />

        {/* Right: status + window controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isAdmin === false && (
            <button
              onClick={handleRelaunchAdmin} disabled={relaunching}
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24", cursor: "pointer" }}
            >
              <ShieldAlert size={10} /> {relaunching ? "..." : "Mode limité → Admin"}
            </button>
          )}
          {isAdmin === true && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#4b5563" }}>
              <ShieldCheck size={11} style={{ color: "#22c55e" }} />
            </div>
          )}
          {updateVersion && (
            <button
              onClick={() => setShowUpdateModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 6, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#60a5fa", cursor: "pointer" }}
            >
              <Download size={9} /> v{updateVersion}
            </button>
          )}
          {tempAlert && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#f87171" }}>
              <AlertTriangle size={10} /> {stats.temp}°C
            </div>
          )}
          {[
            { onClick: () => win.minimize(), icon: <Minus size={10} />, hoverBg: "rgba(255,255,255,0.08)", hoverColor: "#e2e8f0" },
            { onClick: () => win.close(),    icon: <X size={10} />,     hoverBg: "rgba(239,68,68,0.15)",  hoverColor: "#f87171" },
          ].map((btn, i) => (
            <button
              key={i} onClick={btn.onClick}
              style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, background: "transparent", border: "none", color: S.text3, cursor: "pointer", transition: "all 0.1s" }}
              onMouseEnter={e => { e.currentTarget.style.background = btn.hoverBg; e.currentTarget.style.color = btn.hoverColor; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = S.text3; }}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </div>

      {/* ══ BODY: SIDEBAR + CONTENT ══ */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ═══ SIDEBAR ═══ */}
        <aside style={{
          width: 148, flexShrink: 0,
          background: S.sidebar,
          borderRight: `1px solid ${S.border}`,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Nav */}
          <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
            {NAV_ITEMS.map(({ id, icon, label }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", width: "100%", textAlign: "left",
                    background: active ? "rgba(59,130,246,0.12)" : "transparent",
                    color: active ? S.accent : S.text3,
                    borderRadius: 8, border: "none",
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    cursor: "pointer", transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = S.text2; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = S.text3; }}}
                >
                  <span style={{ flexShrink: 0, display: "flex" }}>{icon}</span>
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Bottom: plan card + user */}
          <div>
            <div style={{ padding: "0 8px 8px" }}>
              {!isPro ? (
                <div style={{ padding: "12px", borderRadius: 10, background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.14)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: S.text, marginBottom: 2 }}>Passer à Pro</div>
                  <div style={{ fontSize: 10, color: S.text3, marginBottom: 10, lineHeight: 1.4 }}>Débloquez toutes les fonctionnalités</div>
                  <button
                    style={{ width: "100%", padding: "6px 0", borderRadius: 6, background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.35)", color: "#60a5fa", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(59,130,246,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(59,130,246,0.2)"; }}
                  >
                    <Crown size={10} /> Passer Pro
                  </button>
                </div>
              ) : isBeta ? (
                <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.16)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#c084fc" }}>🧪 Mode Bêta</div>
                  <div style={{ fontSize: 10, color: S.text3, marginTop: 3 }}>Accès aux fonctionnalités expérimentales</div>
                </div>
              ) : (
                <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.14)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#4ade80" }}>✦ Plan Pro actif</div>
                  <div style={{ fontSize: 10, color: S.text3, marginTop: 3 }}>Toutes les fonctionnalités débloquées</div>
                </div>
              )}
            </div>

            {/* User */}
            <div style={{ position: "relative" }} ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(v => !v)}
                style={{
                  width: "100%", padding: "12px 16px",
                  borderTop: `1px solid ${S.border}`,
                  display: "flex", alignItems: "center", gap: 8,
                  background: "transparent", border: "none", cursor: "pointer",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: isPro ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "#1e3a5f",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "#fff",
                }}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: S.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user.username}
                  </div>
                </div>
                <ChevronUp size={12} style={{ color: S.text3, flexShrink: 0, transform: showUserMenu ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.15s" }} />
              </button>

              {/* User menu popup */}
              {showUserMenu && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 4px)", left: 8, right: 8,
                  background: "#161616", border: `1px solid ${S.border}`,
                  borderRadius: 10, overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  zIndex: 100,
                }}>
                  {[
                    { icon: <Send size={13} />,      label: "Envoyer un retour", action: () => {} },
                    { icon: <Bell size={13} />,      label: "Notifications",     action: () => {} },
                    { icon: <Settings size={13} />,  label: "Paramètres",        action: () => { setActiveTab("system"); setShowUserMenu(false); } },
                    { icon: <User size={13} />,      label: "Mon compte",        action: () => {} },
                    { icon: <HelpCircle size={13} />,label: "Assistance",        action: () => {} },
                  ].map((item, i) => (
                    <button
                      key={i} onClick={item.action}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", background: "transparent", border: "none", color: S.text2, fontSize: 12, cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = S.text; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = S.text2; }}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                  <div style={{ height: 1, background: S.border, margin: "2px 0" }} />
                  <button
                    onClick={() => { setShowUserMenu(false); onLogout(); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", background: "transparent", border: "none", color: "#f87171", fontSize: 12, cursor: "pointer", textAlign: "left" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <LogOut size={13} /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ═══ CONTENT ═══ */}
        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: S.bg }}>
          {activeTab === "dashboard"   && <DashboardTab stats={stats} history={history} gpuHistory={gpuHistory} perfScore={perfScore} activeCount={activeCount} optimizing={optimizing} optimizedCount={optimizedCount} handleBigBoost={handleBigBoost} username={user.username} isPro={isPro} isBeta={isBeta} setActiveTab={setActiveTab} />}
          {activeTab === "performance" && <PerformanceTab tweakStates={tweakStates} tweakLoading={tweakLoading} activeCount={activeCount} handleToggleTweak={handleToggleTweak} setTweakStates={setTweakStates} />}
          {activeTab === "network"     && <NetworkTab ping={ping} pingHistory={pingHistory} />}
          {activeTab === "processes"   && <ProcessTab />}
          {activeTab === "cleanup"     && <CleanupTab />}
          {activeTab === "games"       && <GamesTab userId={user.id} />}
          {activeTab === "system"      && <SystemTab user={user} activeCount={activeCount} perfScore={perfScore} stats={stats} info={info} onLogout={onLogout} onPlanActivated={onPlanActivated} />}
        </main>
      </div>

      {/* ══ MODAL UPDATE ══ */}
      {showUpdateModal && updateVersion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }} onClick={() => { if (!installing) setShowUpdateModal(false); }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#161616", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 16, padding: "28px", width: 340, boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.22)" }}>
                <Download size={18} style={{ color: "#60a5fa" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: S.text }}>Mise à jour disponible</div>
                <div style={{ fontSize: 11, color: S.text3 }}>PCPulse v{updateVersion}</div>
              </div>
              {!installing && <button onClick={() => setShowUpdateModal(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: S.text3, cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }} onMouseEnter={e => { e.currentTarget.style.color = S.text2; }} onMouseLeave={e => { e.currentTarget.style.color = S.text3; }}><X size={14} /></button>}
            </div>
            <p style={{ fontSize: 12, color: S.text3, lineHeight: 1.6, marginBottom: 16 }}>L'application se relancera automatiquement après l'installation.</p>
            {updateError && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, marginBottom: 14, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}><AlertTriangle size={13} style={{ color: "#f87171" }} /><span style={{ fontSize: 11, color: "#f87171" }}>{updateError}</span></div>}
            {installing && <div style={{ marginBottom: 16 }}><div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", background: "linear-gradient(90deg,#3b82f6,#6366f1)", animation: "progress-indeterminate 1.5s ease-in-out infinite", width: "40%" }} /></div></div>}
            <div style={{ display: "flex", gap: 8 }}>
              {!installing && !updateError && <button onClick={() => setShowUpdateModal(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: S.text3, cursor: "pointer" }}>Plus tard</button>}
              <button onClick={updateError ? () => { setUpdateError(null); handleInstallUpdate(); } : handleInstallUpdate} disabled={installing} style={{ flex: 2, padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa", cursor: installing ? "not-allowed" : "pointer", opacity: installing ? 0.8 : 1 }}>
                {installing ? <><div className="animate-spin" style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6" }} />Installation...</> : <><Download size={13} />{updateError ? "Réessayer" : "Installer"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ TOASTS ══ */}
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

      {/* ══ BOOST OVERLAY ══ */}
      {optimizing && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-xl z-50 animate-fadeIn" style={{ background: "#161616", border: "1px solid rgba(59,130,246,0.22)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(59,130,246,0.2)", borderTopColor: "#3b82f6" }} />
          <span className="text-sm font-medium" style={{ color: S.text }}>Boost en cours... {optimizedCount}/{TWEAKS.length}</span>
          <Zap size={14} style={{ color: "#3b82f6" }} />
        </div>
      )}
    </div>
  );
}
