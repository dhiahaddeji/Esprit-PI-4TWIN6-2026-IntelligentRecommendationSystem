import { getStoredUser } from "../../auth/authService";
import { employeeParticipationStatus, getActivityById } from "../../services/workflowService";

export default function MyParticipationStatus() {
  const user = getStoredUser();
  const list = employeeParticipationStatus(user?.id);

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>Statut de participation</h1>
      <p style={{ marginTop: 6, color: "#667085" }}>Historique de tes réponses aux invitations.</p>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {list.length === 0 ? (
          <div style={card()}>Aucun statut pour le moment.</div>
        ) : (
          list.map((p) => {
            const act = getActivityById(p.activityId);
            return (
              <div key={p.id} style={card()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{act?.title || "Activité"}</div>
                    <div style={{ color: "#667085", marginTop: 4, fontSize: 13 }}>
                      {act?.date} • {act?.location}
                    </div>
                  </div>
                  <span style={pill(p.status)}>{p.status}</span>
                </div>

                {p.status === "DECLINED" && (
                  <div style={{ marginTop: 10, color: "#b42318" }}>
                    <b>Justification:</b> {p.justification || "—"}
                  </div>
                )}
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
function pill(status) {
  const map = {
    ACCEPTED: { bg: "#ecfdf3", bd: "#abefc6", tx: "#067647" },
    DECLINED: { bg: "#fffbfa", bd: "#fecdca", tx: "#b42318" },
  };
  const s = map[status] || { bg: "#f8fafc", bd: "#eef0f4", tx: "#344054" };
  return { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: `1px solid ${s.bd}`, background: s.bg, fontWeight: 900, color: s.tx };
}
