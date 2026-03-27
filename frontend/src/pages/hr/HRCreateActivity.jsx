import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createActivity } from "../../services/activityService";
import { getManagers } from "../../services/workflowService";
import { getStoredUser } from "../../auth/authService";

export default function HRCreateActivity() {
  const nav = useNavigate();
  const user = getStoredUser();

  const [managers, setManagers] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    seats: 10,
    managerId: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setError("");
        const mgrs = await getManagers();
        setManagers(Array.isArray(mgrs) ? mgrs : []);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Impossible de charger les managers");
        setManagers([]);
      }
    })();
  }, []);

  const canSubmit = useMemo(() => {
    return (
      form.title.trim().length >= 3 &&
      form.date &&
      form.location.trim().length >= 2 &&
      Number(form.seats) > 0 &&
      form.managerId
    );
  }, [form]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        title: form.title,
        description: form.description,
        date: form.date,
        location: form.location,
        seats: Number(form.seats),
        managerId: form.managerId,
      };

      const created = await createActivity(payload);

      // id peut être _id ou id
      const id = created?._id || created?.id;

      // 👉 redirection vers workflow (si route existe)
      if (id) nav(`/hr/activities/${id}`);
      else nav("/hr/activities");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Erreur lors de la création";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 18, maxWidth: 920 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Créer une activité</h1>
          <p style={{ margin: "6px 0 0", color: "#667085" }}>
            Remplis les infos, choisis un manager, puis crée l’activité.
          </p>
        </div>

        <Link
          to="/hr/activities"
          style={{
            textDecoration: "none",
            fontWeight: 800,
            color: "#0b2b4b",
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #eef0f4",
            background: "#fff",
          }}
        >
          ← Retour
        </Link>
      </div>

      {error && (
        <div
          style={{
            marginTop: 14,
            background: "#fffbfa",
            border: "1px solid #fecdca",
            padding: 12,
            borderRadius: 12,
            color: "#b42318",
          }}
        >
          {error}
          <div style={{ marginTop: 6, color: "#7a271a", fontSize: 12 }}>
            Astuce: vérifie que tu es connecté avec un compte <b>HR</b> et que le token existe.
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <Field label="Titre *">
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="Ex: Atelier Leadership"
            style={inputStyle()}
          />
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            value={form.description}
            onChange={onChange}
            placeholder="Détails de l’activité..."
            style={{ ...inputStyle(), minHeight: 110, resize: "vertical" }}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Date *">
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={onChange}
              style={inputStyle()}
            />
          </Field>

          <Field label="Lieu *">
            <input
              name="location"
              value={form.location}
              onChange={onChange}
              placeholder="Ex: Salle A / En ligne"
              style={inputStyle()}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Places *">
            <input
              type="number"
              name="seats"
              min={1}
              value={form.seats}
              onChange={onChange}
              style={inputStyle()}
            />
          </Field>

          <Field label="Manager *">
            <select
              name="managerId"
              value={form.managerId}
              onChange={onChange}
              style={inputStyle()}
            >
              <option value="">— Choisir un manager —</option>
              {managers.map((m) => (
                <option key={String(m._id || m.id)} value={String(m._id || m.id)}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || loading}
          style={{
            marginTop: 4,
            background: !canSubmit || loading ? "#98a2b3" : "#0b2b4b",
            color: "white",
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            fontWeight: 900,
            cursor: !canSubmit || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Création..." : "Créer l’activité"}
        </button>
      </form>

      <div style={{ marginTop: 14, color: "#667085", fontSize: 12 }}>
        Connecté: <b>{user?.email || "?"}</b> — rôle: <b>{user?.role || "?"}</b>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontWeight: 800, color: "#344054" }}>{label}</span>
      {children}
    </label>
  );
}

function inputStyle() {
  return {
    width: "100%",
    background: "#fff",
    border: "1px solid #eef0f4",
    borderRadius: 12,
    padding: "10px 12px",
    outline: "none",
    fontSize: 14,
  };
}