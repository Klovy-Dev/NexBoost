import { useState, useEffect } from "react";
import { RefreshCw, Trash2, AlertTriangle, CheckCircle, SquareCheck, Square, MemoryStick, Globe, Recycle, HardDrive, Sparkles, Search, FolderOpen, LayoutList } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { CleanCategory, CleanResult } from "../types";

type QuickAction = "ram" | "recycle" | "dns" | "cleandisk";
type QuickState  = { loading: boolean; result: string | null };
type RamCleanResult = { before_mb: number; after_mb: number; freed_mb: number };
type LargeFile   = { path: string; size_mb: number; name: string };
type CleanInner  = "categories" | "large_files";

export default function CleanupTab() {
  const [categories,   setCategories]   = useState<CleanCategory[]>([]);
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [scanning,     setScanning]     = useState(false);
  const [cleaning,     setCleaning]     = useState(false);
  const [cleanResult,  setCleanResult]  = useState<CleanResult | null>(null);
  const [ramResult,    setRamResult]    = useState<RamCleanResult | null>(null);
  const [innerTab,     setInnerTab]     = useState<CleanInner>("categories");
  const [largeFiles,   setLargeFiles]   = useState<LargeFile[]>([]);
  const [lfScanning,   setLfScanning]   = useState(false);
  const [lfMinMb,      setLfMinMb]      = useState(100);
  const [lfScanned,    setLfScanned]    = useState(false);
  const [quick, setQuick] = useState<Record<QuickAction, QuickState>>({
    ram:      { loading: false, result: null },
    recycle:  { loading: false, result: null },
    dns:      { loading: false, result: null },
    cleandisk:{ loading: false, result: null },
  });

  useEffect(() => { scan(); }, []);

  const fmt = (mb: number) =>
    mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;

  const runQuick = async (action: QuickAction) => {
    setQuick(q => ({ ...q, [action]: { loading: true, result: null } }));
    if (action === "ram") setRamResult(null);
    try {
      if (action === "ram") {
        const res = await invoke<RamCleanResult>("clean_ram");
        setRamResult(res);
        const msg = res.freed_mb > 0 ? `−${fmt(res.freed_mb)}` : "Nettoyée";
        setQuick(q => ({ ...q, ram: { loading: false, result: msg } }));
        setTimeout(() => { setRamResult(null); setQuick(q => ({ ...q, ram: { ...q.ram, result: null } })); }, 3000);
        return;
      } else if (action === "recycle") {
        const res = await invoke<CleanResult>("empty_recycle_bin");
        setQuick(q => ({ ...q, recycle: { loading: false, result: res.freed_mb > 0 ? `${fmt(res.freed_mb)} libérés` : "Vidée ✓" } }));
      } else if (action === "cleandisk") {
        await invoke<boolean>("run_cleandisk");
        setQuick(q => ({ ...q, cleandisk: { loading: false, result: "Lancé ✓" } }));
      } else {
        await invoke<string>("flush_dns");
        setQuick(q => ({ ...q, dns: { loading: false, result: "DNS vidé ✓" } }));
      }
    } catch {
      setQuick(q => ({ ...q, [action]: { loading: false, result: "Erreur" } }));
    }
    setTimeout(() => setQuick(q => ({ ...q, [action]: { ...q[action], result: null } })), 4000);
  };

  const BROWSER_KW = ["chrome", "firefox", "edge", "brave", "opera", "chromium", "browser", "safari"];
  const isBrowserCat = (cat: CleanCategory) =>
    BROWSER_KW.some(k => cat.id.toLowerCase().includes(k) || cat.label.toLowerCase().includes(k));

  const scan = async () => {
    setScanning(true); setCleanResult(null);
    try {
      const cats = await invoke<CleanCategory[]>("get_clean_categories");
      setCategories(cats);
      setSelected(new Set(cats.filter(c => c.file_count > 0 && !isBrowserCat(c)).map(c => c.id)));
    } catch { setCategories([]); }
    finally { setScanning(false); }
  };

  const handleClean = async () => {
    if (selected.size === 0) return;
    setCleaning(true);
    try {
      const result = await invoke<CleanResult>("clean_categories", { categories: Array.from(selected) });
      setCleanResult(result);
      if (result.freed_mb > 0 || result.files_deleted > 0) {
        localStorage.setItem("pcpulse_last_cleaned", new Date().toISOString());
      }
      await scan();
    } catch {
      setCleanResult({ freed_mb: 0, files_deleted: 0, files_skipped: 0 });
    } finally { setCleaning(false); }
  };

  const openFileLocation = async (filePath: string) => {
    const parts = filePath.split("\\");
    for (let i = parts.length - 1; i >= 1; i--) {
      try { await invoke("open_path", { path: parts.slice(0, i).join("\\") }); return; } catch {}
    }
  };

  const totalMb    = categories.filter(c => selected.has(c.id)).reduce((s, c) => s + c.size_mb, 0);
  const totalFiles = categories.filter(c => selected.has(c.id)).reduce((s, c) => s + c.file_count, 0);
  const allMb      = categories.reduce((s, c) => s + c.size_mb, 0);
  const selectAll  = () => setSelected(new Set(categories.filter(c => c.file_count > 0).map(c => c.id)));
  const clearAll   = () => setSelected(new Set());
  const canClean   = !cleaning && !scanning && selected.size > 0 && totalFiles > 0;

  const scanLargeFiles = async () => {
    setLfScanning(true); setLargeFiles([]);
    try {
      const files = await invoke<LargeFile[]>("find_large_files", { min_mb: lfMinMb });
      setLargeFiles(files);
    } catch {
      setLargeFiles([]);
    }
    setLfScanning(false); setLfScanned(true);
  };

  const QUICK_ACTIONS = [
    { key: "ram"       as QuickAction, icon: <MemoryStick size={16} />, label: "RAM",          desc: "Vider mémoire vive",     color: "#8b5cf6" },
    { key: "recycle"   as QuickAction, icon: <Recycle     size={16} />, label: "Corbeille",    desc: "Vider la corbeille",     color: "#4ade80" },
    { key: "dns"       as QuickAction, icon: <Globe       size={16} />, label: "DNS",          desc: "Vider le cache DNS",     color: "#06b6d4" },
    { key: "cleandisk" as QuickAction, icon: <HardDrive   size={16} />, label: "CleanDisk",    desc: "Outil Windows",          color: "#fbbf24" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "100%", overflow: "hidden" }} className="animate-fadeIn">

      {/* ═══ COLONNE GAUCHE ═══ */}
      <div style={{
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "rgba(0,0,0,0.15)",
      }}>
        <div style={{ padding: "20px 18px 16px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,182,212,0.15)", border: "1px solid rgba(6,182,212,0.3)" }}>
              <Trash2 size={18} style={{ color: "#06b6d4" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", margin: 0 }}>Nettoyage</h2>
              <p style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>Libérez de l'espace disque</p>
            </div>
          </div>

          {/* Espace détecté */}
          <div style={{ background: "#0d0d1f", border: "1px solid rgba(6,182,212,0.18)", borderLeft: "3px solid #06b6d4", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151", marginBottom: 6 }}>DÉTECTÉ</div>
            <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "monospace", color: "#06b6d4", lineHeight: 1, marginBottom: 4 }}>
              {allMb > 0 ? fmt(allMb) : "—"}
            </div>
            <div style={{ fontSize: 10, color: "#374151" }}>{categories.length} catégories · {categories.reduce((s, c) => s + c.file_count, 0)} fichiers</div>
          </div>

          {cleanResult && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
              <CheckCircle size={11} style={{ color: "#4ade80", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#4ade80" }}>{fmt(cleanResult.freed_mb)} libérés · {cleanResult.files_deleted} fichiers</span>
            </div>
          )}
        </div>

        {/* Actions rapides */}
        <div style={{ flex: 1, overflow: "auto", padding: "14px 18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: "linear-gradient(180deg,#06b6d4,#8b5cf6)" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#374151" }}>ACTIONS RAPIDES</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {QUICK_ACTIONS.map(({ key, icon, label, desc, color }) => {
              const state = quick[key];
              return (
                <button
                  key={key}
                  onClick={() => runQuick(key)}
                  disabled={state.loading}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 14px", borderRadius: 9, cursor: state.loading ? "not-allowed" : "pointer",
                    background: state.result ? `${color}0a` : "#0d0d1f",
                    border: `1px solid ${state.result ? `${color}35` : "rgba(255,255,255,0.07)"}`,
                    borderLeft: `3px solid ${state.result ? color : `${color}50`}`,
                    opacity: state.loading ? 0.7 : 1, transition: "all 0.15s", textAlign: "left",
                  }}
                  onMouseEnter={e => { if (!state.loading) { e.currentTarget.style.background = `${color}0c`; }}}
                  onMouseLeave={e => { if (!state.result) e.currentTarget.style.background = "#0d0d1f"; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: state.loading || state.result ? `${color}18` : "rgba(255,255,255,0.05)", color: state.loading || state.result ? color : "#374151", transition: "all 0.2s" }}>
                    {state.loading
                      ? <div className="animate-spin" style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${color}30`, borderTopColor: color }} />
                      : icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: state.result ? color : "#e2e8f0" }}>
                      {state.result ?? label}
                    </div>
                    <div style={{ fontSize: 10, color: "#374151", marginTop: 1 }}>{desc}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Résultat RAM */}
          {ramResult && (
            <div style={{ background: "#0d0d1f", border: "1px solid rgba(139,92,246,0.2)", borderLeft: "3px solid rgba(139,92,246,0.6)", borderRadius: 9, padding: "12px 14px", marginBottom: 14 }} className="animate-fadeIn">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MemoryStick size={12} style={{ color: "#8b5cf6" }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6" }}>RAM nettoyée</span>
                </div>
                {ramResult.freed_mb > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "monospace", color: "#4ade80" }}>−{fmt(ramResult.freed_mb)}</span>
                )}
              </div>
              {[
                { label: "Avant", value: ramResult.before_mb, total: ramResult.before_mb * 1.1, color: "#ef4444" },
                { label: "Après",  value: ramResult.after_mb,  total: ramResult.before_mb * 1.1, color: "#8b5cf6" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 9, color: "#374151", width: 32 }}>{r.label}</span>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100,(r.value/r.total)*100)}%`, background: r.color, borderRadius: 3, transition: "width 0.6s" }} />
                  </div>
                  <span style={{ fontSize: 10, fontFamily: "monospace", color: r.color, width: 60, textAlign: "right" }}>{fmt(r.value)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Navigation interne */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, marginBottom: 8 }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: "#06b6d4" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#374151" }}>OUTILS</span>
          </div>
          {([
            { id: "categories"  as CleanInner, label: "Nettoyage",        icon: <LayoutList size={13} /> },
            { id: "large_files" as CleanInner, label: "Gros fichiers",    icon: <Search size={13} /> },
          ]).map(tab => {
            const active = innerTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setInnerTab(tab.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 5, width: "100%", borderRadius: 9, cursor: "pointer", transition: "all 0.15s", textAlign: "left", background: active ? "rgba(6,182,212,0.08)" : "#0d0d1f", border: `1px solid ${active ? "rgba(6,182,212,0.25)" : "rgba(255,255,255,0.07)"}`, borderLeft: `3px solid ${active ? "#06b6d4" : "rgba(255,255,255,0.1)"}`, transform: active ? "translateX(3px)" : "none" }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "rgba(6,182,212,0.04)"; e.currentTarget.style.transform = "translateX(3px)"; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "#0d0d1f"; e.currentTarget.style.transform = "none"; }}}
              >
                <div style={{ color: active ? "#06b6d4" : "#374151" }}>{tab.icon}</div>
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#e2e8f0" : "#94a3b8" }}>{tab.label}</span>
              </button>
            );
          })}

          {/* Avertissement */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)", marginTop: 8 }}>
            <AlertTriangle size={11} style={{ color: "#fbbf24", marginTop: 1, flexShrink: 0 }} />
            <p style={{ fontSize: 10, color: "#4b5563", lineHeight: 1.6, margin: 0 }}>
              Fichiers verrouillés ignorés automatiquement. Fermez vos navigateurs avant nettoyage.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ COLONNE DROITE ═══ */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px 20px" }}>

          {/* ── Gros Fichiers ── */}
          {innerTab === "large_files" && (
            <div className="animate-fadeIn">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: "#06b6d4" }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>GROS FICHIERS</span>
              </div>

              <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(6,182,212,0.5)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>Taille minimale</div>
                    <div style={{ fontSize: 11, color: "#374151" }}>Fichiers plus grands que <span style={{ color: "#06b6d4", fontWeight: 700, fontFamily: "monospace" }}>{lfMinMb} MB</span></div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    {[100, 500, 1000].map(mb => (
                      <button key={mb} onClick={() => setLfMinMb(mb)}
                        style={{ padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.12s", background: lfMinMb === mb ? "rgba(6,182,212,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${lfMinMb === mb ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.07)"}`, color: lfMinMb === mb ? "#06b6d4" : "#374151" }}>
                        {mb >= 1000 ? `${mb/1000}GB` : `${mb}MB`}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={scanLargeFiles} disabled={lfScanning}
                  style={{ marginTop: 12, width: "100%", padding: "10px 16px", borderRadius: 9, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: lfScanning ? "not-allowed" : "pointer", opacity: lfScanning ? 0.6 : 1, transition: "all 0.15s", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", borderLeft: "3px solid #06b6d4", color: "#06b6d4" }}
                  onMouseEnter={e => { if (!lfScanning) e.currentTarget.style.filter = "brightness(1.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
                >
                  {lfScanning ? <><div className="animate-spin" style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(6,182,212,0.2)", borderTopColor: "#06b6d4" }} />Analyse en cours...</> : <><Search size={14} /> Scanner le disque</>}
                </button>
              </div>

              {lfScanned && !lfScanning && (
                <div className="animate-fadeIn">
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8" }}>{largeFiles.length} fichier{largeFiles.length !== 1 ? "s" : ""} trouvé{largeFiles.length !== 1 ? "s" : ""}</span>
                    {largeFiles.length > 0 && <span style={{ fontSize: 10, color: "#06b6d4", fontWeight: 600, fontFamily: "monospace" }}>({fmt(largeFiles.reduce((s, f) => s + f.size_mb, 0))} total)</span>}
                  </div>
                  {largeFiles.length === 0 ? (
                    <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "30px 20px", textAlign: "center" }}>
                      <CheckCircle size={24} style={{ color: "rgba(74,222,128,0.4)", margin: "0 auto 8px" }} />
                      <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>Aucun gros fichier trouvé</p>
                    </div>
                  ) : (
                    <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(6,182,212,0.5)", borderRadius: 10, overflow: "hidden" }}>
                      {largeFiles.map((f, i) => (
                        <div key={f.path} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < largeFiles.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                          <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>
                            <HardDrive size={14} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                            <div style={{ fontSize: 9, fontFamily: "monospace", color: "#374151", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.path}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, fontFamily: "monospace", color: "#06b6d4" }}>{fmt(f.size_mb)}</div>
                            <button onClick={() => openFileLocation(f.path)}
                              style={{ marginTop: 3, fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                              <FolderOpen size={9} /> Ouvrir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Catégories (onglet normal) ── */}
          {innerTab === "categories" && <>

          {/* Stats + boutons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
            {[
              { label: "Total détecté", value: allMb > 0 ? fmt(allMb) : "0 MB",               color: "#f97316" },
              { label: "Sélectionné",  value: totalMb > 0 ? fmt(totalMb) : "0 MB",             color: "#06b6d4" },
              { label: "Fichiers",     value: totalFiles > 0 ? totalFiles.toLocaleString() : "0", color: "#94a3b8" },
            ].map(s => (
              <div key={s.label} style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${s.color}50`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 9, color: "#374151", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={handleClean} disabled={!canClean}
              style={{
                flex: 1, padding: "11px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                cursor: canClean ? "pointer" : "not-allowed", opacity: canClean ? 1 : 0.4,
                background: canClean ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${canClean ? "rgba(6,182,212,0.35)" : "rgba(255,255,255,0.07)"}`,
                borderLeft: `3px solid ${canClean ? "#06b6d4" : "rgba(255,255,255,0.15)"}`,
                color: canClean ? "#06b6d4" : "#374151",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (canClean) e.currentTarget.style.filter = "brightness(1.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
            >
              {cleaning ? (
                <><div className="animate-spin" style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(6,182,212,0.2)", borderTopColor: "#06b6d4" }} /> Nettoyage...</>
              ) : selected.size === 0 ? (
                <><Trash2 size={14} /> Sélectionnez des catégories</>
              ) : (
                <><Sparkles size={14} /> Nettoyer — {fmt(totalMb)}</>
              )}
            </button>

            <button
              onClick={scan} disabled={scanning || cleaning}
              style={{
                padding: "11px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 6,
                background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", color: "#94a3b8",
                cursor: scanning || cleaning ? "not-allowed" : "pointer",
                opacity: scanning || cleaning ? 0.4 : 1, transition: "all 0.15s", flexShrink: 0,
              }}
              onMouseEnter={e => { if (!scanning && !cleaning) { e.currentTarget.style.background = "rgba(6,182,212,0.06)"; e.currentTarget.style.borderColor = "rgba(6,182,212,0.25)"; e.currentTarget.style.color = "#06b6d4"; }}}
              onMouseLeave={e => { e.currentTarget.style.background = "#0d0d1f"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#94a3b8"; }}
            >
              <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
              Re-scanner
            </button>
          </div>

          {/* Header catégories */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: "#06b6d4" }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>CATÉGORIES</span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", color: "#06b6d4" }}>
                {categories.length}
              </span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={selectAll} style={{ fontSize: 11, fontWeight: 600, color: "#06b6d4", background: "none", border: "none", cursor: "pointer" }}>
                Tout sélectionner
              </button>
              <button onClick={clearAll} style={{ fontSize: 11, color: "#374151", background: "none", border: "none", cursor: "pointer" }}>
                Effacer
              </button>
            </div>
          </div>

          {/* Banner navigateur opt-in */}
          {categories.some(isBrowserCat) && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 14px", borderRadius: 9, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Globe size={12} style={{ color: "#60a5fa", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "#60a5fa" }}>Données navigateur désactivées par défaut</span>
              </div>
              <button
                onClick={() => setSelected(prev => {
                  const n = new Set(prev);
                  categories.filter(c => isBrowserCat(c) && c.file_count > 0).forEach(c => { if (n.has(c.id)) n.delete(c.id); else n.add(c.id); });
                  return n;
                })}
                style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, cursor: "pointer", background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", flexShrink: 0, whiteSpace: "nowrap" }}
              >
                {categories.filter(c => isBrowserCat(c)).every(c => selected.has(c.id)) ? "Exclure" : "Inclure"}
              </button>
            </div>
          )}

          {/* Liste catégories */}
          <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(6,182,212,0.5)", borderRadius: 10, overflow: "hidden" }}>
            {scanning ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "40px 20px" }}>
                <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(6,182,212,0.15)", borderTopColor: "#06b6d4" }} />
                <span style={{ fontSize: 13, color: "#374151" }}>Analyse en cours...</span>
              </div>
            ) : (
              <div>
                {allMb > 0 && (
                  <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ height: 3, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
                      <div style={{ height: "100%", width: `${(totalMb / allMb) * 100}%`, background: "linear-gradient(90deg,#06b6d4,#f97316)", borderRadius: 2, transition: "width 0.5s" }} />
                    </div>
                  </div>
                )}
                {categories.map((cat, i) => {
                  const sel   = selected.has(cat.id);
                  const empty = cat.file_count === 0;
                  const pct   = allMb > 0 ? (cat.size_mb / allMb) * 100 : 0;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => !empty && setSelected(prev => {
                        const n = new Set(prev);
                        if (n.has(cat.id)) n.delete(cat.id); else n.add(cat.id);
                        return n;
                      })}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "11px 16px",
                        transition: "background 0.12s",
                        borderBottom: i < categories.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        opacity: empty ? 0.4 : 1, cursor: empty ? "default" : "pointer",
                        background: sel ? "rgba(6,182,212,0.05)" : "transparent",
                      }}
                      onMouseEnter={e => { if (!empty) e.currentTarget.style.background = sel ? "rgba(6,182,212,0.09)" : "rgba(255,255,255,0.025)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = sel ? "rgba(6,182,212,0.05)" : "transparent"; }}
                    >
                      <div style={{ color: sel ? "#06b6d4" : "rgba(255,255,255,0.15)", flexShrink: 0 }}>
                        {sel ? <SquareCheck size={14} /> : <Square size={14} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: sel ? "#f8fafc" : "#94a3b8" }}>{cat.label}</span>
                            {cat.requires_admin && (
                              <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>Admin</span>
                            )}
                            {isBrowserCat(cat) && (
                              <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#60a5fa", display: "flex", alignItems: "center", gap: 2 }}><Globe size={7} /> Nav.</span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: sel ? "#06b6d4" : "#374151" }}>
                            {cat.size_mb > 0 ? fmt(cat.size_mb) : "0 MB"}
                          </span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: sel ? "#06b6d4" : "rgba(255,255,255,0.08)", borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 9, color: "#374151", marginTop: 2 }}>{cat.file_count > 0 ? `${cat.file_count} fichiers` : "Vide"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </>}
        </div>
      </div>
    </div>
  );
}
