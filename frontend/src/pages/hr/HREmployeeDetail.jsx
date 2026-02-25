import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { employees } from "../../mock/employees";
import "../../styles/hr-employees.css";

export default function HREmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const emp = useMemo(() => employees.find((e) => e.id === id), [id]);

  if (!emp) {
    return (
      <div className="hrEmpPage">
        <h1 className="hrEmpTitle">Employé introuvable</h1>
        <button className="hrBackBtn" onClick={() => navigate("/hr/employees")}>
          ← Retour
        </button>
      </div>
    );
  }

  return (
    <div className="hrEmpPage">
      <div className="hrEmpHeaderRow">
        <button className="hrBackBtn" onClick={() => navigate("/hr/employees")}>
          ← Retour
        </button>
      </div>

      <div className="hrEmpCard">
        <div className="hrEmpCardTop">
          <div className="hrEmpBigAvatar">
            {emp.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join("")}
          </div>

          <div className="hrEmpCardInfo">
            <div className="hrEmpCardName">{emp.name}</div>
            <div className="hrEmpCardMeta">
              {emp.title} • {emp.department}
            </div>
            <div className="hrEmpCardMeta">{emp.email}</div>
          </div>
        </div>
      </div>

      <h2 className="hrSectionTitle">Compétences</h2>

      <div className="skillsGrid">
        <SkillCard title="Savoir" icon="📘" items={emp.skills.savoir} />
        <SkillCard title="Savoir-faire" icon="🛠️" items={emp.skills.savoirFaire} />
        <SkillCard title="Savoir-être" icon="🤍" items={emp.skills.savoirEtre} />
      </div>
    </div>
  );
}

function SkillCard({ title, icon, items }) {
  return (
    <div className="skillCard">
      <div className="skillCardHeader">
        <div className="skillHeaderLeft">
          <span className="skillIcon">{icon}</span>
          <span className="skillCardTitle">{title}</span>
        </div>
        <span className="countBubble">{items.length}</span>
      </div>

      <div className="skillList">
        {items.map((it, idx) => (
          <div key={idx} className="skillRow">
            <span className="skillName">{it.name}</span>
            <span className="skillTag">{it.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
