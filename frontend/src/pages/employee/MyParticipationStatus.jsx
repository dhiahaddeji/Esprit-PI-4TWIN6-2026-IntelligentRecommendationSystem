import { useEffect, useState } from "react";
import { fetchMyParticipations } from "../../services/participationService";
import { fetchActivityById } from "../../services/activityService"; // (si tu as)
 
export default function MyParticipationStatus() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMyParticipations();
        setList(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{ padding: 18 }}>Chargement...</div>;

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>Statut de participation</h1>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {list.length === 0 ? (
          <div style={card()}>Aucun statut pour le moment.</div>
        ) : (
          list.map((p) => (
            <div key={p._id || p.id} style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>Activity: {p.activityId}</div>
                </div>
                <span style={pill(p.status)}>{p.status}</span>
              </div>

              {p.status === "DECLINED" && (
                <div style={{ marginTop: 10, color: "#b42318" }}>
                  <b>Justification:</b> {p.justification || "—"}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function card() {
  return { background: "var(--surface)", border: "1px solid #eef0f4", borderRadius: 16, padding: 16 };
}
function pill(status) {
  const map = {
    ACCEPTED: { bg: "#ecfdf3", bd: "#abefc6", tx: "#067647" },
    DECLINED: { bg: "#fffbfa", bd: "#fecdca", tx: "#b42318" },
  };
  const s = map[status] || { bg: "#f8fafc", bd: "#eef0f4", tx: "#344054" };
  return { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: `1px solid ${s.bd}`, background: s.bg, fontWeight: 900, color: s.tx };
}