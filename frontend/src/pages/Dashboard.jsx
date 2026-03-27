// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import "../styles/dashboard.css";
import { authApi } from "../api/auth";
import { getStoredUser, LS_USER } from "../auth/authService";

export default function Dashboard() {
  const storedUser = getStoredUser();
  const [user, setUser] = useState(storedUser);
  const loading = !storedUser; // derived, not state

  // Mock data (inchangé)
  const stats = [
    { title: "Employés", value: 93, delta: "+5", icon: "👥" },
    { title: "Activités ouvertes", value: 8, delta: "+2", icon: "📅" },
    { title: "Recommandations IA", value: 24, delta: "+12", icon: "🧠" },
    { title: "Score moyen", value: "81%", delta: "+3%", icon: "📈" },
  ];

  const deptScores = [
    { name: "Sinistres", value: 75 },
    { name: "Souscription", value: 80 },
    { name: "IT", value: 78 },
    { name: "Commercial", value: 74 },
    { name: "RH", value: 82 },
    { name: "Actuariat", value: 88 },
  ];

  const skills = [
    { name: "Savoir", value: 40 },
    { name: "Savoir-faire", value: 35 },
    { name: "Savoir-être", value: 25 },
  ];

  const donutColors = ["#3b6fd4", "#f47c20", "#10b981"];

  const recents = [
    { pct: 94, name: "Sarah Benali", activity: "Formation Solvabilité II", status: "Accepté" },
    { pct: 89, name: "Karim Tazi", activity: "Formation Solvabilité II", status: "En attente" },
    { pct: 87, name: "Leila Amrani", activity: "Projet IA - Détection fraude", status: "Accepté" },
    { pct: 92, name: "Youssef Bennani", activity: "Projet IA - Détection fraude", status: "Accepté" },
  ];

  // Refresh user data en arrière-plan (sans bloquer l'affichage)
  useEffect(() => {
    if (!user) return;

    const refresh = async () => {
      try {
        const res = await authApi.me();
        setUser(res.data);
        localStorage.setItem(LS_USER, JSON.stringify(res.data));
      } catch (err) {
        console.log("Refresh /me non critique :", err.message);
        // Ne redirige PAS ici → on garde l'utilisateur du localStorage
      }
    };

    refresh();
  }, []);

  if (loading || !user) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Chargement...</div>;
  }

  return (
    <div className="dash">
      <h1 className="dashTitle">
        Bienvenue {user.name || "Utilisateur"} ({user.role || "?"})
      </h1>
      <p className="dashSubtitle">Vue d'ensemble du système de recommandation</p>

      <div className="statsGrid">
        {stats.map((s) => (
          <div key={s.title} className="statCard">
            <div className="statTop">
              <div className="statIcon">{s.icon}</div>
              <div className="statPill">↗ {s.delta}</div>
            </div>
            <div className="statValue">{s.value}</div>
            <div className="statLabel">{s.title}</div>
          </div>
        ))}
      </div>

      <div className="chartsGrid">
        <div className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Score moyen par département</div>
          </div>
          <div className="chartBox">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptScores} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#3b6fd4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Répartition compétences</div>
          </div>
          <div className="chartBox">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={skills}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                >
                  {skills.map((_, idx) => (
                    <Cell key={idx} fill={donutColors[idx % donutColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="legend">
              <div className="legendItem"><span className="dot dot1" /> Savoir</div>
              <div className="legendItem"><span className="dot dot2" /> Savoir-faire</div>
              <div className="legendItem"><span className="dot dot3" /> Savoir-être</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel panelFull">
        <div className="panelHeader">
          <div className="panelTitle">Recommandations récentes</div>
        </div>
        <div className="recentList">
          {recents.map((r, i) => (
            <div key={i} className="recentRow">
              <div className="pctBubble">{r.pct}%</div>
              <div className="recentText">
                <div className="recentName">{r.name}</div>
                <div className="recentSub">{r.activity}</div>
              </div>
              <div className={`statusPill ${r.status === "Accepté" ? "ok" : "pending"}`}>
                {r.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}