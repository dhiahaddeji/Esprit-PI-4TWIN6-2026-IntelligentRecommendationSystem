import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { fetchActivitiesPage } from "../../services/activityService";
import { getManagers } from "../../services/workflowService";

export default function HRActivities() {
  const [activities, setActivities] = useState([]);
  const [managers, setManagers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setError("");

        const res = await fetchActivitiesPage({ page, limit });
        setActivities(res.data || []);
        setTotal(res.total || 0);

        const mgrs = await getManagers(); // GET /users/managers
        setManagers(Array.isArray(mgrs) ? mgrs : []);
      } catch (e) {
        setError(e?.message || "Erreur de chargement");
        setActivities([]);
        setManagers([]);
      }
    })();
  }, [page, limit]);

  const managersById = useMemo(() => {
    const map = new Map();
    managers.forEach((u) => map.set(String(u._id || u.id), u));
    return map;
  }, [managers]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Activités</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-2)" }}>
            Créer une activité, lancer l’IA, valider la liste, puis transmettre au manager.
          </p>

          {error && (
            <div
              style={{
                marginTop: 10,
                background: "var(--danger-bg)",
                border: "1px solid var(--danger-text)",
                padding: 10,
                borderRadius: 12,
                color: "var(--danger-text)",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <Link
          to="/hr/activities/new"
          style={{
            background: "var(--accent)",
            color: "#fff",
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
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 14 }}>
            Aucune activité pour le moment.
          </div>
        ) : (
          activities.map((a) => {
            const id = a._id || a.id;
            const manager = managersById.get(String(a.managerId));

            return (
              <div
                key={String(id)}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
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

                  <div style={{ color: "var(--text-2)", marginTop: 4, fontSize: 13 }}>
                    Manager: <b>{manager?.name || "—"}</b> • {a.date || "date —"} • {a.location || "lieu —"} • places:{" "}
                    {a.seats || 0}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "var(--surface-2)",
                        fontWeight: 800,
                      }}
                    >
                      {a.status}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/hr/activities/${id}`}
                  style={{
                    textDecoration: "none",
                    fontWeight: 800,
                    color: "var(--accent)",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  Ouvrir workflow →
                </Link>
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!canPrev}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-1)" }}
        >
          ← Précédent
        </button>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>
          Page {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={!canNext}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-1)" }}
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}