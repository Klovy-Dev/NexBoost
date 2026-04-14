export default function Sparkline({
  data, color, max = 100, w = 80, h = 28,
}: {
  data: number[]; color: string; max?: number; w?: number; h?: number;
}) {
  if (data.length < 2) return <div style={{ width: w, height: h }} />;
  const pts = data.map((v, i) =>
    `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 2 - Math.min(v / max, 1) * (h - 4)).toFixed(1)}`
  );
  const id = `sp_${color.replace(/[^a-z0-9]/gi, "")}${w}${h}`;
  return (
    <svg width={w} height={h} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={[`0,${h}`, ...pts, `${w},${h}`].join(" ")} fill={`url(#${id})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
