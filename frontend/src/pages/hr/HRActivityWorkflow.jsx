import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getActivityById,
  getRecommendation,
  getEmployees,
  getUserById,
  hrRunAI,
  hrUpdateRecommendationList,
  hrValidateAndForward,
} from "../../services/workflowService";

export default function HRActivityWorkflow() {
  const { id } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");

  const activity = useMemo(() => getActivityById(id), [id, refreshKey]);
  const rec = useMemo(() => getRecommendation(id), [id, refreshKey]);
  const employees = useMemo(() => getEmployees(), []);

  const recommendedIds = rec?.list?.map((x) => x.employeeId) || [];

  const onRunAI = () => {
    setError("");
    try {
      hrRunAI(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    }
  };

  const removeFromList = (empId) => {
    setError("");
    try {
      const newList = rec.list.filter((x) => x.employeeId !== empId);
      hrUpdateRecommendationList(id, newList);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    }
  };

  const addToList = (empId) => {
    setError("");
    try {
      if (!rec) throw new Error("Lance l’IA d’abord.");
      if (recommendedIds.includes(empId)) return;

      const newList = [
        ...rec.list,
        { employeeId: empId, score: Math.round(80 + Math.random() * 20), rank: rec.list.length + 1 },
      ];

      hrUpdateRecommendationList(id, newList);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    }
  };

  const onValidateForward = () => {
    setError("");
    try {
      hrValidateAndForward(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    }
  };

  if (!activity) {
    return (
      <div style={{ padding: 18 }}>
        <div style={card()}>Activité introuvable.</div>
        <Link to="/hr/activities">← Retour</Link>
      </div>
    );
  }

  const manager = getUserById(activity.managerId);

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div>
          <h1 style={{ margin: 0 }}>{activity.title}</h1>
          <div style={{ marginTop: 6, color: "#667085" }}>
            Manager: <b>{manager?.name}</b> • {activity.date} • {activity.location} • places: {activity.seats}
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={pill()}>{activity.status}</span>
            {rec?.hrValidated && <span style={{ ...pill(), marginLeft: 8, background: "#ecfdf3" }}>HR Validé</span>}
          </div>
        </div>

        <Link to="/hr/activities" style={{ textDecoration: "none", fontWeight: 800, color: "#0b2b4b" }}>
          ← Retour activités
        </Link>
      </div>

      {error && (
        <div style={{ ...card(), borderColor: "#fecdca", background: "#fffbfa", color: "#b42318", marginTop: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginTop: 14 }}>
        {/* Left: recommended list */}
        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 900 }}>1) Liste recommandée (IA)</div>
              <div style={{ color: "#667085", fontSize: 13, marginTop: 4 }}>
                Lance l’IA, puis ajuste la liste si besoin.
              </div>
            </div>
            <button onClick={onRunAI} style={btnPrimary()}>
              Lancer IA
            </button>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {!rec?.list?.length ? (
              <div style={{ color: "#667085" }}>Pas encore de recommandations.</div>
            ) : (
              rec.list
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((r) => {
                  const emp = getUserById(r.employeeId);
                  return (
                    <div key={r.employeeId} style={row()}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{emp?.name}</div>
                        <div style={{ color: "#667085", fontSize: 12 }}>{emp?.dept || "—"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={scoreTag()}>{r.score}%</span>
                        <button onClick={() => removeFromList(r.employeeId)} style={btnGhost()}>
                          Retirer
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onValidateForward} style={btnPrimary()} disabled={!rec?.list?.length}>
              Valider & Transmettre au manager
            </button>
          </div>
        </div>

        {/* Right: add employees */}
        <div style={card()}>
          <div style={{ fontWeight: 900 }}>2) Ajouter / Modifier</div>
          <div style={{ color: "#667085", fontSize: 13, marginTop: 6 }}>
            (Optionnel) Ajouter manuellement un employé.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {employees.map((e) => {
              const inList = recommendedIds.includes(e.id);
              return (
                <div key={e.id} style={row()}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{e.name}</div>
                    <div style={{ color: "#667085", fontSize: 12 }}>{e.dept || "—"}</div>
                  </div>
                  <button onClick={() => addToList(e.id)} style={inList ? btnDisabled() : btnGhost()} disabled={inList}>
                    {inList ? "Ajouté" : "Ajouter"}
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, color: "#667085", fontSize: 12 }}>
            ✅ HR peut valider et transmettre. ❌ L’approbation finale participation est faite par le manager.
          </div>
        </div>
      </div>
    </div>
  );
}

/* tiny UI helpers */
function card() {
  return { background: "#fff", border: "1px solid #eef0f4", borderRadius: 16, padding: 16 };
}
function pill() {
  return { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid #eef0f4", background: "#f8fafc", fontWeight: 900 };
}
function btnPrimary() {
  return { background: "#0b2b4b", color: "white", padding: "10px 12px", borderRadius: 12, border: "none", fontWeight: 900, cursor: "pointer" };
}
function btnGhost() {
  return { background: "#fff", border: "1px solid #eef0f4", padding: "8px 10px", borderRadius: 12, fontWeight: 900, cursor: "pointer" };
}
function btnDisabled() {
  return { ...btnGhost(), opacity: 0.6, cursor: "not-allowed" };
}
function row() {
  return { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, border: "1px solid #eef0f4", background: "#fff" };
}
function scoreTag() {
  return { fontSize: 12, fontWeight: 900, padding: "4px 10px", borderRadius: 999, background: "#ecfdf3", border: "1px solid #abefc6" };
}
