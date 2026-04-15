import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw, Search, X, Cpu, MemoryStick, ArrowUpDown, AlertCircle } from "lucide-react";
import type { ProcessInfo } from "../types";

type SortKey = "cpu" | "memory_mb" | "name" | "pid";

export default function ProcessTab() {
  const [processes,  setProcesses]  = useState<ProcessInfo[]>([]);
  const [search,     setSearch]     = useState("");
  const [sortKey,    setSortKey]    = useState<SortKey>("cpu");
  const [sortAsc,    setSortAsc]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [killing,    setKilling]    = useState<number | null>(null);
  const [killError,  setKillError]  = useState<string | null>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProcesses = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const list = await invoke<ProcessInfo[]>("get_processes");
      setProcesses(list);
    } catch {}
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    fetchProcesses();
    intervalRef.current = setInterval(() => fetchProcesses(true), 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleKill = async (pid: number, name: string) => {
    setKilling(pid);
    setKillError(null);
    try {
      await invoke("kill_process", { pid });
      setProcesses(p => p.filter(pr => pr.pid !== pid));
    } catch {
      setKillError(`Impossible de terminer ${name} (PID ${pid})`);
      setTimeout(() => setKillError(null), 3000);
    } finally {
      setKilling(null);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(key === "name"); }
  };

  // Processus système Windows qu'il n'est pas utile d'afficher
  const HIDDEN = ["Memory Compression", "Registry", "Secure System", "System", "Idle"];

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

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(col)}
      style={{
        display: "flex", alignItems: "center", gap: 3,
        background: "none", border: "none", cursor: "pointer",
        fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: sortKey === col ? "#38bdf8" : "#4b5563",
        transition: "color 0.15s",
      }}
    >
      {label}
      <ArrowUpDown size={8} style={{ opacity: sortKey === col ? 1 : 0.4 }} />
    </button>
  );

  return (
    <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, height: "100%", overflowY: "auto" }} className="animate-fadeIn">

      {/* ── En-tête ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.2, margin: 0 }}>
            Gestionnaire de processus
          </h1>
          <p style={{ fontSize: 11, color: "#4b5563", marginTop: 5, marginBottom: 0 }}>
            {processes.length} processus actifs · mise à jour toutes les 3 s
          </p>
        </div>

        {/* Mini stats */}
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <div style={{
            background: "#0c0c1a", border: "1px solid rgba(56,189,248,0.15)",
            borderRadius: 10, padding: "10px 14px", textAlign: "center",
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: "#38bdf8", lineHeight: 1 }}>
              {totalCpu.toFixed(1)}%
            </div>
            <div style={{ fontSize: 9, color: "#4b5563", marginTop: 4 }}>CPU total</div>
          </div>
          <div style={{
            background: "#0c0c1a", border: "1px solid rgba(129,140,248,0.15)",
            borderRadius: 10, padding: "10px 14px", textAlign: "center",
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: "#818cf8", lineHeight: 1 }}>
              {totalRam >= 1024 ? `${(totalRam / 1024).toFixed(1)} GB` : `${Math.round(totalRam)} MB`}
            </div>
            <div style={{ fontSize: 9, color: "#4b5563", marginTop: 4 }}>RAM totale</div>
          </div>
        </div>
      </div>

      {/* ── Barre de recherche + refresh ── */}
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 8,
          background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8, padding: "0 12px",
        }}>
          <Search size={13} style={{ color: "#4b5563", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Rechercher un processus..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 12, color: "#f1f5f9", padding: "10px 0",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563", display: "flex" }}>
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => fetchProcesses()}
          disabled={loading}
          style={{
            padding: "0 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1, transition: "all 0.15s",
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(56,189,248,0.06)"; e.currentTarget.style.color = "#38bdf8"; }}}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#94a3b8"; }}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* ── Erreur kill ── */}
      {killError && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: 8,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          fontSize: 11, color: "#f87171", flexShrink: 0,
        }} className="animate-fadeIn">
          <AlertCircle size={12} style={{ flexShrink: 0 }} />
          {killError}
        </div>
      )}

      {/* ── Tableau ── */}
      <div style={{
        background: "#0c0c1a", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10, overflow: "hidden", flex: 1,
      }}>
        {/* Header colonnes */}
        <div style={{
          display: "grid", gridTemplateColumns: "60px 1fr 110px 110px 60px",
          padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          gap: 8, alignItems: "center",
        }}>
          <SortBtn col="pid"       label="PID"   />
          <SortBtn col="name"      label="Nom"   />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Cpu size={9} style={{ color: "#38bdf8" }} />
            <SortBtn col="cpu" label="CPU" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MemoryStick size={9} style={{ color: "#818cf8" }} />
            <SortBtn col="memory_mb" label="RAM" />
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4b5563" }}>
            ACTION
          </span>
        </div>

        {/* Lignes */}
        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 340px)" }}>
          {loading && processes.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "32px 20px" }}>
              <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(56,189,248,0.15)", borderTopColor: "#38bdf8" }} />
              <span style={{ fontSize: 13, color: "#4b5563" }}>Chargement...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 13, color: "#4b5563" }}>
              Aucun processus trouvé
            </div>
          ) : (
            filtered.map((proc, i) => {
              const cpuHigh = proc.cpu > 20;
              const ramHigh = proc.memory_mb > 512;
              return (
                <div
                  key={proc.pid}
                  style={{
                    display: "grid", gridTemplateColumns: "60px 1fr 110px 110px 60px",
                    padding: "8px 14px", gap: 8, alignItems: "center",
                    borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* PID */}
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "#4b5563" }}>
                    {proc.pid}
                  </span>

                  {/* Nom */}
                  <span style={{
                    fontSize: 12, fontWeight: 500, color: "#94a3b8",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }} title={proc.name}>
                    {proc.name}
                  </span>

                  {/* CPU */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        width: `${Math.min(100, proc.cpu)}%`,
                        background: cpuHigh ? "#ef4444" : "#38bdf8",
                        transition: "width 0.3s",
                      }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: cpuHigh ? "#ef4444" : "#38bdf8", minWidth: 38, textAlign: "right" }}>
                      {proc.cpu.toFixed(1)}%
                    </span>
                  </div>

                  {/* RAM */}
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: ramHigh ? "#f59e0b" : "#818cf8", textAlign: "right" }}>
                    {proc.memory_mb >= 1024
                      ? `${(proc.memory_mb / 1024).toFixed(1)} GB`
                      : `${Math.round(proc.memory_mb)} MB`}
                  </span>

                  {/* Kill */}
                  <button
                    onClick={() => handleKill(proc.pid, proc.name)}
                    disabled={killing === proc.pid}
                    style={{
                      width: 26, height: 26, borderRadius: 5,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                      color: "#ef4444", cursor: killing === proc.pid ? "not-allowed" : "pointer",
                      opacity: killing === proc.pid ? 0.5 : 1,
                      transition: "all 0.15s", flexShrink: 0,
                    }}
                    onMouseEnter={e => { if (killing !== proc.pid) { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)"; }}}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)"; }}
                    title={`Terminer ${proc.name}`}
                  >
                    {killing === proc.pid
                      ? <div className="animate-spin" style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(239,68,68,0.2)", borderTopColor: "#ef4444" }} />
                      : <X size={10} />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
