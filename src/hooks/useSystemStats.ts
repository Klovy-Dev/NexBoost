import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SystemStats, SystemInfo, History, Peaks } from "../types";
import { INIT_STATS, EMPTY_HISTORY, HISTORY_SIZE } from "../types";

export function useSystemStats() {
  const [stats,       setStats]       = useState<SystemStats>(INIT_STATS);
  const [history,     setHistory]     = useState<History>(EMPTY_HISTORY);
  const [info,        setInfo]        = useState<SystemInfo | null>(null);
  const [ping,        setPing]        = useState(0);
  const [pingHistory, setPingHistory] = useState<number[]>(Array(HISTORY_SIZE).fill(0));
  const [peaks,       setPeaks]       = useState<Peaks>({ cpu: 0, ram: 0, temp: 0 });
  const pingRef                       = useRef(0);

  // Ping toutes les 5s
  useEffect(() => {
    const fetchPing = async () => {
      try {
        const ms = await invoke<number>("measure_ping");
        if (ms > 0) {
          pingRef.current = ms;
          setPing(ms);
          setPingHistory(h => [...h.slice(1), ms]);
        }
      } catch {}
    };
    fetchPing();
    const iv = setInterval(fetchPing, 5000);
    return () => clearInterval(iv);
  }, []);

  // Infos système une seule fois
  useEffect(() => {
    invoke<SystemInfo>("get_system_info")
      .then(setInfo)
      .catch(() => setInfo({
        os_name: "Windows 11", hostname: "PC",
        cpu_brand: "Processeur inconnu", cpu_cores: 8, uptime_secs: 0,
      }));
  }, []);

  // Stats toutes les 2s
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const d = await invoke<SystemStats>("get_system_stats");
        setStats(d);
        setHistory(p => ({
          cpu:  [...p.cpu.slice(1),  d.cpu],
          ram:  [...p.ram.slice(1),  d.ram],
          temp: [...p.temp.slice(1), d.temp],
          disk: [...p.disk.slice(1), d.disk],
        }));
        setPeaks(p => ({
          cpu:  Math.max(p.cpu,  d.cpu),
          ram:  Math.max(p.ram,  d.ram),
          temp: Math.max(p.temp, d.temp),
        }));
      } catch {
        // Données de démo si pas de backend
        const s: SystemStats = {
          cpu: Math.floor(15 + Math.random() * 40),
          ram: Math.floor(45 + Math.random() * 30),
          ram_used_gb: 8.2, ram_total_gb: 16,
          temp: Math.floor(38 + Math.random() * 20),
          disk: Math.floor(60 + Math.random() * 15),
          disk_used_gb: 234, disk_total_gb: 512, cpu_cores: 8,
        };
        setStats(s);
        setHistory(p => ({
          cpu:  [...p.cpu.slice(1),  s.cpu],
          ram:  [...p.ram.slice(1),  s.ram],
          temp: [...p.temp.slice(1), s.temp],
          disk: [...p.disk.slice(1), s.disk],
        }));
        setPeaks(p => ({
          cpu:  Math.max(p.cpu,  s.cpu),
          ram:  Math.max(p.ram,  s.ram),
          temp: Math.max(p.temp, s.temp),
        }));
      }
    };
    fetchStats();
    const iv = setInterval(fetchStats, 2000);
    return () => clearInterval(iv);
  }, []);

  return { stats, history, info, ping, pingHistory, peaks };
}
