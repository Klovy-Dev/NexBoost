import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, UserPlus, AlertCircle, ArrowLeft, BarChart2, Zap, Crown, CheckCircle2 } from "lucide-react";
import { registerUser, loginUser, initDatabase } from "../lib/db";
import type { UserData } from "../App";
import TitleBar from "../components/TitleBar";
import pcpulseLogo from "../assets/pcpulse-logo.svg";

interface Props { onLogin: (user: UserData) => void; }

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caractères minimum", ok: password.length >= 8 },
    { label: "Lettre majuscule",       ok: /[A-Z]/.test(password) },
    { label: "Chiffre",                ok: /[0-9]/.test(password) },
  ];
  const score  = checks.filter(c => c.ok).length;
  const colors = ["#f87171", "#fbbf24", "#34d399"];
  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }} className="animate-fadeIn">
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            height: 3, flex: 1, borderRadius: 2,
            background: i < score ? colors[score - 1] : "rgba(255,255,255,0.07)",
            transition: "all 0.3s",
          }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
        {checks.map(c => (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: c.ok ? "#34d399" : "rgba(255,255,255,0.1)", transition: "all 0.2s" }} />
            <span style={{ fontSize: 10, color: c.ok ? "#94a3b8" : "#475569" }}>{c.label}</span>
          </div>
        ))}
      </div>
      {score === 3 && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 10, color: "#34d399" }} className="animate-fadeIn">
          <CheckCircle2 size={10} /> Mot de passe fort
        </div>
      )}
    </div>
  );
}

const PERKS = [
  { icon: <BarChart2 size={14} />, title: "Monitoring complet",  desc: "Historique 60s, graphiques en direct", color: "#3b82f6" },
  { icon: <Zap size={14} />,       title: "Boost 1 clic",         desc: "Toutes les optimisations d'un coup",   color: "#f59e0b" },
  { icon: <Crown size={14} />,     title: "Pro disponible",       desc: "Profils par jeu, overlay in-game",     color: "#f59e0b" },
];

export default function Register({ onLogin }: Props) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => { initDatabase().catch(console.error); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password || !confirm) { setError("Veuillez remplir tous les champs."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 8)  { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
    setLoading(true); setError("");
    try {
      await registerUser(username, email, password);
      const user = await loginUser(email, password);
      if (!user) throw new Error("Impossible de se connecter après inscription.");
      onLogin(user); navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("UNIQUE") || msg.includes("unique")
        ? "Cet email ou ce pseudo est déjà utilisé."
        : "Erreur lors de l'inscription. Vérifiez votre configuration.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", flexDirection: "column",
      background: "#08080f",
      backgroundImage: `
        radial-gradient(ellipse at 25% 40%, rgba(59,130,246,0.07) 0%, transparent 55%),
        radial-gradient(ellipse at 75% 65%, rgba(99,102,241,0.05) 0%, transparent 50%)
      `,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "24px 24px", pointerEvents: "none",
      }} />
      <TitleBar />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* ── Panneau gauche ── */}
        <div style={{
          width: 290, flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          padding: "28px 24px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
              <img src={pcpulseLogo} alt="PCPulse" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 12, color: "#f8fafc", letterSpacing: "0.12em" }}>PCPULSE</div>
                <div style={{ fontSize: 10, color: "#475569" }}>PC Optimizer</div>
              </div>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", lineHeight: 1.25, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
              Rejoignez<br /><span style={{ color: "#3b82f6" }}>la communauté.</span>
            </h2>
            <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.6, margin: "0 0 22px" }}>
              Compte gratuit, sans carte bancaire. Prêt en moins de 2 minutes.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {PERKS.map(p => (
                <div key={p.title} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: `${p.color}14`, color: p.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{p.icon}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#f8fafc" }}>{p.title}</div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 1 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          }}>
            <span className="badge badge-blue">BIENTÔT</span>
            <p style={{ fontSize: 10, color: "#475569", margin: 0, textAlign: "center", lineHeight: 1.5 }}>
              Les avis utilisateurs arrivent bientôt
            </p>
          </div>
        </div>

        {/* ── Formulaire ── */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 40px", overflow: "auto", position: "relative" }}>

          <button
            onClick={() => navigate("/")}
            style={{
              position: "absolute", top: 14, left: 14,
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 11px", borderRadius: 7, fontSize: 11,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#475569",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          >
            <ArrowLeft size={12} /> Retour
          </button>

          <div style={{ width: "100%", maxWidth: 340, margin: "auto" }} className="animate-fadeIn">
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <img src={pcpulseLogo} alt="PCPulse" style={{ width: 40, height: 40, borderRadius: 11, margin: "0 auto 8px", display: "block" }} />
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 12, color: "#f8fafc", letterSpacing: "0.12em" }}>PCPULSE</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>PC Optimizer</div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "20px 22px",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", marginBottom: 2 }}>Créer un compte</div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 16 }}>Gratuit, sans carte bancaire requise</div>

              {error && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                  borderRadius: 8, marginBottom: 14,
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                }} className="animate-fadeIn">
                  <AlertCircle size={13} style={{ color: "#f87171", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#f87171" }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4 }}>Pseudo</label>
                  <input type="text" className="input-base"
                    style={{ padding: "8px 12px", fontSize: 12 }}
                    placeholder="MonPseudo" value={username}
                    onChange={e => setUsername(e.target.value)} maxLength={24} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4 }}>Adresse email</label>
                  <input type="email" className="input-base"
                    style={{ padding: "8px 12px", fontSize: 12 }}
                    placeholder="votre@email.com" value={email}
                    onChange={e => setEmail(e.target.value)} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4 }}>Mot de passe</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPass ? "text" : "password"} className="input-base"
                      style={{ padding: "8px 36px 8px 12px", fontSize: 12 }}
                      placeholder="••••••••" value={password}
                      onChange={e => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 0 }}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 4 }}>Confirmer le mot de passe</label>
                  <div style={{ position: "relative" }}>
                    <input type={showConfirm ? "text" : "password"} className="input-base"
                      style={{
                        padding: "8px 36px 8px 12px", fontSize: 12,
                        ...(confirm && confirm !== password ? { borderColor: "rgba(239,68,68,0.5)" } : {}),
                      }}
                      placeholder="••••••••" value={confirm}
                      onChange={e => setConfirm(e.target.value)} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 0 }}>
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p style={{ fontSize: 10, color: "#f87171", marginTop: 4 }} className="animate-fadeIn">
                      Les mots de passe ne correspondent pas
                    </p>
                  )}
                </div>

                <button type="submit" disabled={loading}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, marginTop: 2,
                    background: loading ? "rgba(59,130,246,0.15)" : "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.9))",
                    border: "1px solid rgba(255,255,255,0.15)", color: "#fff",
                    cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
                    transition: "all 0.18s",
                    boxShadow: loading ? "none" : "0 2px 12px rgba(59,130,246,0.3)",
                  }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "none"; }}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin" style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff" }} />
                      Création...
                    </>
                  ) : (
                    <><UserPlus size={13} /> Créer mon compte</>
                  )}
                </button>
              </form>

              <div style={{ marginTop: 14, paddingTop: 12, textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 11, color: "#475569" }}>Déjà un compte ?{" "}</span>
                <Link to="/login" style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6", textDecoration: "none" }}>Se connecter</Link>
              </div>
            </div>

            <p style={{ textAlign: "center", fontSize: 10, color: "#475569", marginTop: 10 }}>
              Vos données restent sur votre PC — rien n'est partagé
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
