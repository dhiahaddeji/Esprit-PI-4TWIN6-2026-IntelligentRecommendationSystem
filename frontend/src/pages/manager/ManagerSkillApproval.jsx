// src/pages/manager/ManagerSkillApproval.jsx
import { useState, useEffect } from "react";
import http from "../../api/http";

const EVAL_LEVELS = [
  { val: 0, label: "Pas de compétence", color: "var(--text-3)", bg: "#f1f5f9" },
  { val: 1, label: "Notions",           color: "#d97706", bg: "#fef3c7" },
  { val: 2, label: "Pratique",          color: "#2563eb", bg: "#dbeafe" },
  { val: 3, label: "Maîtrise",          color: "#7c3aed", bg: "#f5f3ff" },
  { val: 4, label: "Expert",            color: "#059669", bg: "#d1fae5" },
];

const CATEGORIES = [
  { key: "savoir",       label: "Savoir",       icon: "📚", color: "#3b6fd4", bg: "#eff6ff" },
  { key: "savoir_faire", label: "Savoir-faire",  icon: "🛠️", color: "#0891b2", bg: "#ecfeff" },
  { key: "savoir_etre",  label: "Savoir-être",   icon: "🤝", color: "#7c3aed", bg: "#f5f3ff" },
];

const ETAT_COLORS = {
  draft:     { bg: "#f1f5f9", color: "var(--text-2)", label: "Brouillon" },
  submitted: { bg: "#fef3c7", color: "#92400e", label: "En attente" },
  validated: { bg: "#d1fae5", color: "#065f46", label: "Validé" },
  rejected:  { bg: "#fee2e2", color: "#991b1b", label: "Rejeté" },
};

function EvalBadge({ val }) {
  const lv = EVAL_LEVELS[val] || EVAL_LEVELS[0];
  return (
    <span style={{
      padding: "2px 8px", borderRadius: "999px", fontSize: "11px", fontWeight: 700,
      background: lv.bg, color: lv.color, whiteSpace: "nowrap",
    }}>{lv.label}</span>
  );
}

// ── Ligne de compétence éditable ──────────────────────────────────────────────
function CompRow({ comp, catalog, onSave, onDelete }) {
  const [editing, setEditing]         = useState(false);
  const [autoEval, setAutoEval]       = useState(comp.auto_eval);
  const [hierEval, setHierEval]       = useState(comp.hierarchie_eval >= 0 ? comp.hierarchie_eval : comp.auto_eval);
  const [intitule, setIntitule]       = useState(comp.intitule);
  const [type, setType]               = useState(comp.type);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);

  const cat = CATEGORIES.find(c => c.key === (editing ? type : comp.type)) || CATEGORIES[0];

  const save = async () => {
    setSaving(true);
    try {
      await http.patch(`/competences/item/${comp._id}`, {
        intitule, type, auto_eval: autoEval, hierarchie_eval: hierEval,
      });
      onSave();
      setEditing(false);
    } catch (e) {
      alert(e.response?.data?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`Supprimer "${comp.intitule}" ?`)) return;
    setDeleting(true);
    try {
      await http.delete(`/competences/item/${comp._id}`);
      onSave();
    } catch (e) {
      alert(e.response?.data?.message || "Erreur");
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <div style={{
        padding: "10px 12px", background: "#fffbea", borderRadius: "10px",
        border: "1.5px solid #fcd34d", marginBottom: "6px",
      }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
          <select value={type} onChange={e => setType(e.target.value)} style={selStyle}>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <input
            value={intitule}
            onChange={e => setIntitule(e.target.value)}
            style={{ flex: 1, ...inputStyle }}
            placeholder="Intitulé"
          />
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "8px" }}>
          <div>
            <span style={{ fontSize: "11px", color: "var(--text-2)", marginRight: 5 }}>Auto-éval employee :</span>
            <select value={autoEval} onChange={e => setAutoEval(parseInt(e.target.value, 10))} style={selStyle}>
              {EVAL_LEVELS.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <span style={{ fontSize: "11px", color: "var(--text-2)", marginRight: 5 }}>Éval manager :</span>
            <select value={hierEval} onChange={e => setHierEval(parseInt(e.target.value, 10))} style={selStyle}>
              {EVAL_LEVELS.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "7px" }}>
          <button onClick={save} disabled={saving} style={btnStyle("#059669")}>
            {saving ? "…" : "✓ Sauv."}
          </button>
          <button onClick={() => setEditing(false)} style={btnStyle("#64748b", "#f1f5f9")}>
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "7px 10px", background: "var(--surface)", borderRadius: "9px",
      border: "1px solid #f0f4ff", marginBottom: "5px",
    }}>
      <span style={{
        fontSize: "11px", fontWeight: 700, padding: "1px 7px", borderRadius: "5px",
        background: cat.bg, color: cat.color, whiteSpace: "nowrap",
      }}>{cat.icon}</span>
      <span style={{ flex: 1, fontWeight: 600, fontSize: "13px", color: "var(--text-1)" }}>{comp.intitule}</span>

      {/* Auto-eval avec +/- */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-2)" }}>Auto:</span>
        <EvalBadge val={comp.auto_eval} />
        <button
          title="Diminuer auto-éval"
          onClick={async () => {
            const v = Math.max(0, comp.auto_eval - 1);
            await http.patch(`/competences/item/${comp._id}/auto-eval`, { auto_eval: v });
            onSave();
          }}
          style={{ background: "#fee2e2", border: "none", borderRadius: "4px", color: "#dc2626", cursor: "pointer", padding: "1px 5px", fontSize: "12px", fontWeight: 700 }}
        >−</button>
        <button
          title="Augmenter auto-éval"
          onClick={async () => {
            const v = Math.min(4, comp.auto_eval + 1);
            await http.patch(`/competences/item/${comp._id}/auto-eval`, { auto_eval: v });
            onSave();
          }}
          style={{ background: "#d1fae5", border: "none", borderRadius: "4px", color: "#059669", cursor: "pointer", padding: "1px 5px", fontSize: "12px", fontWeight: 700 }}
        >+</button>
      </div>

      {/* Eval manager */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-2)" }}>Manager:</span>
        <select
          value={hierEval}
          onChange={async e => {
            const v = parseInt(e.target.value, 10);
            setHierEval(v);
            await http.patch(`/competences/item/${comp._id}/eval`, { hierarchie_eval: v });
            onSave();
          }}
          style={{ ...selStyle, fontSize: "12px" }}
        >
          {EVAL_LEVELS.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
        </select>
      </div>

      {/* Actions */}
      <button onClick={() => setEditing(true)} title="Modifier" style={{
        background: "#eff6ff", border: "none", borderRadius: "6px",
        color: "#3b6fd4", cursor: "pointer", padding: "3px 8px", fontSize: "13px",
      }}>✏️</button>
      <button onClick={del} disabled={deleting} title="Supprimer" style={{
        background: "#fee2e2", border: "none", borderRadius: "6px",
        color: "#dc2626", cursor: "pointer", padding: "3px 8px", fontSize: "13px",
        opacity: deleting ? 0.5 : 1,
      }}>🗑</button>
    </div>
  );
}

// ── Formulaire ajout competence ────────────────────────────────────────────────
function AddCompForm({ ficheId, catalog, onAdded }) {
  const [type, setType]           = useState("savoir");
  const [intitule, setIntitule]   = useState("");
  const [autoEval, setAutoEval]   = useState(2);
  const [hierEval, setHierEval]   = useState(2);
  const [catalogMode, setCatalogMode] = useState(true);
  const [adding, setAdding]       = useState(false);

  const add = async (intit) => {
    const v = (intit || intitule).trim();
    if (!v) return;
    setAdding(true);
    try {
      await http.post(`/competences/fiche/${ficheId}/add`, {
        intitule: v, type, auto_eval: autoEval, hierarchie_eval: hierEval,
      });
      setIntitule("");
      onAdded();
    } catch (e) {
      alert(e.response?.data?.message || "Erreur");
    } finally {
      setAdding(false);
    }
  };

  const filtered = catalog.filter(
    item => item.type === type
  );

  return (
    <div style={{
      padding: "14px 16px", background: "#f0fdf4", borderRadius: "12px",
      border: "1.5px dashed #86efac", marginTop: "12px",
    }}>
      <div style={{ fontWeight: 700, fontSize: "13px", color: "#065f46", marginBottom: "10px" }}>
        ➕ Ajouter une compétence
      </div>

      <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
        <button onClick={() => setCatalogMode(true)} style={{
          padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
          background: catalogMode ? "#d1fae5" : "#f1f5f9", color: catalogMode ? "#059669" : "#64748b",
          border: catalogMode ? "1px solid #6ee7b7" : "1px solid #dde3f0",
        }}>Catalogue</button>
        <button onClick={() => setCatalogMode(false)} style={{
          padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
          background: !catalogMode ? "#d1fae5" : "#f1f5f9", color: !catalogMode ? "#059669" : "#64748b",
          border: !catalogMode ? "1px solid #6ee7b7" : "1px solid #dde3f0",
        }}>Libre</button>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
        <select value={type} onChange={e => setType(e.target.value)} style={selStyle}>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-2)" }}>Auto:</span>
          <select value={autoEval} onChange={e => setAutoEval(parseInt(e.target.value, 10))} style={selStyle}>
            {EVAL_LEVELS.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-2)" }}>Manager:</span>
          <select value={hierEval} onChange={e => setHierEval(parseInt(e.target.value, 10))} style={selStyle}>
            {EVAL_LEVELS.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
          </select>
        </div>
      </div>

      {catalogMode ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", maxHeight: "120px", overflowY: "auto" }}>
          {filtered.length === 0
            ? <span style={{ color: "#aab4c3", fontSize: "12px" }}>Aucun item dans cette catégorie.</span>
            : filtered.map(item => (
              <button key={item._id} onClick={() => add(item.intitule)} disabled={adding} style={{
                padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 600,
                background: "var(--surface)", color: "#059669", border: "1px solid #6ee7b7", cursor: "pointer",
              }}>+ {item.intitule}</button>
            ))
          }
        </div>
      ) : (
        <div style={{ display: "flex", gap: "7px" }}>
          <input
            value={intitule}
            onChange={e => setIntitule(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="Nom de la compétence…"
            style={{ flex: 1, ...inputStyle }}
          />
          <button onClick={() => add()} disabled={adding} style={btnStyle("#059669")}>
            {adding ? "…" : "+ Ajouter"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Carte fiche employé ───────────────────────────────────────────────────────
function FicheCard({ item, catalog, onRefresh }) {
  const { fiche, competences: initComps } = item;
  const [comps, setComps]         = useState(initComps);
  const [expanded, setExpanded]   = useState(fiche.etat === "submitted");
  const [note, setNote]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [showAdd, setShowAdd]     = useState(false);

  const reload = async () => {
    try {
      const res = await http.get(`/competences/fiche/${fiche._id}`);
      setComps(res.data.competences || []);
    } catch {}
  };

  const validate = async () => {
    setLoading(true);
    try {
      await http.patch(`/competences/fiche/${fiche._id}/validate`);
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!note.trim()) { alert("Saisissez une note de rejet."); return; }
    setLoading(true);
    try {
      await http.patch(`/competences/fiche/${fiche._id}/reject`, { note });
      onRefresh();
    } catch (e) {
      alert(e.response?.data?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const es = ETAT_COLORS[fiche.etat] || ETAT_COLORS.draft;

  return (
    <div style={{
      background: "var(--surface)", borderRadius: "14px",
      border: `1px solid ${fiche.etat === "submitted" ? "#fcd34d" : "#dde3f0"}`,
      padding: "20px", marginBottom: "16px",
      boxShadow: fiche.etat === "submitted" ? "0 4px 20px rgba(252,211,77,0.15)" : "0 2px 8px rgba(0,0,0,0.04)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-1)" }}>
            👤 {fiche.employee_name || fiche.employee_id}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-2)", marginTop: "2px" }}>
            {comps.length} compétence{comps.length !== 1 ? "s" : ""} — mis à jour le{" "}
            {fiche.updatedAt ? new Date(fiche.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            padding: "4px 12px", borderRadius: "999px", fontSize: "12px",
            fontWeight: 700, background: es.bg, color: es.color,
          }}>{es.label}</span>
          <button onClick={() => setExpanded(e => !e)} style={{
            background: "var(--bg)", border: "none", borderRadius: "8px",
            padding: "4px 10px", cursor: "pointer", fontSize: "13px", color: "var(--text-2)",
          }}>{expanded ? "▲" : "▼"}</button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Compétences par catégorie */}
          {CATEGORIES.map(cat => {
            const items = comps.filter(c => c.type === cat.key);
            return (
              <div key={cat.key} style={{
                background: cat.bg, borderRadius: "10px", padding: "12px",
                border: `1px solid ${cat.color}20`, marginBottom: "10px",
              }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: cat.color, marginBottom: "8px" }}>
                  {cat.icon} {cat.label} ({items.length})
                </div>
                {items.length === 0
                  ? <span style={{ fontSize: "12px", color: "#aab4c3" }}>—</span>
                  : items.map(comp => (
                    <CompRow key={comp._id} comp={comp} catalog={catalog} onSave={reload} />
                  ))
                }
              </div>
            );
          })}

          {/* Bouton ajouter */}
          <button onClick={() => setShowAdd(s => !s)} style={{
            padding: "7px 16px", borderRadius: "9px", fontSize: "13px", fontWeight: 700,
            background: showAdd ? "#f1f5f9" : "#d1fae5", color: showAdd ? "#64748b" : "#065f46",
            border: "1px solid " + (showAdd ? "#dde3f0" : "#6ee7b7"), cursor: "pointer", marginBottom: "4px",
          }}>{showAdd ? "✕ Fermer" : "➕ Ajouter une compétence"}</button>

          {showAdd && (
            <AddCompForm
              ficheId={fiche._id}
              catalog={catalog}
              onAdded={() => { reload(); setShowAdd(false); }}
            />
          )}

          {/* Actions validation */}
          {fiche.etat === "submitted" && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "12px" }}>
              <input
                type="text"
                placeholder="Note de rejet (obligatoire pour rejeter)…"
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{
                  width: "100%", padding: "9px 14px", marginBottom: "12px",
                  border: "1.5px solid var(--border)", borderRadius: "9px",
                  background: "var(--surface-2)", color: "var(--text-1)", fontSize: "13.5px",
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={validate} disabled={loading} style={{
                  flex: 1, padding: "10px", borderRadius: "9px",
                  background: "linear-gradient(135deg,#10b981,#059669)",
                  color: "#fff", border: "none", fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
                }}>✅ Valider la fiche</button>
                <button onClick={reject} disabled={loading} style={{
                  flex: 1, padding: "10px", borderRadius: "9px",
                  background: "#fee2e2", color: "#dc2626",
                  border: "1px solid #fecaca", fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
                }}>❌ Rejeter</button>
              </div>
            </div>
          )}

          {/* Note de rejet */}
          {fiche.etat !== "submitted" && fiche.rejection_note && (
            <div style={{
              borderTop: "1px solid var(--border)", paddingTop: "12px", marginTop: "8px",
              fontSize: "13px", color: "var(--text-2)",
            }}>
              <strong>Note de rejet :</strong> {fiche.rejection_note}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function ManagerSkillApproval() {
  const [fiches, setFiches]   = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("submitted");

  const load = () => {
    setLoading(true);
    Promise.all([
      http.get("/competences/all-fiches"),
      http.get("/competences/catalog"),
    ])
      .then(([f, c]) => {
        setFiches(Array.isArray(f.data) ? f.data : []);
        setCatalog(Array.isArray(c.data) ? c.data : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered     = fiches.filter(f => filter === "ALL" || f.fiche?.etat === filter);
  const pendingCount = fiches.filter(f => f.fiche?.etat === "submitted").length;

  return (
    <div style={{ padding: "24px", maxWidth: "960px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 800, color: "var(--text-1)" }}>
          🎯 Gestion des compétences
        </h1>
        <p style={{ margin: 0, color: "var(--text-2)", fontSize: "14px" }}>
          {pendingCount} fiche{pendingCount !== 1 ? "s" : ""} en attente 
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {[
          { val: "submitted", label: `En attente (${pendingCount})` },
          { val: "validated", label: "Validées" },
          { val: "rejected",  label: "Rejetées" },
          { val: "ALL",       label: "Toutes" },
        ].map(tab => (
          <button key={tab.val} onClick={() => setFilter(tab.val)} style={{
            padding: "7px 16px", borderRadius: "9px", cursor: "pointer",
            fontWeight: 600, fontSize: "13px", border: "none",
            background: filter === tab.val ? "#3b6fd4" : "#f1f5f9",
            color: filter === tab.val ? "#fff" : "#64748b",
          }}>{tab.label}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "var(--text-2)" }}>Chargement…</div>}

      {!loading && filtered.length === 0 && (
        <div style={{
          padding: "60px", background: "var(--surface)", borderRadius: "16px",
          border: "1px solid var(--border)", textAlign: "center", color: "var(--text-2)",
        }}>Aucune fiche dans cette catégorie.</div>
      )}

      {!loading && filtered.map((item, i) => (
        <FicheCard key={item.fiche?._id || i} item={item} catalog={catalog} onRefresh={load} />
      ))}
    </div>
  );
}

// ── Styles réutilisables ──────────────────────────────────────────────────────
const selStyle = {
  padding: "4px 8px", borderRadius: "7px", fontSize: "12px",
  border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--text-1)",
};

const inputStyle = {
  padding: "7px 11px", borderRadius: "8px", fontSize: "13px",
  border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-1)", outline: "none",
};

function btnStyle(color, bg) {
  return {
    padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
    background: bg || color, color: bg ? color : "#fff",
    border: bg ? `1px solid ${color}40` : "none", cursor: "pointer",
  };
}
