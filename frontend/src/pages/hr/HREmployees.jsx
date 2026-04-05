import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEmployees } from "../../api/employees";
import "../../styles/hr-employees.css";

export default function HREmployees() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchEmployees();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || "Erreur chargement employés");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((e) =>
      [e.name, e.email, e.matricule].some((v) =>
        String(v || "").toLowerCase().includes(s)
      )
    );
  }, [items, q]);

  if (loading) return <div className="hr-emp-wrap">Loading...</div>;
  if (error) return <div className="hr-emp-wrap">{error}</div>;

  return (
    <div className="hr-emp-wrap">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher..." />
      <div className="hr-emp-grid">
        {filtered.map((emp) => (
          <div key={emp._id || emp.id} onClick={() => navigate(`/hr/employees/${emp._id || emp.id}`)}>
            <div>{emp.name}</div>
            <div>{emp.email}</div>
            <div>{emp.matricule}</div>
          </div>
        ))}
      </div>
    </div>
  );
}