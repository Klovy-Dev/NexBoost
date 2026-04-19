import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SplashScreen from "./pages/SplashScreen";
import Home         from "./pages/Home";
import Login        from "./pages/Login";
import Register     from "./pages/Register";
import Dashboard    from "./pages/Dashboard";
import Onboarding   from "./pages/Onboarding";
import type { Plan, BillingCycle } from "./lib/db";

export interface UserData {
  id:            number;
  username:      string;
  email:         string;
  plan:          Plan;
  planExpiresAt: string | null;
  billingCycle:  BillingCycle | null;
}

export interface PlanActivationData {
  plan:          Plan;
  planExpiresAt: string | null;
  billingCycle:  BillingCycle | null;
}

function App() {
  const [splashDone,  setSplashDone]  = useState(false);
  const [onboarded,   setOnboarded]   = useState(() => localStorage.getItem("pcpulse_onboarded") === "true");
  const [user,        setUser]        = useState<UserData | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("pcpulse_user");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      // Migration de l'ancien format (premium: boolean → plan)
      if (parsed.plan === undefined) {
        parsed.plan          = parsed.premium ? "pro" : "free";
        parsed.planExpiresAt = null;
        parsed.billingCycle  = null;
        delete parsed.premium;
        localStorage.setItem("pcpulse_user", JSON.stringify(parsed));
      }
      setUser(parsed as UserData);
    } catch {}
  }, []);

  const handleLogin = (userData: UserData) => {
    setUser(userData);
    localStorage.setItem("pcpulse_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("pcpulse_user");
  };

  const handlePlanActivated = (planData: PlanActivationData) => {
    if (!user) return;
    const updated: UserData = { ...user, ...planData };
    setUser(updated);
    localStorage.setItem("pcpulse_user", JSON.stringify(updated));
  };

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/onboarding"
          element={<Onboarding onDone={() => setOnboarded(true)} />}
        />
        <Route
          path="/"
          element={
            !onboarded
              ? <Navigate to="/onboarding" replace />
              : user ? <Navigate to="/dashboard" replace /> : <Home />
          }
        />
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/dashboard" replace /> : <Register onLogin={handleLogin} />}
        />
        <Route
          path="/dashboard"
          element={
            user
              ? <Dashboard user={user} onLogout={handleLogout} onPlanActivated={handlePlanActivated} />
              : <Navigate to="/" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
