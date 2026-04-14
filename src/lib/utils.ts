export function formatUptime(s: number): string {
  if (s <= 0) return "—";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h > 24) return `${Math.floor(h / 24)}j ${h % 24}h`;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function fmtBytes(b: number): string {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(2)} GB`;
  if (b >= 1_048_576)     return `${(b / 1_048_576).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}

export function fmtSpeed(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB/s` : `${kb.toFixed(0)} KB/s`;
}
