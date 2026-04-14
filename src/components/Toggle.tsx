export default function Toggle({ on, color = "#3b82f6" }: { on: boolean; color?: string }) {
  return (
    <div className="toggle-track" style={{ background: on ? color : "#cbd5e1" }}>
      <div className="toggle-thumb" style={{ left: on ? "21px" : "3px" }} />
    </div>
  );
}
