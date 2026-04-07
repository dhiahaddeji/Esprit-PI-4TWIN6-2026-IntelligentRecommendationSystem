import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createActivity } from "../../services/activityService";
import { getManagers } from "../../services/workflowService";
import { getStoredUser } from "../../auth/authService";
import http from "../../api/http";
import MicButton from "../../components/MicButton";

const EVAL_LEVELS = [
  { val: 0, label: "Pas de compétence" },
  { val: 1, label: "Notions" },
  { val: 2, label: "Pratique autonome" },
  { val: 3, label: "Maîtrise" },
  { val: 4, label: "Expert" },
];

const COMP_TYPES = [
  { key: "savoir",       label: "Savoir" },
  { key: "savoir_faire", label: "Savoir-faire" },
  { key: "savoir_etre",  label: "Savoir-être" },
];

export default function HRCreateActivity() {
  const nav  = useNavigate();
  const user = getStoredUser();

  const [managers, setManagers]   = useState([]);
  const [catalog, setCatalog]     = useState([]);
  const [compReqs, setCompReqs]   = useState([]);   // competences_requises
  const [addComp, setAddComp]     = useState({ intitule: "", type: "savoir", niveau_min: 2 });
  const [catalogMode, setCatalogMode] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    duration: "",
    seats: 10,
    managerId: "",
    type: "formation",
    prioritization: "expertise",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    (async () => {
      try {
        setError("");
        const mgrs = await getManagers();
        setManagers(Array.isArray(mgrs) ? mgrs : []);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Impossible de charger les managers");
      }
    })();
    http.get("/competences/catalog")
      .then(res => setCatalog(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  const canSubmit = useMemo(() => (
    form.title.trim().length >= 3 &&
    form.startDate &&
    form.location.trim().length >= 2 &&
    Number(form.seats) > 0 &&
    form.managerId
  ), [form]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  }

  const addReq = () => {
    const intitule = addComp.intitule.trim();
    if (!intitule) return;
    if (compReqs.some(c => c.intitule.toLowerCase() === intitule.toLowerCase())) return;
    setCompReqs(r => [...r, { ...addComp, intitule }]);
    setAddComp(c => ({ ...c, intitule: "" }));
  };

  const addFromCatalog = (item) => {
    if (compReqs.some(c => c.intitule.toLowerCase() === item.intitule.toLowerCase())) return;
    setCompReqs(r => [...r, { intitule: item.intitule, type: item.type, niveau_min: addComp.niveau_min }]);
  };

  const removeReq = (i) => setCompReqs(r => r.filter((_, idx) => idx !== i));

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        date: form.startDate,
        location: form.location,
        duration: form.duration,
        seats: Number(form.seats),
        managerId: form.managerId,
        type: form.type,
        prioritization: form.prioritization,
        competences_requises: compReqs,
      };
      const created = await createActivity(payload);
      const id = created?._id || created?.id;
      if (id) nav(`/hr/activities/${id}`);
      else nav("/hr/activities");
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e?.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  }

  const filteredCatalog = catalog.filter(
    item => item.type === addComp.type &&
    !compReqs.some(c => c.intitule.toLowerCase() === item.intitule.toLowerCase())
  );

  const evalLabel = (val) => EVAL_LEVELS.find(l => l.val === val)?.label || "—";

  return (
    <div style={{ padding: 18, maxWidth: 920 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Créer une activité</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-2)" }}>
            Remplis les infos, définis les compétences requises, puis crée l'activité.
          </p>
        </div>
        <Link to="/hr/activities" style={{
          textDecoration: "none", fontWeight: 800, color: "#0B2D38",
          padding: "8px 10px", borderRadius: 10,
          border: "1px solid #eef0f4", background: "var(--surface)",
        }}>← Retour</Link>
      </div>

      {error && (
        <div style={{
          marginTop: 14, background: "#FDF8EE",
          border: "1px solid #F28080", padding: 12, borderRadius: 12, color: "#8B1A1A",
        }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <Field label="Titre *">
          <div style={{ position: "relative" }}>
            <input name="title" value={form.title} onChange={onChange}
              placeholder="Ex: Atelier Leadership" style={{ ...inputStyle(), paddingRight: 42 }} />
            <MicButton onResult={(t) => onChange({ target: { name: "title", value: t } })} />
          </div>
        </Field>

        <Field label="Description">
          <textarea name="description" value={form.description} onChange={onChange}
            placeholder="Détails de l'activité..."
            style={{ ...inputStyle(), minHeight: 90, resize: "vertical" }} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Type d'activité">
            <select name="type" value={form.type} onChange={onChange} style={inputStyle()}>
              <option value="formation">Formation</option>
              <option value="certification">Certification</option>
              <option value="projet">Projet</option>
              <option value="mission">Mission</option>
              <option value="audit">Audit</option>
            </select>
          </Field>
          <Field label="Contexte IA (priorisation)">
            <select name="prioritization" value={form.prioritization} onChange={onChange} style={inputStyle()}>
              <option value="upskilling">Upskilling — profils à développer</option>
              <option value="consolidation">Consolidation — profils intermédiaires</option>
              <option value="expertise">Expertise — profils avancés</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Date debut *">
            <input type="date" name="startDate" value={form.startDate} onChange={onChange} style={inputStyle()} />
          </Field>
          <Field label="Date fin">
            <input type="date" name="endDate" value={form.endDate} onChange={onChange} style={inputStyle()} />
          </Field>
          <Field label="Lieu *">
            <div style={{ position: "relative" }}>
              <input name="location" value={form.location} onChange={onChange}
                placeholder="Ex: Salle A / En ligne" style={{ ...inputStyle(), paddingRight: 42 }} />
              <MicButton onResult={(t) => onChange({ target: { name: "location", value: t } })} />
            </div>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Durée">
            <div style={{ position: "relative" }}>
              <input name="duration" value={form.duration} onChange={onChange}
                placeholder="Ex: 2 jours" style={{ ...inputStyle(), paddingRight: 42 }} />
              <MicButton onResult={(t) => onChange({ target: { name: "duration", value: t } })} />
            </div>
          </Field>
          <Field label="Places *">
            <input type="number" name="seats" min={1} value={form.seats} onChange={onChange} style={inputStyle()} />
          </Field>
          <Field label="Manager *">
            <select name="managerId" value={form.managerId} onChange={onChange} style={inputStyle()}>
              <option value="">— Choisir un manager —</option>
              {managers.map(m => (
                <option key={String(m._id || m.id)} value={String(m._id || m.id)}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Competences requises */}
        <div style={{
          background: "#EEF7FA", border: "1.5px solid var(--border)", borderRadius: 14, padding: "18px 20px",
        }}>
          <div style={{ fontWeight: 800, color: "#344054", fontSize: 14, marginBottom: 12 }}>
            🎯 Compétences requises ({compReqs.length})
          </div>

          {compReqs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {compReqs.map((c, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 10px", background: "var(--surface)", borderRadius: 9,
                  border: "1px solid var(--border)", marginBottom: 5,
                }}>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: "var(--text-1)" }}>{c.intitule}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 6,
                    background: "#EEF7FA", color: "#1D7A91",
                  }}>{COMP_TYPES.find(t => t.key === c.type)?.label || c.type}</span>
                  <span style={{ fontSize: 11, color: "var(--text-2)" }}>min: {evalLabel(c.niveau_min)}</span>
                  <button onClick={() => removeReq(i)} type="button" style={{
                    background: "#FBE9E9", border: "none", borderRadius: 6,
                    color: "#8B1A1A", cursor: "pointer", padding: "2px 7px", fontSize: 12,
                  }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Add controls */}
          <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
            <button type="button" onClick={() => setCatalogMode(true)} style={{
              padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: catalogMode ? "#EEF7FA" : "#f1f5f9",
              color: catalogMode ? "#1D7A91" : "#638899",
              border: catalogMode ? "1px solid #D6EEF3" : "1px solid #DDD7C8", cursor: "pointer",
            }}>Depuis catalogue</button>
            <button type="button" onClick={() => setCatalogMode(false)} style={{
              padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: !catalogMode ? "#EEF7FA" : "#f1f5f9",
              color: !catalogMode ? "#1D7A91" : "#638899",
              border: !catalogMode ? "1px solid #D6EEF3" : "1px solid #DDD7C8", cursor: "pointer",
            }}>Saisie libre</button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <select value={addComp.type} onChange={e => setAddComp(c => ({ ...c, type: e.target.value }))} style={{
              padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--surface)", color: "var(--text-1)", fontSize: 13, cursor: "pointer",
            }}>
              {COMP_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <select value={addComp.niveau_min} onChange={e => setAddComp(c => ({ ...c, niveau_min: parseInt(e.target.value, 10) }))} style={{
              padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--surface)", color: "var(--text-1)", fontSize: 13, cursor: "pointer",
            }}>
              {EVAL_LEVELS.map(l => <option key={l.val} value={l.val}>Niveau min: {l.label}</option>)}
            </select>
          </div>

          {catalogMode ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 130, overflowY: "auto" }}>
              {filteredCatalog.length === 0
                ? <span style={{ color: "#aab4c3", fontSize: 12 }}>Aucun item disponible dans cette catégorie.</span>
                : filteredCatalog.map(item => (
                  <button key={item._id} type="button" onClick={() => addFromCatalog(item)} style={{
                    padding: "4px 10px", borderRadius: "999px", fontSize: 12, fontWeight: 600,
                    background: "var(--bg)", color: "#1D7A91", border: "1px solid #D6EEF3", cursor: "pointer",
                  }}>+ {item.intitule}</button>
                ))
              }
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  value={addComp.intitule}
                  onChange={e => setAddComp(c => ({ ...c, intitule: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addReq(); } }}
                  placeholder="Nom de la compétence…"
                  style={{ width: "100%", boxSizing: "border-box", paddingRight: 42, ...inputStyle() }}
                />
                <MicButton onResult={(t) => setAddComp(c => ({ ...c, intitule: t }))} />
              </div>
              <button type="button" onClick={addReq} style={{
                padding: "8px 16px", background: "#1D7A91", color: "#fff",
                border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700,
              }}>+</button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit || loading}
          style={{
            marginTop: 4,
            background: !canSubmit || loading ? "#98a2b3" : "#0B2D38",
            color: "white", padding: "10px 14px", borderRadius: 12,
            border: "none", fontWeight: 900,
            cursor: !canSubmit || loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Création..." : "Créer l'activité"}
        </button>
      </form>

      <div style={{ marginTop: 14, color: "var(--text-2)", fontSize: 12 }}>
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
    width: "100%", background: "var(--surface)",
    border: "1px solid #eef0f4", borderRadius: 12,
    padding: "10px 12px", outline: "none", fontSize: 14,
  };
}
