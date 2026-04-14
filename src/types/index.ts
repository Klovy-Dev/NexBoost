export interface SystemStats {
  cpu: number; ram: number; ram_used_gb: number; ram_total_gb: number;
  temp: number; disk: number; disk_used_gb: number; disk_total_gb: number; cpu_cores: number;
}
export interface SystemInfo {
  os_name: string; hostname: string; cpu_brand: string; cpu_cores: number; uptime_secs: number;
}
export interface ProcessInfo   { pid: number; name: string; cpu: number; memory_mb: number; }
export interface NetworkStats  {
  name: string; bytes_sent: number; bytes_recv: number;
  packets_sent: number; packets_recv: number; send_kbs: number; recv_kbs: number;
}
export interface CleanResult    { freed_mb: number; files_deleted: number; files_skipped: number; }
export interface BenchmarkResult { cpu_score: number; ram_score: number; disk_score: number; total_score: number; duration_ms: number; }
export interface TweakResult   { success: boolean; message: string; }
export interface TweakStatus   { id: string; active: boolean; }
export interface GpuStats      { name: string; usage: number; temp: number; vram_used_mb: number; vram_total_mb: number; }
export interface StartupProgram { name: string; command: string; location: string; enabled: boolean; }
export interface CleanCategory  { id: string; label: string; size_mb: number; file_count: number; }
export interface InstalledGame  { name: string; platform: string; install_path: string; size_gb: number; }

export type Tab = "dashboard" | "performance" | "network" | "cleanup" | "games" | "system";

export type History = { cpu: number[]; ram: number[]; temp: number[]; disk: number[] };
export type Peaks   = { cpu: number; ram: number; temp: number };

export const HISTORY_SIZE = 30;

export const INIT_STATS: SystemStats = {
  cpu: 0, ram: 0, ram_used_gb: 0, ram_total_gb: 0,
  temp: 0, disk: 0, disk_used_gb: 0, disk_total_gb: 0, cpu_cores: 0,
};

export const EMPTY_HISTORY: History = {
  cpu:  Array(HISTORY_SIZE).fill(0),
  ram:  Array(HISTORY_SIZE).fill(0),
  temp: Array(HISTORY_SIZE).fill(0),
  disk: Array(HISTORY_SIZE).fill(0),
};
