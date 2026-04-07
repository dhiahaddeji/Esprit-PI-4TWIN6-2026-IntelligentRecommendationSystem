import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchEmployeeById } from "../../api/employees";
import "../../styles/hr-employees.css";

export default function HREmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchEmployeeById(id);
        setEmp(data);
      } catch (e) {
        setError(e.message || "Employee not found");
      }
    })();
  }, [id]);

  if (error) return <div className="hrEmpPage">{error}</div>;
  if (!emp) return <div className="hrEmpPage">Loading...</div>;

  const displayName = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "—";
  const initials = displayName !== "—"
    ? displayName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const meta = [emp.email, emp.matricule].filter(Boolean).join(" • ");

  return (
    <div className="hrEmpPage">
      <div className="hrEmpHeaderRow">
        <button className="hrBackBtn" onClick={() => navigate(-1)}>← Retour</button>
      </div>

      <div className="hrEmpCard">
        <div className="hrEmpCardTop">
          <div className="hrEmpBigAvatar">{initials}</div>
          <div>
            <div className="hrEmpCardName">{displayName}</div>
            <div className="hrEmpCardMeta">{meta || "—"}</div>
          </div>
        </div>

        <div className="hrEmpSectionGrid">
          <div className="hrEmpField">
            <div className="hrEmpFieldLabel">Role</div>
            <div className="hrEmpFieldValue">{emp.role || "—"}</div>
          </div>
          <div className="hrEmpField">
            <div className="hrEmpFieldLabel">Status</div>
            <div className="hrEmpFieldValue">{emp.status || "—"}</div>
          </div>
          <div className="hrEmpField">
            <div className="hrEmpFieldLabel">Departement</div>
            <div className="hrEmpFieldValue">{emp.departement_id || "—"}</div>
          </div>
          <div className="hrEmpField">
            <div className="hrEmpFieldLabel">Telephone</div>
            <div className="hrEmpFieldValue">{emp.telephone || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}