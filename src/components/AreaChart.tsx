interface Props {
  data:    number[];
  color:   string;
  max?:    number;
  height?: number;
}

export default function AreaChart({ data, color, max = 100, height = 60 }: Props) {
  if (data.length < 2) return <div style={{ height }} />;

  const W = 400;
  const H = height;
  const pad = 3; // évite que la ligne soit coupée en haut

  const toY = (v: number) => pad + (1 - Math.min(Math.max(v, 0), max) / max) * (H - pad * 2);

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: toY(v),
  }));

  // Courbe smooth via cubic bezier (point de contrôle au milieu horizontal)
  let linePath = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const cpx = ((p0.x + p1.x) / 2).toFixed(1);
    linePath += ` C ${cpx} ${p0.y.toFixed(1)} ${cpx} ${p1.y.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  const last  = pts[pts.length - 1];
  const first = pts[0];
  const areaPath = `${linePath} L ${last.x.toFixed(1)} ${H} L ${first.x.toFixed(1)} ${H} Z`;

  // ID unique basé sur la couleur (pas de # car invalide dans un ID SVG)
  const gradId = `ac${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* Ligne de grille légère à mi-hauteur */}
      <line x1="0" y1={H * 0.5} x2={W} y2={H * 0.5}
        stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
      {/* Zone de remplissage */}
      <path d={areaPath} fill={`url(#${gradId})`} />
      {/* Ligne principale */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
