export default function RingProgress({
  percent, color, size = 64,
}: {
  percent: number; color: string; size?: number;
}) {
  const strokeW = Math.max(4, size / 14);
  const r       = (size - strokeW * 2) / 2;
  const circ    = 2 * Math.PI * r;
  const offset  = circ - (Math.min(percent, 100) / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      {/* Piste de fond */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeW} />
      {/* Arc de progression */}
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}
