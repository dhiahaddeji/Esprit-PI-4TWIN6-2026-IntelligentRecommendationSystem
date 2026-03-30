import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getStoredUser } from "../../auth/authService";
import { fetchMyInvitations } from "../../services/invitationsApi";
import { fetchActivityById } from "../../services/activitiesApi";

export default function EmployeeInvitations() {
  const user = getStoredUser();

  const [invitations, setInvitations] = useState([]);
  const [activitiesMap, setActivitiesMap] = useState({}); // { activityId: activity }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setError("");

        // ✅ Don’t call /invitations/me unless EMPLOYEE
        if (!user || String(user.role).toUpperCase() !== "EMPLOYEE") {
          setInvitations([]);
          setLoading(false);
          return;
        }

        const invs = await fetchMyInvitations();
        setInvitations(invs || []);

        // Fetch all activities used in invitations (avoid multiple duplicates)
        const ids = [...new Set((invs || []).map((i) => i.activityId))].filter(Boolean);

        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const act = await fetchActivityById(id);
              return [id, act];
            } catch {
              return [id, null];
            }
          })
        );

        const map = Object.fromEntries(results);
        setActivitiesMap(map);
      } catch (e) {
        setError(e?.message || "Erreur lors du chargement des invitations");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.role]); // reload if role changes

  if (loading) {
    return (
      <div style={{ padding: 18 }}>
        <h1 style={{ margin: 0 }}>Notifications</h1>
        <p style={{ marginTop: 6, color: "var(--text-2)" }}>Chargement...</p>
      </div>
    );
  }

  // Optional message if user is not employee
  if (!user || String(user.role).toUpperCase() !== "EMPLOYEE") {
    return (
      <div style={{ padding: 18 }}>
        <h1 style={{ margin: 0 }}>Notifications</h1>
        <div style={card()}>Cette page est réservée aux employés.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>Notifications</h1>
      <p style={{ marginTop: 6, color: "var(--text-2)" }}>
        Invitations à participer à des activités.
      </p>

      {error ? <div style={{ ...card(), borderColor: "#fecdca", color: "#b42318" }}>{error}</div> : null}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {invitations.length === 0 ? (
          <div style={card()}>Aucune invitation pour le moment.</div>
        ) : (
          invitations.map((inv) => {
            const act = activitiesMap[inv.activityId];
            return (
              <div
                key={inv._id || inv.id}
                style={{
                  ...card(),
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>{act?.title || "Activité"}</div>
                  <div style={{ color: "var(--text-2)", marginTop: 4, fontSize: 13 }}>
                    {act?.date || "—"} • {act?.location || "—"}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span style={pill(inv.status)}>{inv.status}</span>
                  </div>
                </div>

                <Link to={`/employee/invitations/${inv._id || inv.id}`} style={btnLink()}>
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
  return {
    background: "var(--surface)",
    border: "1px solid #eef0f4",
    borderRadius: 16,
    padding: 16,
  };
}
function btnLink() {
  return {
    textDecoration: "none",
    fontWeight: 900,
    color: "#0b2b4b",
    border: "1px solid #eef0f4",
    background: "var(--surface)",
    padding: "8px 10px",
    borderRadius: 12,
  };
}
function pill(status) {
  const map = {
    PENDING: { bg: "#f8fafc", bd: "#eef0f4", tx: "#344054" },
    ACCEPTED: { bg: "#ecfdf3", bd: "#abefc6", tx: "#067647" },
    DECLINED: { bg: "#fffbfa", bd: "#fecdca", tx: "#b42318" },
  };
  const s = map[status] || map.PENDING;
  return {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: `1px solid ${s.bd}`,
    background: s.bg,
    fontWeight: 900,
    color: s.tx,
  };
}