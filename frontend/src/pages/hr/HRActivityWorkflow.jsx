import { useEffect, useState } from "react";
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

  const [activity, setActivity] = useState(null);
  const [rec, setRec] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [manager, setManager] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      setLoading(true);

      const activityData = await getActivityById(id);
      setActivity(activityData);

      const recData = await getRecommendation(id);
      setRec(recData);

      const employeesData = await getEmployees();
      setEmployees(Array.isArray(employeesData) ? employeesData : []);

      if (activityData?.managerId) {
        const managerData = await getUserById(activityData.managerId);
        setManager(managerData);
      }

    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- HELPERS ---------------- */
  const recommendedIds = rec?.list?.map((x) => x.employeeId) || [];

  /* ---------------- ACTIONS ---------------- */

  const onRunAI = async () => {
    try {
      setLoading(true);
      setError("");

      await hrRunAI(id);
      await fetchAll();

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const removeFromList = async (empId) => {
    try {
      setError("");

      const newList = rec.list.filter((x) => x.employeeId !== empId);

      await hrUpdateRecommendationList(id, newList);
      await fetchAll();

    } catch (e) {
      setError(e.message);
    }
  };

  const addToList = async (empId) => {
    try {
      setError("");

      if (!rec) throw new Error("Lance l’IA d’abord.");
      if (recommendedIds.includes(empId)) return;

      const newList = [
        ...(rec.list || []),
        {
          employeeId: empId,
          score: Math.round(80 + Math.random() * 20),
          rank: (rec.list?.length || 0) + 1,
        },
      ];

      await hrUpdateRecommendationList(id, newList);
      await fetchAll();

    } catch (e) {
      setError(e.message);
    }
  };

  const onValidateForward = async () => {
  try {
    setLoading(true);
    setError("");

    // 🔴 Sécurité : vérifier qu'il y a une liste
    if (!rec?.list || rec.list.length === 0) {
      throw new Error("Aucune recommandation à envoyer.");
    }

    // 🟢 1. Sauvegarder la liste actuelle (IMPORTANT)
    await hrUpdateRecommendationList(id, rec.list);

    // 🟢 2. Valider + envoyer au manager
    await hrValidateAndForward(id);

    // 🟢 3. Feedback utilisateur
    alert("✅ Liste validée et envoyée au manager !");

    // 🟢 4. Refresh UI
    await fetchAll();

  } catch (e) {
    console.error(e);
    setError(e.message || "Erreur lors de la validation");
  } finally {
    setLoading(false);
  }
};

  /* ---------------- UI ---------------- */

  if (loading) {
    return <div style={{ padding: 20 }}>⏳ Chargement...</div>;
  }

  if (!activity) {
    return (
      <div style={{ padding: 18 }}>
        <div style={card()}>Activité introuvable.</div>
        <Link to="/hr/activities">← Retour</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1>{activity.title}</h1>
          <p style={{ color: "#667085" }}>
            Manager: <b>{manager?.name || "—"}</b> • {activity.date} • {activity.location}
          </p>
        </div>
        <Link to="/hr/activities">← Retour</Link>
      </div>

      {error && <div style={{ color: "red" }}>{error}</div>}

      {/* LEFT */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>

        {/* RECOMMENDATIONS */}
        <div style={card()}>
          <h3>Recommandations IA</h3>

          <button onClick={onRunAI} style={btnPrimary()}>
            🤖 Lancer IA
          </button>

          <div style={{ marginTop: 12 }}>
            {(rec?.list || []).map((r) => {
              const emp = employees.find((e) => e.id === r.employeeId);

              return (
                <div key={r.employeeId} style={row()}>
                  <div>
                    <strong>{emp?.name || "Unknown"}</strong>
                  </div>

                  <div>
                    <span style={scoreTag()}>{r.score}%</span>

                    <button onClick={() => removeFromList(r.employeeId)}>
                      ❌
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onValidateForward}
            disabled={!rec?.list?.length}
            style={btnPrimary()}
          >
            ✅ Valider & envoyer
          </button>
        </div>

        {/* EMPLOYEES */}
        <div style={card()}>
          <h3>Ajouter employés</h3>

          {employees.map((e) => {
            const inList = recommendedIds.includes(e.id);

            return (
              <div key={e.id} style={row()}>
                <div>{e.name}</div>

                <button
                  onClick={() => addToList(e.id)}
                  disabled={inList}
                >
                  {inList ? "Ajouté" : "Ajouter"}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

/* UI helpers */
function card() {
  return { background: "#fff", padding: 16, borderRadius: 12 };
}
function btnPrimary() {
  return { background: "#0b2b4b", color: "#fff", padding: 10, border: "none" };
}
function row() {
  return { display: "flex", justifyContent: "space-between", marginBottom: 10 };
}
function scoreTag() {
  return { background: "#ecfdf3", padding: "4px 8px", borderRadius: 8 };
}