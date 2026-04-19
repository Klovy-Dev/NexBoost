import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Zap, AlertCircle, ArrowLeft, Activity, Shield, Monitor, CheckCircle } from "lucide-react";
import { loginUser, initDatabase, checkEmailExists } from "../lib/db";
import type { UserData } from "../App";
import TitleBar from "../components/TitleBar";
import pcpulseLogo from "../assets/pcpulse-logo.svg";

interface Props { onLogin: (user: UserData) => void; }

const PERKS = [
  { icon: <Activity size={14} />, title: "Monitoring temps réel",  desc: "CPU, RAM, temp à la seconde",    color: "#3b82f6" },
  { icon: <Zap size={14} />,      title: "Boost instantané",        desc: "Optimisations en un clic",       color: "#f59e0b" },
  { icon: <Shield size={14} />,   title: "100% local",              desc: "Rien n'est envoyé hors du PC",  color: "#10b981" },
  { icon: <Monitor size={14} />,  title: "Interface moderne",       desc: "Design épuré, rapide et clair", color: "#8b5cf6" },
];

export default function Login({ onLogin }: Props) {
  const navigate = useNavigate();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [forgotMode,  setForgotMode]  = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent,  setForgotSent]  = useState(false);
  const [forgotLoad,  setForgotLoad]  = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoad(true);
    await new Promise(r => setTimeout(r, 900));
    setForgotLoad(false);
    setForgotSent(true);
  };

  useEffect(() => { initDatabase().catch(console.error); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Veuillez remplir tous les champs."); return; }
    setLoading(true); setError("");
    try {
      const user = await loginUser(email, password);
      if (!user) {
        const exists = await checkEmailExists(email).catch(() => null);
        if (exists === false) {
          setError("Aucun compte trouvé avec cette adresse email.");
        } else {
          setError("Mot de passe incorrect. Utilisez « Mot de passe oublié ? » si nécessaire.");
        }
        return;
      }
      onLogin(user); navigate("/dashboard");
    } catch {
      setError("Erreur de connexion. Vérifiez votre configuration.");
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
              Bon retour.<br /><span style={{ color: "#3b82f6" }}>Content de vous revoir.</span>
            </h2>
            <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.6, margin: "0 0 22px" }}>
              Connectez-vous pour accéder à votre espace et booster vos performances.
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
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 40px", position: "relative" }}>

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

          <div style={{ width: "100%", maxWidth: 340 }} className="animate-fadeIn">
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <img src={pcpulseLogo} alt="PCPulse" style={{ width: 42, height: 42, borderRadius: 11, margin: "0 auto 10px", display: "block" }} />
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 12, color: "#f8fafc", letterSpacing: "0.12em" }}>PCPULSE</div>
              <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>PC Optimizer</div>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, padding: "22px 24px",
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", marginBottom: 2 }}>{forgotMode ? "Réinitialiser" : "Connexion"}</div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 18 }}>{forgotMode ? "Entrez votre email pour recevoir un lien" : "Accédez à votre espace optimisation"}</div>

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

              {forgotMode ? (
                forgotSent ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "18px 0" }} className="animate-fadeIn">
                    <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)" }}>
                      <CheckCircle size={20} style={{ color: "#4ade80" }} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc", marginBottom: 4 }}>Email envoyé !</div>
                      <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.6 }}>Si cet email est enregistré, un lien de réinitialisation a été envoyé.</div>
                    </div>
                    <button type="button" onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(""); }} style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>← Retour à la connexion</button>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 5 }}>Adresse email</label>
                      <input type="email" className="input-base" style={{ padding: "9px 12px", fontSize: 12 }} placeholder="votre@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} autoComplete="email" />
                    </div>
                    <button type="submit" disabled={forgotLoad} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: forgotLoad ? "rgba(59,130,246,0.15)" : "linear-gradient(135deg,rgba(59,130,246,0.9),rgba(99,102,241,0.9))", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", cursor: forgotLoad ? "not-allowed" : "pointer", opacity: forgotLoad ? 0.7 : 1, transition: "all 0.18s", boxShadow: forgotLoad ? "none" : "0 2px 12px rgba(59,130,246,0.3)" }}>
                      {forgotLoad ? <><div className="animate-spin" style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff" }} />Envoi...</> : "Envoyer le lien"}
                    </button>
                    <button type="button" onClick={() => setForgotMode(false)} style={{ fontSize: 11, color: "#475569", background: "none", border: "none", cursor: "pointer", textAlign: "center" }}>← Retour à la connexion</button>
                  </form>
                )
              ) : null}
              {!forgotMode && <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 5 }}>Adresse email</label>
                  <input
                    type="email" className="input-base"
                    style={{ padding: "9px 12px", fontSize: 12 }}
                    placeholder="votre@email.com" value={email}
                    onChange={e => setEmail(e.target.value)} autoComplete="email"
                  />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      style={{ background: "none", border: "none", fontSize: 10, color: "#475569", cursor: "pointer", padding: 0, transition: "color 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#3b82f6"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#475569"; }}
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"} className="input-base"
                      style={{ padding: "9px 36px 9px 12px", fontSize: 12 }}
                      placeholder="••••••••" value={password}
                      onChange={e => setPassword(e.target.value)} autoComplete="current-password"
                    />
                    <button
                      type="button" onClick={() => setShowPass(!showPass)}
                      style={{
                        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 0,
                      }}
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit" disabled={loading}
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
                      Connexion...
                    </>
                  ) : (
                    <><Zap size={13} /> Se connecter</>
                  )}
                </button>
              </form>}

              {!forgotMode && (
              <div style={{ marginTop: 16, paddingTop: 14, textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize: 11, color: "#475569" }}>Pas encore de compte ?{" "}</span>
                <Link to="/register" style={{ fontSize: 11, fontWeight: 600, color: "#3b82f6", textDecoration: "none" }}>
                  Créer un compte
                </Link>
              </div>
              )}
            </div>

            <p style={{ textAlign: "center", fontSize: 10, color: "#475569", marginTop: 12 }}>
              Vos données restent sur votre PC — rien n'est partagé
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
