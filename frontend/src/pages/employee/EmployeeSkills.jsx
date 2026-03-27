// src/pages/employee/EmployeeSkills.jsx
import { useState, useEffect } from "react";
import http from "../../api/http";

const LEVELS = [
  { val: "LOW",    label: "Faible",  color: "#dc2626", bg: "#fee2e2" },
  { val: "MEDIUM", label: "Moyen",   color: "#d97706", bg: "#fef3c7" },
  { val: "HIGH",   label: "Élevé",   color: "#2563eb", bg: "#dbeafe" },
  { val: "EXPERT", label: "Expert",  color: "#059669", bg: "#d1fae5" },
];

const LEVEL_SCORE = { LOW: 25, MEDIUM: 50, HIGH: 75, EXPERT: 100 };

const CATEGORIES = [
  { key: "savoir",       label: "Savoir",       icon: "📚", color: "#3b6fd4", bg: "#eff6ff", desc: "Connaissances théoriques" },
  { key: "savoir_faire", label: "Savoir-faire",  icon: "🛠️", color: "#0891b2", bg: "#ecfeff", desc: "Compétences pratiques" },
  { key: "savoir_etre",  label: "Savoir-être",   icon: "🤝", color: "#7c3aed", bg: "#f5f3ff", desc: "Compétences relationnelles" },
];

function LevelBadge({ level }) {
  const l = LEVELS.find(x => x.val === level) || LEVELS[0];
  return (
    <span style={{
      padding: "2px 7px", borderRadius: "999px", fontSize: "11px", fontWeight: 700,
      background: l.bg, color: l.color, border: `1px solid ${l.color}30`,
    }}>{l.label}</span>
  );
}

function SkillItemRow({ skill, onRemove, onLevelChange }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "7px 10px", borderRadius: "9px",
      background: "#f8faff", border: "1px solid #dde3f0", marginBottom: "6px",
    }}>
      <span style={{ flex: 1, fontWeight: 600, fontSize: "13.5px", color: "#1a2340" }}>{skill.name}</span>
      <select
        value={skill.level}
        onChange={e => onLevelChange(e.target.value)}
        style={{
          padding: "3px 8px", borderRadius: "7px", fontSize: "12px",
          border: "1px solid #dde3f0", background: "#fff", cursor: "pointer",
          color: "#1a2340",
        }}
      >
        {LEVELS.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
      </select>
      <button onClick={onRemove} style={{
        background: "#fee2e2", border: "none", borderRadius: "6px",
        color: "#dc2626", cursor: "pointer", padding: "3px 8px", fontSize: "13px",
      }}>×</button>
    </div>
  );
}

function SkillCategoryEditor({ cat, skills, onChange }) {
  const [input, setInput] = useState("");
  const [level, setLevel] = useState("MEDIUM");

  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (skills.some(s => s.name.toLowerCase() === v.toLowerCase())) {
      setInput(""); return;
    }
    onChange([...skills, { name: v, level, score: LEVEL_SCORE[level] }]);
    setInput("");
  };

  const remove = (i) => onChange(skills.filter((_, idx) => idx !== i));

  const changeLevel = (i, newLevel) => onChange(
    skills.map((s, idx) => idx === i ? { ...s, level: newLevel, score: LEVEL_SCORE[newLevel] } : s)
  );

  return (
    <div style={{ marginBottom: "22px" }}>
      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontWeight: 700, color: cat.color, fontSize: "14px" }}>
          {cat.icon} {cat.label}
        </div>
        <div style={{ fontSize: "12px", color: "#6b7a99" }}>{cat.desc}</div>
      </div>

      {/* Existing skills */}
      {skills.map((sk, i) => (
        <SkillItemRow
          key={i}
          skill={sk}
          onRemove={() => remove(i)}
          onLevelChange={(lv) => changeLevel(i, lv)}
        />
      ))}
      {skills.length === 0 && (
        <div style={{ color: "#aab4c3", fontSize: "13px", marginBottom: "8px" }}>
          Aucune compétence — ajoutez-en ci-dessous.
        </div>
      )}

      {/* Add new */}
      <div style={{ display: "flex", gap: "7px", marginTop: "6px" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Nouvelle compétence…"
          style={{
            flex: 1, padding: "8px 12px", border: `1.5px solid #dde3f0`,
            borderRadius: "8px", background: "#f5f7ff", color: "#1a2340",
            fontSize: "13.5px", outline: "none",
          }}
          onFocus={e => e.target.style.borderColor = cat.color}
          onBlur={e => e.target.style.borderColor = "#dde3f0"}
        />
        <select
          value={level}
          onChange={e => setLevel(e.target.value)}
          style={{
            padding: "8px 10px", borderRadius: "8px", border: "1.5px solid #dde3f0",
            background: "#f5f7ff", color: "#1a2340", fontSize: "13px", cursor: "pointer",
          }}
        >
          {LEVELS.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
        </select>
        <button onClick={add} style={{
          padding: "8px 14px", background: cat.color, color: "#fff",
          border: "none", borderRadius: "8px", cursor: "pointer",
          fontWeight: 700, fontSize: "13px",
        }}>+</button>
      </div>
    </div>
  );
}

export default function EmployeeSkills() {
  const [approved, setApproved] = useState({ savoir: [], savoir_faire: [], savoir_etre: [], globalScore: 0 });
  const [draft, setDraft]       = useState({ savoir: [], savoir_faire: [], savoir_etre: [] });
  const [pending, setPending]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [editing, setEditing]   = useState(false);

  useEffect(() => {
    http.get("/skills/mine")
      .then(res => {
        const data = res.data;
        setApproved(data.approved || { savoir: [], savoir_faire: [], savoir_etre: [], globalScore: 0 });
        setPending(data.pending || null);
        const base = data.pending || data.approved;
        setDraft({
          savoir:       base?.savoir       || [],
          savoir_faire: base?.savoir_faire || [],
          savoir_etre:  base?.savoir_etre  || [],
        });
      })
      .catch(() => setMsg({ type: "error", text: "Impossible de charger vos compétences." }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    setSaving(true); setMsg(null);
    try {
      const res = await http.post("/skills/request", draft);
      setPending(res.data);
      setEditing(false);
      setMsg({ type: "success", text: "Demande envoyée au manager pour validation ✅" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Erreur lors de l'envoi" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#6b7a99" }}>Chargement…</div>;

  const totalApproved = (approved.savoir?.length || 0) + (approved.savoir_faire?.length || 0) + (approved.savoir_etre?.length || 0);

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 800, color: "#1a2340" }}>
          🎯 Mes Compétences
        </h1>
        <p style={{ margin: 0, color: "#6b7a99", fontSize: "14px" }}>
          Gérez vos compétences avec leur niveau — les mises à jour nécessitent la validation du manager
        </p>
      </div>

      {msg && (
        <div style={{
          padding: "12px 16px", borderRadius: "10px", marginBottom: "20px",
          background: msg.type === "success" ? "#d1fae5" : "#fee2e2",
          color: msg.type === "success" ? "#065f46" : "#991b1b",
          fontWeight: 600, fontSize: "14px",
        }}>{msg.text}</div>
      )}

      {/* Global score */}
      {approved.globalScore > 0 && (
        <div style={{
          padding: "14px 18px", borderRadius: "12px", marginBottom: "20px",
          background: "#eff6ff", border: "1px solid #bfdbfe",
          display: "flex", alignItems: "center", gap: "14px",
        }}>
          <div style={{ fontSize: "32px", fontWeight: 800, color: "#3b6fd4" }}>{approved.globalScore}</div>
          <div>
            <div style={{ fontWeight: 700, color: "#1a2340" }}>Score global de compétences</div>
            <div style={{ fontSize: "13px", color: "#6b7a99" }}>sur 100 — basé sur vos niveaux de compétences approuvés</div>
          </div>
        </div>
      )}

      {/* Pending banner */}
      {pending?.status === "PENDING" && (
        <div style={{
          padding: "14px 18px", borderRadius: "12px", marginBottom: "20px",
          background: "#fef3c7", border: "1px solid #fcd34d",
          color: "#92400e", display: "flex", alignItems: "center", gap: "10px",
        }}>
          <span style={{ fontSize: "20px" }}>⏳</span>
          <div>
            <div style={{ fontWeight: 700 }}>Demande en attente de validation</div>
            <div style={{ fontSize: "13px", marginTop: "2px" }}>
              Votre mise à jour est en cours d'examen par le manager.
            </div>
          </div>
        </div>
      )}

      {/* Approved skills */}
      <div style={{
        background: "#fff", borderRadius: "16px", border: "1px solid #dde3f0",
        padding: "20px 24px", marginBottom: "24px",
        boxShadow: "0 4px 20px rgba(59,111,212,0.07)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#1a2340" }}>
            ✅ Compétences approuvées ({totalApproved})
          </h2>
          {!editing && (
            <button onClick={() => { setDraft({ savoir: [...(approved.savoir||[])], savoir_faire: [...(approved.savoir_faire||[])], savoir_etre: [...(approved.savoir_etre||[])] }); setEditing(true); setMsg(null); }} style={{
              padding: "7px 16px", borderRadius: "8px",
              background: "#eff6ff", color: "#3b6fd4", border: "1px solid #bfdbfe",
              fontWeight: 700, fontSize: "13px", cursor: "pointer",
            }}>✏️ Modifier</button>
          )}
        </div>

        {CATEGORIES.map(cat => (
          <div key={cat.key} style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#3d4f7c", marginBottom: "6px" }}>
              {cat.icon} {cat.label}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {(approved[cat.key] || []).length === 0
                ? <span style={{ color: "#aab4c3", fontSize: "13px" }}>—</span>
                : (approved[cat.key] || []).map((sk, i) => (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    padding: "4px 10px", borderRadius: "999px",
                    background: cat.bg, color: cat.color,
                    fontSize: "12.5px", fontWeight: 600,
                    border: `1px solid ${cat.color}30`,
                  }}>
                    {sk.name} <LevelBadge level={sk.level} />
                  </span>
                ))
              }
            </div>
          </div>
        ))}
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{
          background: "#fff", borderRadius: "16px", border: "2px solid #3b6fd4",
          padding: "24px", boxShadow: "0 4px 20px rgba(59,111,212,0.12)",
        }}>
          <h2 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: 700, color: "#1a2340" }}>
            ✏️ Mise à jour des compétences
          </h2>
          <div style={{
            padding: "10px 14px", borderRadius: "9px", marginBottom: "16px",
            background: "#f5f7ff", border: "1px solid #dde3f0",
            fontSize: "13px", color: "#6b7a99",
          }}>
            💡 Attribuez un niveau à chaque compétence : <strong>Faible</strong> (débutant), <strong>Moyen</strong>, <strong>Élevé</strong>, <strong>Expert</strong>
          </div>

          {CATEGORIES.map(cat => (
            <SkillCategoryEditor
              key={cat.key}
              cat={cat}
              skills={draft[cat.key] || []}
              onChange={val => setDraft(d => ({ ...d, [cat.key]: val }))}
            />
          ))}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button onClick={() => { setEditing(false); setMsg(null); }} style={{
              padding: "10px 20px", borderRadius: "10px",
              background: "#f1f5f9", color: "#64748b",
              border: "none", fontWeight: 600, cursor: "pointer",
            }}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving} style={{
              padding: "10px 24px", borderRadius: "10px",
              background: "linear-gradient(135deg,#3b6fd4,#2d58b0)",
              color: "#fff", border: "none", fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              boxShadow: "0 4px 14px rgba(59,111,212,0.30)",
            }}>{saving ? "Envoi…" : "Envoyer pour validation"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
