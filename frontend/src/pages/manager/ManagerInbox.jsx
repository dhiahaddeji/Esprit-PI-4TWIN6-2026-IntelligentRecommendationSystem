// src/pages/manager/ManagerInbox.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getStoredUser } from "../../auth/authService";
import http from "../../api/http";

const STATUS_LABEL = {
  SENT_TO_MANAGER:   { label: "À confirmer",         bg: "var(--warn-bg)", color: "var(--warn-text)" },
  MANAGER_CONFIRMED: { label: "Confirmée",            bg: "var(--success-bg)", color: "var(--success-text)" },
  NOTIFIED:          { label: "Employés notifiés",    bg: "var(--info-bg)", color: "var(--info-text)" },
};

export default function ManagerInbox() {
  const user = getStoredUser();
  const myId = user?.id || user?.userId;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    http.get("/activities")
      .then(res => {
        const all = Array.isArray(res.data) ? res.data : [];
        const forwarded = all.filter(a =>
          a.managerId === myId &&
          ["SENT_TO_MANAGER", "MANAGER_CONFIRMED", "NOTIFIED"].includes(a.status)
        );
        setActivities(forwarded);
      })
      .catch(e => setError(e?.response?.data?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [myId]);

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>Approbations</h1>
      <p style={{ marginTop: 6, color: "var(--text-2)" }}>Activités transmises par HR (à confirmer puis notifier).</p>

      {error && (
        <div style={{ marginTop: 12, padding: 12, background: "var(--danger-bg)", border: "1px solid var(--danger-text)", borderRadius: 12, color: "var(--danger-text)" }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {loading ? (
          <div style={card()}>Chargement…</div>
        ) : activities.length === 0 ? (
          <div style={card()}>Aucune activité à traiter.</div>
        ) : (
          activities.map(a => {
            const st = STATUS_LABEL[a.status] || { label: a.status, bg: "var(--surface-2)", color: "var(--text-2)" };
            return (
              <div key={a._id || a.id} style={{ ...card(), display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{a.title}</div>
                  <div style={{ color: "var(--text-2)", marginTop: 4, fontSize: 13 }}>
                    {a.date} • {a.location}{a.seats ? ` • ${a.seats} places` : ""}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, fontWeight: 900, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                </div>
                <Link to={`/manager/activities/${a._id || a.id}`} style={btnLink()}>
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
  return { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16 };
}
function btnLink() {
  return { textDecoration: "none", fontWeight: 900, color: "var(--accent)", border: "1px solid var(--border)", background: "var(--surface)", padding: "8px 10px", borderRadius: 12 };
}
