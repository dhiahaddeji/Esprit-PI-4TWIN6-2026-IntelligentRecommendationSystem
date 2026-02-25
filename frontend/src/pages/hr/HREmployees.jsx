import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { employees } from "../../mock/employees";
import "../../styles/hr-employees.css";

export default function HREmployees() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return employees;
    return employees.filter((e) =>
      [e.name, e.email, e.department, e.title].some((x) =>
        String(x).toLowerCase().includes(s)
      )
    );
  }, [q]);

  return (
    <div className="hrEmpPage">
      <h1 className="hrEmpTitle">Employés</h1>
      <p className="hrEmpSubtitle">Liste des employés (HR)</p>

      <div className="hrEmpToolbar">
        <input
          className="hrEmpSearch"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher par nom, email, département..."
        />
      </div>

      <div className="hrEmpList">
        {filtered.map((e) => (
          <button
            key={e.id}
            className="hrEmpRow"
            onClick={() => navigate(`/hr/employees/${e.id}`)}
          >
            <div className="hrEmpAvatar">
              {e.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0].toUpperCase())
                .join("")}
            </div>

            <div className="hrEmpInfo">
              <div className="hrEmpName">{e.name}</div>
              <div className="hrEmpMeta">
                {e.title} • {e.department} • {e.email}
              </div>
            </div>

            <span className="hrEmpChevron">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
