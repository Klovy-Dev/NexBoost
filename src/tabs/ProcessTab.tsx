import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCw, Search, X, Cpu, MemoryStick, ArrowUpDown, AlertCircle, ListFilter } from "lucide-react";
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
  const fmtRam   = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
  const cpuColor = totalCpu > 80 ? "#f87171" : totalCpu > 50 ? "#fbbf24" : "#8b5cf6";
  const ramPct   = Math.min(100, (totalRam / (16 * 1024)) * 100);

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(col)}
      style={{
        display: "flex", alignItems: "center", gap: 3,
        background: "none", border: "none", cursor: "pointer",
        fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
        color: sortKey === col ? "#8b5cf6" : "#475569",
      }}
    >
      {label}
      <ArrowUpDown size={8} style={{ opacity: sortKey === col ? 1 : 0.4 }} />
    </button>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", height: "100%", overflow: "hidden" }} className="animate-fadeIn">

      {/* ═══ COLONNE GAUCHE : Stats ═══ */}
      <div style={{
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "rgba(0,0,0,0.15)",
      }}>
        <div style={{ padding: "20px 18px 16px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
              <ListFilter size={18} style={{ color: "#8b5cf6" }} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#e2e8f0", margin: 0 }}>Processus</h2>
              <p style={{ fontSize: 10, color: "#374151", marginTop: 2 }}>Gestionnaire des tâches</p>
            </div>
          </div>

          {/* Total processus */}
          <div style={{ background: "#0d0d1f", border: "1px solid rgba(139,92,246,0.18)", borderLeft: "3px solid #8b5cf6", borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 800, fontFamily: "monospace", color: "#8b5cf6", lineHeight: 1 }}>
                {processes.length > 0 ? filtered.length : "—"}
              </span>
              {processes.length > 0 && <span style={{ fontSize: 14, color: "#374151" }}>/{processes.filter(p => !HIDDEN.includes(p.name)).length}</span>}
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#374151", marginTop: 4 }}>
              PROCESSUS {search ? "FILTRÉS" : "ACTIFS"}
            </div>
          </div>
        </div>

        {/* CPU + RAM */}
        <div style={{ flex: 1, overflow: "auto", padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: "#8b5cf6" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#374151" }}>RESSOURCES</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {/* CPU */}
            <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${cpuColor}60`, borderRadius: 8, padding: "12px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Cpu size={11} style={{ color: cpuColor }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>CPU total</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace", color: cpuColor }}>{totalCpu.toFixed(1)}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(totalCpu, 100)}%`, background: cpuColor, borderRadius: 2, transition: "width 0.5s" }} />
              </div>
            </div>

            {/* RAM */}
            <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(139,92,246,0.6)", borderRadius: 8, padding: "12px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <MemoryStick size={11} style={{ color: "#8b5cf6" }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>RAM processus</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace", color: "#8b5cf6" }}>{fmtRam(totalRam)}</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${ramPct}%`, background: "#8b5cf6", borderRadius: 2, transition: "width 0.5s" }} />
              </div>
            </div>
          </div>

          {/* Tri actif */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <div style={{ width: 3, height: 12, borderRadius: 2, background: "#8b5cf6" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#374151" }}>TRI ACTIF</span>
          </div>
          <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, overflow: "hidden" }}>
            {(["cpu", "memory_mb", "name", "pid"] as SortKey[]).map((key, i) => {
              const labels: Record<SortKey, string> = { cpu: "CPU", memory_mb: "RAM", name: "Nom", pid: "PID" };
              const active = sortKey === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px", background: active ? "rgba(139,92,246,0.08)" : "transparent",
                    border: "none", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = active ? "rgba(139,92,246,0.08)" : "transparent"; }}
                >
                  <span style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? "#8b5cf6" : "#94a3b8" }}>{labels[key]}</span>
                  {active && (
                    <span style={{ fontSize: 9, color: "#8b5cf6" }}>{sortAsc ? "↑ ASC" : "↓ DESC"}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Actualisation */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 14, fontSize: 10, color: "#8b5cf6" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6", boxShadow: "0 0 5px #8b5cf6" }} />
            Mise à jour toutes les 4s
          </div>
        </div>
      </div>

      {/* ═══ COLONNE DROITE : Tableau processus ═══ */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Barre de recherche */}
        <div style={{ padding: "14px 18px 10px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "0 12px" }}>
              <Search size={13} style={{ color: "#374151", flexShrink: 0 }} />
              <input
                type="text" placeholder="Rechercher un processus..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 12, color: "#f8fafc", padding: "9px 0" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#374151", display: "flex" }}>
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              onClick={() => fetchProcesses()} disabled={loading}
              style={{
                padding: "0 14px", borderRadius: 8,
                display: "flex", alignItems: "center", gap: 6,
                background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", color: "#94a3b8",
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(139,92,246,0.08)"; e.currentTarget.style.color = "#8b5cf6"; }}}
              onMouseLeave={e => { e.currentTarget.style.background = "#0d0d1f"; e.currentTarget.style.color = "#94a3b8"; }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {killError && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 7, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 11, color: "#f87171", marginTop: 8 }} className="animate-fadeIn">
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              {killError}
            </div>
          )}
        </div>

        {/* Tableau */}
        <div style={{ flex: 1, margin: "10px 18px 14px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#0d0d1f", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(139,92,246,0.5)", borderRadius: 10, overflow: "hidden", flex: 1, display: "flex", flexDirection: "column" }}>
            {/* En-têtes */}
            <div style={{ display: "grid", gridTemplateColumns: "55px 1fr 130px 110px 46px", padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: 8, alignItems: "center", flexShrink: 0, background: "rgba(255,255,255,0.02)" }}>
              <SortBtn col="pid"       label="PID"   />
              <SortBtn col="name"      label="Nom"   />
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Cpu size={9} style={{ color: "#8b5cf6" }} />
                <SortBtn col="cpu" label="CPU" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <MemoryStick size={9} style={{ color: "#8b5cf6" }} />
                <SortBtn col="memory_mb" label="RAM" />
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#475569" }}>FIN</span>
            </div>

            {/* Lignes */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading && processes.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "40px 20px" }}>
                  <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.15)", borderTopColor: "#8b5cf6" }} />
                  <span style={{ fontSize: 13, color: "#374151" }}>Chargement des processus...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: "36px 20px", textAlign: "center", fontSize: 13, color: "#374151" }}>
                  {search ? `Aucun résultat pour « ${search} »` : "Aucun processus"}
                </div>
              ) : (
                filtered.map((proc, i) => {
                  const cpuHigh = proc.cpu > 20;
                  const ramHigh = proc.memory_mb > 512;
                  return (
                    <div
                      key={proc.pid}
                      style={{
                        display: "grid", gridTemplateColumns: "55px 1fr 130px 110px 46px",
                        padding: "7px 16px", gap: 8, alignItems: "center",
                        borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: "#374151" }}>{proc.pid}</span>

                      <span style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={proc.name}>
                        {proc.name}
                      </span>

                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(100, proc.cpu)}%`, background: cpuHigh ? "#ef4444" : "#8b5cf6", borderRadius: 2, transition: "width 0.3s" }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: cpuHigh ? "#ef4444" : "#8b5cf6", minWidth: 38, textAlign: "right" }}>
                          {proc.cpu.toFixed(1)}%
                        </span>
                      </div>

                      <span style={{ fontSize: 11, fontFamily: "monospace", color: ramHigh ? "#f59e0b" : "#8b5cf6", textAlign: "right" }}>
                        {fmtRam(proc.memory_mb)}
                      </span>

                      <button
                        onClick={() => handleKill(proc.pid, proc.name)}
                        disabled={killing === proc.pid}
                        style={{
                          width: 26, height: 26, borderRadius: 5,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)",
                          color: "#ef4444", cursor: killing === proc.pid ? "not-allowed" : "pointer",
                          opacity: killing === proc.pid ? 0.5 : 1, transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { if (killing !== proc.pid) { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}}
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
      </div>
    </div>
  );
}
