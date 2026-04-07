import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEmployees } from "../../api/employees";
import "../../styles/hr-employees.css";
import MicButton from "../../components/MicButton";

export default function HREmployees() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchEmployees({ page, limit });
        setItems(res.data || []);
        setTotal(res.total || 0);
      } catch (e) {
        setError(e.message || "Erreur chargement employés");
      } finally {
        setLoading(false);
      }
    })();
  }, [page, limit]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((e) =>
      [e.name, e.email, e.matricule].some((v) =>
        String(v || "").toLowerCase().includes(s)
      )
    );
  }, [items, q]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (loading) return <div className="hr-emp-wrap">Loading...</div>;
  if (error) return <div className="hr-emp-wrap">{error}</div>;

  return (
    <div className="hrEmpPage">
      <div className="hrEmpHeader">
        <div>
          <h1 className="hrEmpTitle">Employes</h1>
          <p className="hrEmpSubtitle">Rechercher et consulter les profils employes.</p>
        </div>
        <div className="hrEmpHeaderMeta">
          Total {total} • Page {page} / {totalPages}
        </div>
      </div>

      <div className="hrEmpToolbar">
        <div style={{ position: "relative", flex: "1 1 auto" }}>
          <input
            className="hrEmpSearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher nom, email, matricule..."
            style={{ paddingRight: 42, width: "100%", boxSizing: "border-box" }}
          />
          <MicButton onResult={(t) => setQ(t)} />
        </div>
        <div className="hrEmpToolbarInfo">
          Affichage {filtered.length} / {total}
        </div>
      </div>

      <div className="hrEmpList">
        {filtered.map((emp) => {
          const displayName = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "—";
          const initials = displayName !== "—"
            ? displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
            : "?";
          const meta = [emp.email, emp.matricule].filter(Boolean).join(" • ");
          const status = (emp.status || "").toLowerCase();
          const statusClass = status ? `hrEmpBadge hrEmpBadge-${status}` : "hrEmpBadge";

          return (
            <div
              className="hrEmpRow"
              key={emp._id || emp.id}
              onClick={() => navigate(`/hr/employees/${emp._id || emp.id}`)}
            >
              <div className="hrEmpAvatar">{initials}</div>
              <div className="hrEmpInfo">
                <div className="hrEmpNameRow">
                  <div className="hrEmpName">{displayName}</div>
                  {emp.status && (
                    <span className={statusClass}>{emp.status}</span>
                  )}
                </div>
                <div className="hrEmpMeta">{meta || "—"}</div>
              </div>
              <div className="hrEmpChevron">&gt;</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={!canPrev}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}
        >
          ← Precedent
        </button>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>
          Page {page} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={!canNext}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}