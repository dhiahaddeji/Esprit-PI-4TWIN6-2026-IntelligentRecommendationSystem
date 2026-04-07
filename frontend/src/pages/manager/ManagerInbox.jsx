// src/pages/manager/ManagerInbox.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getStoredUser } from "../../auth/authService";
import http from "../../api/http";

const STATUS_LABEL = {
  SENT_TO_MANAGER:   { label: "À valider",            bg: "#FEF6E4", color: "#92400e"  },
  HR_REGEN_NEEDED:   { label: "Liste en cours de regénération", bg: "#FFF3CD", color: "#856404" },
  MANAGER_CONFIRMED: { label: "Confirmée",            bg: "#E8F5ED", color: "#065f46"  },
  MANAGER_REFUSED:   { label: "Refusée",              bg: "#FBE9E9", color: "#8B1A1A"  },
  NOTIFIED:          { label: "Employés notifiés",    bg: "#D6EEF3", color: "#155B6E"  },
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
          ["SENT_TO_MANAGER", "HR_REGEN_NEEDED", "MANAGER_CONFIRMED", "MANAGER_REFUSED", "NOTIFIED"].includes(a.status)
        );
        setActivities(forwarded);
      })
      .catch(e => setError(e?.response?.data?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [myId]);

  return (
    <div style={{ padding: 18 }}>
      <h1 style={{ margin: 0 }}>Approbations</h1>
      <p style={{ marginTop: 6, color: "var(--text-2)" }}>Activités transmises par HR — validez, refusez ou notifiez les participants.</p>

      {error && (
        <div style={{ marginTop: 12, padding: 12, background: "#FDF8EE", border: "1px solid #F28080", borderRadius: 12, color: "#8B1A1A" }}>
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
            const st = STATUS_LABEL[a.status] || { label: a.status, bg: "#EEF7FA", color: "var(--text-2)" };
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
  return { background: "var(--surface)", border: "1px solid #eef0f4", borderRadius: 16, padding: 16 };
}
function btnLink() {
  return { textDecoration: "none", fontWeight: 900, color: "#0B2D38", border: "1px solid #eef0f4", background: "var(--surface)", padding: "8px 10px", borderRadius: 12 };
}
