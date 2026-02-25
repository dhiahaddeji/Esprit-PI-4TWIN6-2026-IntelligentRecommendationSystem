import { Link } from "react-router-dom";
import { getStoredUser } from "../../auth/authService";
import { employeeListInvitations, getActivityById } from "../../services/workflowService";

export default function EmployeeInvitations() {
  const user = getStoredUser();
  const invitations = employeeListInvitations(user?.id);

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>Notifications</h1>
      <p style={{ marginTop: 6, color: "#667085" }}>Invitations à participer à des activités.</p>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {invitations.length === 0 ? (
          <div style={card()}>Aucune invitation pour le moment.</div>
        ) : (
          invitations.map((inv) => {
            const act = getActivityById(inv.activityId);
            return (
              <div key={inv.id} style={{ ...card(), display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{act?.title || "Activité"}</div>
                  <div style={{ color: "#667085", marginTop: 4, fontSize: 13 }}>
                    {act?.date} • {act?.location}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span style={pill(inv.status)}>{inv.status}</span>
                  </div>
                </div>

                <Link to={`/employee/invitations/${inv.id}`} style={btnLink()}>
                  Voir →
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
function btnLink() {
  return { textDecoration: "none", fontWeight: 900, color: "#0b2b4b", border: "1px solid #eef0f4", background: "#fff", padding: "8px 10px", borderRadius: 12 };
}
function pill(status) {
  const map = {
    PENDING: { bg: "#f8fafc", bd: "#eef0f4", tx: "#344054" },
    ACCEPTED: { bg: "#ecfdf3", bd: "#abefc6", tx: "#067647" },
    DECLINED: { bg: "#fffbfa", bd: "#fecdca", tx: "#b42318" },
  };
  const s = map[status] || map.PENDING;
  return { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: `1px solid ${s.bd}`, background: s.bg, fontWeight: 900, color: s.tx };
}
