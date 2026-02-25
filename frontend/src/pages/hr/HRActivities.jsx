import { Link } from "react-router-dom";
import { getStoredUser } from "../../auth/authService";
import { listActivitiesForRole, getUserById } from "../../services/workflowService";

export default function HRActivities() {
  const user = getStoredUser();
  const role = user?.role;

  const activities = listActivitiesForRole(role, user?.id);

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Activités</h1>
          <p style={{ margin: "6px 0 0", color: "#667085" }}>
            Créer une activité, lancer l’IA, valider la liste, puis transmettre au manager.
          </p>
        </div>

        <Link
          to="/hr/activities/new"
          style={{
            background: "#0b2b4b",
            color: "white",
            padding: "10px 14px",
            borderRadius: 12,
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          + Créer activité
        </Link>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {activities.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #eef0f4", borderRadius: 14, padding: 14 }}>
            Aucune activité pour le moment.
          </div>
        ) : (
          activities.map((a) => {
            const manager = getUserById(a.managerId);
            return (
              <div
                key={a.id}
                style={{
                  background: "#fff",
                  border: "1px solid #eef0f4",
                  borderRadius: 14,
                  padding: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{a.title}</div>
                  <div style={{ color: "#667085", marginTop: 4, fontSize: 13 }}>
                    Manager: <b>{manager?.name || "—"}</b> • {a.date || "date —"} • {a.location || "lieu —"} • places:{" "}
                    {a.seats || 0}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid #eef0f4",
                        background: "#f8fafc",
                        fontWeight: 800,
                      }}
                    >
                      {a.status}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/hr/activities/${a.id}`}
                  style={{
                    textDecoration: "none",
                    fontWeight: 800,
                    color: "#0b2b4b",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #eef0f4",
                    background: "#fff",
                  }}
                >
                  Ouvrir workflow →
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
