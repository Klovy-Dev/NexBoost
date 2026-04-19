import { Lock } from "lucide-react";

interface Props {
  isPro:    boolean;
  feature:  string;           // Nom de la feature affichée dans le lock
  children: React.ReactNode;
}

/**
 * Enveloppe une section réservée aux utilisateurs Pro.
 * Si l'utilisateur est Free, affiche un overlay verrouillé à la place du contenu.
 */
export default function PlanGate({ isPro, feature, children }: Props) {
  if (isPro) return <>{children}</>;

  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
      {/* Contenu flou non interactif */}
      <div style={{ filter: "blur(3px)", pointerEvents: "none", userSelect: "none", opacity: 0.4 }}>
        {children}
      </div>

      {/* Overlay verrouillé */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "rgba(7,7,13,0.72)",
        gap: 8,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(124,58,237,0.15)",
          border: "1px solid rgba(124,58,237,0.35)",
        }}>
          <Lock size={17} style={{ color: "#a78bfa" }} />
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>{feature}</div>

        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.14em",
          padding: "3px 8px", borderRadius: 4,
          background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(168,85,247,0.3))",
          border: "1px solid rgba(168,85,247,0.45)",
          color: "#c084fc",
        }}>
          PLAN PRO
        </span>

        <p style={{ fontSize: 11, color: "#475569", margin: 0, marginTop: 2 }}>
          Disponible dans Système → Paramètres
        </p>
      </div>
    </div>
  );
}
