import "../styles/skills.css";

export default function Skills() {
  const data = {
    savoir: [
      { name: "Analyse de risques", tag: "Assurance" },
      { name: "Tarification", tag: "Assurance" },
      { name: "Réglementation", tag: "Juridique" },
      { name: "Machine Learning", tag: "IT" },
      { name: "Analyse marché", tag: "Commercial" },
      { name: "Droit du travail", tag: "Juridique" },
      { name: "Modélisation statistique", tag: "Actuariat" },
    ],
    savoirFaire: [
      { name: "Gestion de dossiers", tag: "Administration" },
      { name: "Développement web", tag: "IT" },
      { name: "Vente B2B", tag: "Commercial" },
      { name: "Gestion des talents", tag: "RH" },
      { name: "Python/R", tag: "IT" },
    ],
    savoirEtre: [
      { name: "Communication client", tag: "Relation client" },
      { name: "Négociation", tag: "Commercial" },
      { name: "Travail en équipe", tag: "Management" },
      { name: "Leadership", tag: "Management" },
      { name: "Empathie", tag: "RH" },
      { name: "Rigueur", tag: "Transversal" },
    ],
  };

  return (
    <div className="skillsPage">
      <h1 className="skillsTitle">Compétences</h1>
      <p className="skillsSubtitle">Référentiel des compétences par type</p>

      <div className="skillsGrid">
        <SkillCard
          icon="📘"
          title="Savoir"
          count={data.savoir.length}
          items={data.savoir}
        />
        <SkillCard
          icon="🛠️"
          title="Savoir-faire"
          count={data.savoirFaire.length}
          items={data.savoirFaire}
        />
        <SkillCard
          icon="🤍"
          title="Savoir-être"
          count={data.savoirEtre.length}
          items={data.savoirEtre}
        />
      </div>
    </div>
  );
}

function SkillCard({ icon, title, count, items }) {
  return (
    <div className="skillCard">
      <div className="skillCardHeader">
        <div className="skillHeaderLeft">
          <span className="skillIcon">{icon}</span>
          <span className="skillCardTitle">{title}</span>
        </div>
        <span className="countBubble">{count}</span>
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
