export default function StatBadge({
  value, warn = 80, crit = 90,
}: {
  value: number; warn?: number; crit?: number;
}) {
  if (value >= crit) return <span className="badge-red">CRITIQUE</span>;
  if (value >= warn) return <span className="badge-yellow">ÉLEVÉ</span>;
  return <span className="badge-green">NORMAL</span>;
}
