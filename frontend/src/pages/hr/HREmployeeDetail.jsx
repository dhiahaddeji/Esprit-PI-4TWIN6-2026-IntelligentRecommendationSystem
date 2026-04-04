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

  if (error) return <div className="hr-emp-wrap">{error}</div>;
  if (!emp) return <div className="hr-emp-wrap">Loading...</div>;

  return (
    <div className="hr-emp-wrap">
      <button onClick={() => navigate(-1)}>Retour</button>
      <h2>{emp.name}</h2>
      <p>Email: {emp.email}</p>
      <p>Matricule: {emp.matricule}</p>
      <p>Role: {emp.role}</p>
      <p>Status: {emp.status}</p>
    </div>
  );
}