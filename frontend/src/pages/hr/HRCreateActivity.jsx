import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "../../auth/authService";
import { getManagers, hrCreateActivity } from "../../services/workflowService";

export default function HRCreateActivity() {
  const nav = useNavigate();
  const user = getStoredUser();

  const managers = useMemo(() => getManagers(), []);
  const [title, setTitle] = useState("Formation Solvabilité II");
  const [description, setDescription] = useState("Session de formation interne (niveau intermédiaire).");
  const [date, setDate] = useState("2026-03-10");
  const [location, setLocation] = useState("Siège - Salle 2");
  const [seats, setSeats] = useState(3);
  const [managerId, setManagerId] = useState(managers[0]?.id || "");
  const [error, setError] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    setError("");

    try {
      if (!managerId) throw new Error("Choisis un manager.");

      const act = hrCreateActivity({
        title,
        description,
        date,
        location,
        seats,
        managerId,
        createdBy: user?.id,
      });

      nav(`/hr/activities/${act.id}`);
    } catch (err) {
      setError(err.message || "Erreur création activité");
    }
  };

  return (
    <div style={{ padding: 18, maxWidth: 720 }}>
      <h1 style={{ margin: 0 }}>Créer une activité</h1>
      <p style={{ marginTop: 6, color: "#667085" }}>L’activité sera ensuite transmise au manager choisi.</p>

      <form onSubmit={onSubmit} style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" required style={inp()} />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={3}
          style={{ ...inp(), resize: "vertical" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input value={date} onChange={(e) => setDate(e.target.value)} type="date" style={inp()} />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lieu" style={inp()} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            type="number"
            min={1}
            placeholder="Nombre de places"
            style={inp()}
          />

          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} style={inp()}>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (Manager)
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div style={{ color: "#b42318", background: "#fffbfa", border: "1px solid #fecdca", padding: 10, borderRadius: 12 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            background: "#0b2b4b",
            color: "white",
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            fontWeight: 900,
            cursor: "pointer",
            width: 220,
          }}
        >
          Créer
        </button>
      </form>
    </div>
  );
}

function inp() {
  return { padding: 12, borderRadius: 12, border: "1px solid #eef0f4", background: "#fff" };
}
