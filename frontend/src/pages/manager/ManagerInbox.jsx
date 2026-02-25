import { Link } from "react-router-dom";
import { getStoredUser } from "../../auth/authService";
import { listActivitiesForRole, getUserById } from "../../services/workflowService";

export default function ManagerInbox() {
  const user = getStoredUser();
  const role = user?.role;

  const activities = listActivitiesForRole(role, user?.id);

  const forwarded = activities.filter((a) => a.status === "SENT_TO_MANAGER" || a.status === "MANAGER_CONFIRMED" || a.status === "NOTIFIED");

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>Approbations</h1>
      <p style={{ marginTop: 6, color: "#667085" }}>Activités transmises par HR (à confirmer puis notifier).</p>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {forwarded.length === 0 ? (
          <div style={card()}>Aucune activité à traiter.</div>
        ) : (
          forwarded.map((a) => {
            const creator = getUserById(a.createdBy);
            return (
              <div key={a.id} style={{ ...card(), display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{a.title}</div>
                  <div style={{ color: "#667085", marginTop: 4, fontSize: 13 }}>
                    Créée par: <b>{creator?.name || "HR"}</b> • {a.date} • {a.location}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span style={pill()}>{a.status}</span>
                  </div>
                </div>

                <Link to={`/manager/activities/${a.id}`} style={btnLink()}>
                  Ouvrir →
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function card() {
  return { background: "#fff", border: "1px solid #eef0f4", borderRadius: 16, padding: 16 };
}
function pill() {
  return { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid #eef0f4", background: "#f8fafc", fontWeight: 900 };
}
function btnLink() {
  return { textDecoration: "none", fontWeight: 900, color: "#0b2b4b", border: "1px solid #eef0f4", background: "#fff", padding: "8px 10px", borderRadius: 12 };
}
