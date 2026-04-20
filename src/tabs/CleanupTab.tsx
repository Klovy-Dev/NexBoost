import { useState, useEffect } from "react";
import { Trash2, RefreshCw, CheckCircle, MemoryStick, Globe, Recycle, HardDrive, Search, FolderOpen, FileSearch } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { CleanCategory, CleanResult } from "../types";

type QuickAction  = "ram" | "recycle" | "dns" | "cleandisk";
type QuickState   = { loading: boolean; result: string | null };
type LargeFile    = { path: string; size_mb: number; name: string };
type RamCleanResult = { before_mb: number; after_mb: number; freed_mb: number };
type InnerTab     = "cleanup" | "large_files" | "quick";

const S = {
  bg:      "#0d0d0d",
  surface: "#161616",
  border:  "rgba(255,255,255,0.06)",
  accent:  "#3b82f6",
  text:    "#ffffff",
  text2:   "#9ca3af",
  text3:   "#4b5563",
};

const BROWSER_KW = ["chrome","firefox","edge","brave","opera","chromium","browser","safari"];
const isBrowserCat = (c: CleanCategory) => BROWSER_KW.some(k => c.id.toLowerCase().includes(k) || c.label.toLowerCase().includes(k));
const fmt = (mb: number) => mb >= 1024 ? `${(mb/1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;

export default function CleanupTab() {
  const [innerTab,    setInnerTab]    = useState<InnerTab>("cleanup");
  const [categories,  setCategories]  = useState<CleanCategory[]>([]);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [scanning,    setScanning]    = useState(false);
  const [cleaning,    setCleaning]    = useState(false);
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [includeBrowsers, setIncludeBrowsers] = useState(false);
  const [largeFiles,  setLargeFiles]  = useState<LargeFile[]>([]);
  const [lfScanning,  setLfScanning]  = useState(false);
  const [lfMinMb,     setLfMinMb]     = useState(100);
  const [lfScanned,   setLfScanned]   = useState(false);
  const [quick, setQuick] = useState<Record<QuickAction, QuickState>>({
    ram:       { loading: false, result: null },
    recycle:   { loading: false, result: null },
    dns:       { loading: false, result: null },
    cleandisk: { loading: false, result: null },
  });

  useEffect(() => { scan(); }, []);

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
      if (result.freed_mb > 0 || result.files_deleted > 0) localStorage.setItem("pcpulse_last_cleaned", new Date().toISOString());
      await scan();
    } catch { setCleanResult({ freed_mb: 0, files_deleted: 0, files_skipped: 0 }); }
    finally { setCleaning(false); }
  };

  const toggleBrowsers = () => {
    const next = !includeBrowsers;
    setIncludeBrowsers(next);
    setSelected(prev => {
      const s = new Set(prev);
      categories.filter(isBrowserCat).forEach(c => { if (next && c.file_count > 0) s.add(c.id); else s.delete(c.id); });
      return s;
    });
  };

  const openFileLocation = async (path: string) => {
    const parts = path.split("\\");
    for (let i = parts.length - 1; i >= 1; i--) {
      try { await invoke("open_path", { path: parts.slice(0, i).join("\\") }); return; } catch {}
    }
  };

  const scanLargeFiles = async () => {
    setLfScanning(true); setLargeFiles([]);
    try { setLargeFiles(await invoke<LargeFile[]>("find_large_files", { min_mb: lfMinMb })); } catch { setLargeFiles([]); }
    setLfScanning(false); setLfScanned(true);
  };

  const runQuick = async (action: QuickAction) => {
    setQuick(q => ({ ...q, [action]: { loading: true, result: null } }));
    try {
      if (action === "ram") {
        const res = await invoke<RamCleanResult>("clean_ram");
        setQuick(q => ({ ...q, ram: { loading: false, result: res.freed_mb > 0 ? `−${fmt(res.freed_mb)}` : "Nettoyée" } }));
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
    } catch { setQuick(q => ({ ...q, [action]: { loading: false, result: "Erreur" } })); }
    setTimeout(() => setQuick(q => ({ ...q, [action]: { ...q[action], result: null } })), 4000);
  };

  const allMb      = categories.reduce((s, c) => s + c.size_mb, 0);
  const totalFiles = categories.filter(c => selected.has(c.id)).reduce((s, c) => s + c.file_count, 0);
  const totalMb    = categories.filter(c => selected.has(c.id)).reduce((s, c) => s + c.size_mb, 0);
  const canClean   = !cleaning && !scanning && selected.size > 0 && totalFiles > 0;

  const QUICK_ACTIONS = [
    { key: "ram"       as QuickAction, icon: <MemoryStick size={18} />, label: "Vider la RAM",        desc: "Libère la mémoire vive non utilisée",     color: "#8b5cf6" },
    { key: "recycle"   as QuickAction, icon: <Recycle     size={18} />, label: "Vider la corbeille",  desc: "Supprime définitivement les fichiers",    color: "#4ade80" },
    { key: "dns"       as QuickAction, icon: <Globe       size={18} />, label: "Vider le cache DNS",  desc: "Résout les problèmes de DNS en cache",    color: "#06b6d4" },
    { key: "cleandisk" as QuickAction, icon: <HardDrive   size={18} />, label: "CleanDisk Windows",   desc: "Lance l'outil de nettoyage de Windows",   color: "#fbbf24" },
  ];

  const lastCleaned = (() => {
    const v = localStorage.getItem("pcpulse_last_cleaned");
    if (!v) return null;
    const d = new Date(v);
    const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return "Hier";
    if (diff < 7) return `Il y a ${diff} jours`;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  })();

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px", background: S.bg, display: "flex", flexDirection: "column", gap: 20 }} className="animate-fadeIn">

      {/* ══ HEADER ══ */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Trash2 size={18} style={{ color: "#06b6d4" }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: S.text, margin: 0 }}>
              Cleaner
              <span style={{ fontSize: 12, fontWeight: 400, color: S.text3, marginLeft: 10 }}>
                {scanning ? "Analyse..." : `${fmt(allMb)} détectés`}
                {lastCleaned && <span style={{ marginLeft: 8 }}>· Dernière analyse : {lastCleaned}</span>}
              </span>
            </h1>
          </div>
          <p style={{ fontSize: 12, color: S.text3, margin: 0 }}>Libérez de l'espace en supprimant les fichiers système et d'application qui ne sont plus nécessaires.</p>
        </div>
        <button
          onClick={scan} disabled={scanning}
          style={{ padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.22)", color: "#22d3ee", cursor: scanning ? "not-allowed" : "pointer" }}
          onMouseEnter={e => { if (!scanning) e.currentTarget.style.background = "rgba(6,182,212,0.18)"; }}
          onMouseLeave={e => { if (!scanning) e.currentTarget.style.background = "rgba(6,182,212,0.1)"; }}
        >
          {scanning ? <div className="animate-spin" style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(6,182,212,0.2)", borderTopColor: "#22d3ee" }} /> : <RefreshCw size={13} />}
          {scanning ? "Analyse..." : "Analyser"}
        </button>
      </div>

      {/* ══ TABS ══ */}
      <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, gap: 0 }}>
        {([
          ["cleanup",    <Trash2 size={13} />,      "Nettoyage des indésirables"],
          ["large_files",<FileSearch size={13} />,  "Trouver des fichiers volumineux"],
          ["quick",      <Recycle size={13} />,     "Actions rapides"],
        ] as [InnerTab, React.ReactNode, string][]).map(([id, icon, label]) => (
          <button
            key={id} onClick={() => setInnerTab(id)}
            style={{
              padding: "10px 18px", background: "none", border: "none",
              color: innerTab === id ? S.accent : S.text3,
              borderBottom: `2px solid ${innerTab === id ? S.accent : "transparent"}`,
              fontSize: 13, fontWeight: innerTab === id ? 600 : 400,
              cursor: "pointer", marginBottom: -1, display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ══ NETTOYAGE ══ */}
      {innerTab === "cleanup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Browser toggle banner */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${S.border}`, marginBottom: 4 }}>
            <div style={{ fontSize: 12, color: S.text2 }}>
              <span style={{ fontWeight: 600 }}>Navigateurs</span>
              <span style={{ color: S.text3, marginLeft: 8 }}>Les fichiers de navigateurs sont exclus par défaut</span>
            </div>
            <button
              onClick={toggleBrowsers}
              style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 6, background: includeBrowsers ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${includeBrowsers ? "rgba(6,182,212,0.3)" : S.border}`, color: includeBrowsers ? "#22d3ee" : S.text3, cursor: "pointer" }}
            >
              {includeBrowsers ? "Exclure" : "Inclure"}
            </button>
          </div>

          {cleanResult && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, marginBottom: 8, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.15)" }}>
              <CheckCircle size={13} style={{ color: "#4ade80" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>{fmt(cleanResult.freed_mb)} libérés · {cleanResult.files_deleted} fichiers supprimés</span>
            </div>
          )}

          {scanning ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "24px 0", color: S.text3, fontSize: 13 }}>
              <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(6,182,212,0.2)", borderTopColor: "#22d3ee" }} />
              Analyse en cours...
            </div>
          ) : (
            categories.map(cat => {
              const sel = selected.has(cat.id);
              const isBrowser = isBrowserCat(cat);
              return (
                <div
                  key={cat.id}
                  onClick={() => cat.file_count > 0 && setSelected(p => { const s = new Set(p); if (sel) s.delete(cat.id); else s.add(cat.id); return s; })}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "13px 4px",
                    borderBottom: `1px solid rgba(255,255,255,0.04)`,
                    cursor: cat.file_count > 0 ? "pointer" : "default",
                    opacity: cat.file_count === 0 ? 0.4 : 1,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (cat.file_count > 0) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Checkbox */}
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${sel ? "#3b82f6" : S.text3}`, background: sel ? "#3b82f6" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {sel && <div style={{ width: 8, height: 6, borderLeft: "2px solid #fff", borderBottom: "2px solid #fff", transform: "rotate(-45deg) translate(1px,-1px)" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: sel ? S.text : S.text2 }}>{cat.label}</span>
                      {isBrowser && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(6,182,212,0.1)", color: "#22d3ee" }}>Nav.</span>}
                      {cat.requires_admin && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>Admin</span>}
                    </div>
                    <div style={{ fontSize: 11, color: S.text3, marginTop: 2 }}>{cat.file_count} fichier{cat.file_count > 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: cat.size_mb > 0 ? "#06b6d4" : S.text3, fontFamily: "monospace" }}>
                    {cat.size_mb > 0 ? fmt(cat.size_mb) : "—"}
                  </div>
                </div>
              );
            })
          )}

          {/* Bottom bar */}
          <div style={{ position: "sticky", bottom: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 0", marginTop: 8, borderTop: `1px solid ${S.border}`, background: S.bg }}>
            <div style={{ fontSize: 12, color: S.text3 }}>
              <span style={{ fontWeight: 600, color: S.text2 }}>{selected.size}</span> catégories · <span style={{ fontWeight: 600, color: "#06b6d4" }}>{totalFiles > 0 ? fmt(totalMb) : "—"}</span> à supprimer
            </div>
            <button
              onClick={handleClean} disabled={!canClean}
              style={{ padding: "9px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, background: canClean ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${canClean ? "rgba(6,182,212,0.3)" : S.border}`, color: canClean ? "#22d3ee" : S.text3, cursor: canClean ? "pointer" : "not-allowed" }}
              onMouseEnter={e => { if (canClean) e.currentTarget.style.background = "rgba(6,182,212,0.2)"; }}
              onMouseLeave={e => { if (canClean) e.currentTarget.style.background = "rgba(6,182,212,0.12)"; }}
            >
              {cleaning ? <><div className="animate-spin" style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(6,182,212,0.2)", borderTopColor: "#22d3ee" }} />Nettoyage...</> : <><Trash2 size={13} />Nettoyer maintenant</>}
            </button>
          </div>
        </div>
      )}

      {/* ══ GROS FICHIERS ══ */}
      {innerTab === "large_files" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: S.text2 }}>Taille minimale :</span>
            {[50, 100, 250, 500, 1000].map(v => (
              <button
                key={v} onClick={() => setLfMinMb(v)}
                style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: lfMinMb === v ? "rgba(59,130,246,0.12)" : "transparent", border: `1px solid ${lfMinMb === v ? "rgba(59,130,246,0.3)" : S.border}`, color: lfMinMb === v ? "#60a5fa" : S.text3, cursor: "pointer" }}
              >
                {v >= 1000 ? "1 GB" : `${v} MB`}
              </button>
            ))}
            <button
              onClick={scanLargeFiles} disabled={lfScanning}
              style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.22)", color: "#60a5fa", cursor: lfScanning ? "not-allowed" : "pointer" }}
            >
              {lfScanning ? <div className="animate-spin" style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(59,130,246,0.2)", borderTopColor: "#3b82f6" }} /> : <Search size={13} />}
              {lfScanning ? "Recherche..." : "Rechercher"}
            </button>
          </div>

          {lfScanned && largeFiles.length === 0 && !lfScanning && (
            <div style={{ padding: "32px 0", textAlign: "center", color: S.text3, fontSize: 13 }}>
              Aucun fichier trouvé pour la taille sélectionnée.
            </div>
          )}

          {largeFiles.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(59,130,246,0.08)", flexShrink: 0 }}>
                <HardDrive size={15} style={{ color: "#60a5fa" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: S.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                <div style={{ fontSize: 10, color: S.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{f.path}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", fontFamily: "monospace", flexShrink: 0 }}>{fmt(f.size_mb)}</div>
              <button
                onClick={() => openFileLocation(f.path)}
                style={{ width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: `1px solid ${S.border}`, color: S.text3, cursor: "pointer", flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = S.text2; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = S.text3; }}
              >
                <FolderOpen size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ══ ACTIONS RAPIDES ══ */}
      {innerTab === "quick" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {QUICK_ACTIONS.map(({ key, icon, label, desc, color }) => {
            const state = quick[key];
            return (
              <button
                key={key}
                onClick={() => runQuick(key)}
                disabled={state.loading}
                style={{
                  padding: "20px 22px", borderRadius: 12, textAlign: "left", cursor: state.loading ? "not-allowed" : "pointer",
                  background: state.result ? `${color}0a` : S.surface,
                  border: `1px solid ${state.result ? `${color}35` : S.border}`,
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!state.loading) e.currentTarget.style.borderColor = `${color}35`; }}
                onMouseLeave={e => { if (!state.result) e.currentTarget.style.borderColor = S.border; }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}15`, color: state.loading ? color : color, marginBottom: 12 }}>
                  {state.loading ? <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${color}30`, borderTopColor: color }} /> : icon}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: state.result ? color : S.text, marginBottom: 4 }}>
                  {state.result ?? label}
                </div>
                <div style={{ fontSize: 11, color: S.text3 }}>{desc}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
