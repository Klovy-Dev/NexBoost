import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw, Search, X, ArrowUpDown, AlertCircle, Monitor } from "lucide-react";
import type { ProcessInfo } from "../types";

type SortKey = "cpu" | "memory_mb" | "name" | "pid";

const HIDDEN = ["Memory Compression", "Registry", "Secure System", "System", "Idle"];

export default function ProcessTab() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [search,    setSearch]    = useState("");
  const [sortKey,   setSortKey]   = useState<SortKey>("cpu");
  const [sortAsc,   setSortAsc]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [killing,   setKilling]   = useState<number | null>(null);
  const [killError, setKillError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProcesses = async (silent = false) => {
    if (document.hidden) return;
    if (!silent) setLoading(true);
    try { const list = await invoke<ProcessInfo[]>("get_processes"); setProcesses(list); }
    catch {}
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    fetchProcesses();
    intervalRef.current = setInterval(() => fetchProcesses(true), 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleKill = async (pid: number, name: string) => {
    setKilling(pid); setKillError(null);
    try {
      await invoke("kill_process", { pid });
      setProcesses(p => p.filter(pr => pr.pid !== pid));
    } catch {
      setKillError(`Impossible de terminer ${name} (PID ${pid})`);
      setTimeout(() => setKillError(null), 3000);
    } finally { setKilling(null); }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(key === "name"); }
  };

  const filtered = processes
    .filter(p => !HIDDEN.includes(p.name))
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mul = sortAsc ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      return mul * (a[sortKey] - b[sortKey]);
    });

  const totalCpu = processes.reduce((s, p) => s + p.cpu, 0);
  const totalRam = processes.reduce((s, p) => s + p.memory_mb, 0);
  const fmtRam   = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
  const cpuColor = totalCpu > 80 ? "#f87171" : totalCpu > 50 ? "#fbbf24" : "#8b5cf6";

  const SORT_LABELS: Record<SortKey, string> = { cpu: "CPU", memory_mb: "RAM", name: "Nom", pid: "PID" };

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "28px 32px" }} className="animate-fadeIn">

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Monitor size={20} style={{ color: "#8b5cf6" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>Votre PC</h1>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "3px 0 0" }}>
              {processes.length > 0 ? `${filtered.length} processus actifs` : "Gestionnaire des processus"}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchProcesses()}
          disabled={loading}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 8, background: "#3b82f6", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Processus",     value: processes.filter(p => !HIDDEN.includes(p.name)).length, color: "#8b5cf6" },
          { label: "Filtrés",       value: filtered.length,                                         color: "#3b82f6" },
          { label: "CPU total",     value: `${totalCpu.toFixed(1)}%`,                               color: cpuColor  },
          { label: "RAM processus", value: fmtRam(totalRam),                                        color: "#a78bfa" },
        ].map(s => (
          <div key={s.label} style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Recherche + Tri ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Rechercher un processus..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-base"
            style={{ paddingLeft: 36, paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex" }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Boutons tri */}
        <div style={{ display: "flex", gap: 6 }}>
          {(["cpu", "memory_mb", "name", "pid"] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => handleSort(key)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", background: sortKey === key ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${sortKey === key ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.07)"}`, color: sortKey === key ? "#a78bfa" : "#9ca3af" }}
            >
              {SORT_LABELS[key]}
              <ArrowUpDown size={11} style={{ opacity: sortKey === key ? 1 : 0.4 }} />
              {sortKey === key && <span style={{ fontSize: 10 }}>{sortAsc ? "↑" : "↓"}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Erreur kill */}
      {killError && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 12, borderRadius: 9, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#f87171" }} className="animate-fadeIn">
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          {killError}
        </div>
      )}

      {/* ── Table processus ── */}
      <div style={{ background: "#161616", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, overflow: "hidden" }}>
        {/* En-tête */}
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 140px 120px 46px", padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: 8, alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
          {[
            { col: "pid" as SortKey,       label: "PID"  },
            { col: "name" as SortKey,      label: "Nom"  },
            { col: "cpu" as SortKey,       label: "CPU"  },
            { col: "memory_mb" as SortKey, label: "RAM"  },
          ].map(({ col, label }) => (
            <button key={col} onClick={() => handleSort(col)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: sortKey === col ? "#8b5cf6" : "#6b7280", padding: 0 }}>
              {label}
              <ArrowUpDown size={9} style={{ opacity: sortKey === col ? 1 : 0.4 }} />
            </button>
          ))}
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#6b7280" }}>Fin</span>
        </div>

        {/* Lignes */}
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {loading && processes.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px 20px" }}>
              <div className="animate-spin" style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.15)", borderTopColor: "#8b5cf6" }} />
              <span style={{ fontSize: 13, color: "#6b7280" }}>Chargement des processus...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 13, color: "#6b7280" }}>
              {search ? `Aucun résultat pour « ${search} »` : "Aucun processus"}
            </div>
          ) : (
            filtered.map((proc, i) => {
              const cpuHigh = proc.cpu > 20;
              const ramHigh = proc.memory_mb > 512;
              return (
                <div
                  key={proc.pid}
                  style={{ display: "grid", gridTemplateColumns: "60px 1fr 140px 120px 46px", padding: "9px 18px", gap: 8, alignItems: "center", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.1s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#4b5563" }}>{proc.pid}</span>

                  <span style={{ fontSize: 12, fontWeight: 500, color: "#d1d5db", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={proc.name}>
                    {proc.name}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, proc.cpu)}%`, background: cpuHigh ? "#ef4444" : "#8b5cf6", borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: cpuHigh ? "#f87171" : "#a78bfa", minWidth: 42, textAlign: "right" }}>
                      {proc.cpu.toFixed(1)}%
                    </span>
                  </div>

                  <span style={{ fontSize: 12, fontFamily: "monospace", color: ramHigh ? "#fbbf24" : "#9ca3af", textAlign: "right" }}>
                    {fmtRam(proc.memory_mb)}
                  </span>

                  <button
                    onClick={() => handleKill(proc.pid, proc.name)}
                    disabled={killing === proc.pid}
                    style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", cursor: killing === proc.pid ? "not-allowed" : "pointer", opacity: killing === proc.pid ? 0.5 : 1 }}
                    onMouseEnter={e => { if (killing !== proc.pid) { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                    title={`Terminer ${proc.name}`}
                  >
                    {killing === proc.pid
                      ? <div className="animate-spin" style={{ width: 11, height: 11, borderRadius: "50%", border: "2px solid rgba(239,68,68,0.2)", borderTopColor: "#ef4444" }} />
                      : <X size={11} />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 12, color: "#8b5cf6" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6", boxShadow: "0 0 5px #8b5cf6" }} />
        Mise à jour automatique toutes les 4s
      </div>
    </div>
  );
}
