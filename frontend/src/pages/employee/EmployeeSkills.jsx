// src/pages/employee/EmployeeSkills.jsx
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
  { key: "savoir",       label: "Savoir",       icon: "📚", color: "#3b6fd4", bg: "#eff6ff", desc: "Connaissances théoriques" },
  { key: "savoir_faire", label: "Savoir-faire",  icon: "🛠️", color: "#0891b2", bg: "#ecfeff", desc: "Compétences pratiques" },
  { key: "savoir_etre",  label: "Savoir-être",   icon: "🤝", color: "#7c3aed", bg: "#f5f3ff", desc: "Compétences comportementales" },
];

const ETAT_STYLE = {
  draft:     { bg: "#f1f5f9", color: "var(--text-2)", label: "Brouillon" },
  submitted: { bg: "#fef3c7", color: "#92400e", label: "En attente de validation" },
  validated: { bg: "#d1fae5", color: "#065f46", label: "Validé ✅" },
  rejected:  { bg: "#fee2e2", color: "#991b1b", label: "Rejeté ❌" },
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

// Ligne compétence en lecture
function CompRow({ comp, onUpdate }) {
  const [editing, setEditing]   = useState(false);
  const [autoEval, setAutoEval] = useState(comp.auto_eval);
  const [saving, setSaving]     = useState(false);

  const cat = CATEGORIES.find(c => c.key === comp.type) || CATEGORIES[0];
  const managerEval = comp.hierarchie_eval >= 0 ? comp.hierarchie_eval : null;

  const saveEval = async () => {
    setSaving(true);
    try {
      await http.patch(`/competences/item/${comp._id}`, { auto_eval: autoEval });
      setEditing(false);
      onUpdate();
    } catch (e) {
      alert(e.response?.data?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "8px 12px", borderRadius: "10px",
      background: "#f8faff", border: "1px solid var(--border)", marginBottom: "6px",
    }}>
      <span style={{
        fontSize: "11px", fontWeight: 700, padding: "1px 7px", borderRadius: "5px",
        background: cat.bg, color: cat.color, whiteSpace: "nowrap",
      }}>{cat.icon}</span>
      <span style={{ flex: 1, fontWeight: 600, fontSize: "13.5px", color: "var(--text-1)" }}>{comp.intitule}</span>

      {/* Auto-éval */}
      {editing ? (
        <>
          <select value={autoEval} onChange={e => setAutoEval(parseInt(e.target.value, 10))} style={{
            padding: "4px 8px", borderRadius: "7px", fontSize: "12px",
            border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer",
          }}>
            {EVAL_LEVELS.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
          </select>
          <button onClick={saveEval} disabled={saving} style={{
            background: "#d1fae5", border: "none", borderRadius: "6px",
            color: "#059669", cursor: "pointer", padding: "3px 8px", fontSize: "12px", fontWeight: 700,
          }}>{saving ? "…" : "✓"}</button>
          <button onClick={() => { setEditing(false); setAutoEval(comp.auto_eval); }} style={{
            background: "var(--bg)", border: "none", borderRadius: "6px",
            color: "var(--text-2)", cursor: "pointer", padding: "3px 8px", fontSize: "12px",
          }}>✕</button>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "11px", color: "var(--text-2)" }}>Mon niveau :</span>
            <EvalBadge val={comp.auto_eval} />
            <button onClick={() => setEditing(true)} title="Modifier mon auto-évaluation" style={{
              background: "none", border: "none", cursor: "pointer", fontSize: "13px", padding: "0 3px",
            }}>✏️</button>
          </div>
          {managerEval !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "11px", color: "#059669" }}>✓ Manager :</span>
              <EvalBadge val={managerEval} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Formulaire ajout d'une compétence individuelle
function AddCompForm({ catalog, onAdded, onCancel }) {
  const [type, setType]           = useState("savoir");
  const [intitule, setIntitule]   = useState("");
  const [autoEval, setAutoEval]   = useState(2);
  const [catalogMode, setCatalogMode] = useState(true);
  const [adding, setAdding]       = useState(false);

  const add = async (intit) => {
    const v = (intit || intitule).trim();
    if (!v) return;
    setAdding(true);
    try {
      await http.post("/competences/mine/add", { intitule: v, type, auto_eval: autoEval });
      setIntitule("");
      onAdded();
    } catch (e) {
      alert(e.response?.data?.message || "Erreur lors de l'ajout");
    } finally {
      setAdding(false);
    }
  };

  const filteredCatalog = catalog.filter(item => item.type === type);

  return (
    <div style={{
      padding: "16px 18px", background: "#f0fdf4", borderRadius: "14px",
      border: "1.5px dashed #86efac", marginBottom: "20px",
    }}>
      <div style={{ fontWeight: 700, fontSize: "14px", color: "#065f46", marginBottom: "12px" }}>
        ➕ Ajouter une nouvelle compétence
      </div>

      {/* Catalogue / Libre */}
      <div style={{ display: "flex", gap: "7px", marginBottom: "10px" }}>
        {[true, false].map(mode => (
          <button key={String(mode)} onClick={() => setCatalogMode(mode)} style={{
            padding: "4px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
            background: catalogMode === mode ? "#d1fae5" : "#f1f5f9",
            color: catalogMode === mode ? "#059669" : "#64748b",
            border: catalogMode === mode ? "1px solid #6ee7b7" : "1px solid #dde3f0",
          }}>{mode ? "Depuis le catalogue" : "Saisie libre"}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
        <select value={type} onChange={e => setType(e.target.value)} style={selStyle}>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
        </select>
        <select value={autoEval} onChange={e => setAutoEval(parseInt(e.target.value, 10))} style={selStyle}>
          {EVAL_LEVELS.map(l => <option key={l.val} value={l.val}>Mon niveau : {l.label}</option>)}
        </select>
      </div>

      {catalogMode ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
          {filteredCatalog.length === 0
            ? <span style={{ color: "#aab4c3", fontSize: "13px" }}>Aucun item disponible.</span>
            : filteredCatalog.map(item => (
              <button key={item._id} onClick={() => add(item.intitule)} disabled={adding} style={{
                padding: "5px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 600,
                background: "var(--surface)", color: "#059669", border: "1px solid #6ee7b7", cursor: "pointer",
              }}>+ {item.intitule}</button>
            ))
          }
        </div>
      ) : (
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={intitule}
            onChange={e => setIntitule(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="Nom de la compétence…"
            style={{ flex: 1, ...inputFieldStyle }}
          />
          <button onClick={() => add()} disabled={adding} style={{
            padding: "8px 16px", background: "#059669", color: "#fff",
            border: "none", borderRadius: "9px", cursor: "pointer", fontWeight: 700,
          }}>{adding ? "…" : "+ Ajouter"}</button>
        </div>
      )}

      <div style={{ marginTop: "12px" }}>
        <button onClick={onCancel} style={{
          padding: "6px 14px", background: "var(--bg)", border: "none",
          borderRadius: "8px", color: "var(--text-2)", cursor: "pointer", fontSize: "13px",
        }}>Fermer</button>
      </div>
    </div>
  );
}

// ── CV Import Banner ─────────────────────────────────────────────────────────
function CvImportBanner({ onImported }) {
  const raw = localStorage.getItem("cvExtractedSkills");
  const [data, setData] = useState(() => {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  });
  const [importing, setImporting] = useState(false);
  const [selected, setSelected]   = useState(() => {
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.skills?.map((_, i) => i) || [];
    } catch { return []; }
  });

  if (!data || !data.skills?.length) return null;

  const toggleSkill = (i) =>
    setSelected(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i]);

  const importSelected = async () => {
    const toAdd = data.skills.filter((_, i) => selected.includes(i));
    if (!toAdd.length) return;
    setImporting(true);
    try {
      for (const skill of toAdd) {
        await http.post("/competences/mine/add", {
          intitule: skill.intitule,
          type: skill.type,
          auto_eval: skill.auto_eval,
        });
      }
      localStorage.removeItem("cvExtractedSkills");
      setData(null);
      onImported(toAdd.length);
    } catch (e) {
      alert(e.response?.data?.message || "Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  const dismiss = () => {
    localStorage.removeItem("cvExtractedSkills");
    setData(null);
  };

  const typeColors = { savoir: "#3b6fd4", savoir_faire: "#0891b2", savoir_etre: "#7c3aed" };
  const typeLabels = { savoir: "📚 Savoir", savoir_faire: "🛠️ Savoir-faire", savoir_etre: "🤝 Savoir-être" };

  return (
    <div style={{
      background: "linear-gradient(135deg, #f5f3ff 0%, #eff6ff 100%)",
      border: "1.5px solid #c4b5fd", borderRadius: 16,
      padding: "20px 24px", marginBottom: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#5b21b6" }}>
              Compétences extraites de votre CV
              {data.mode === "openai" ? " · OpenAI GPT-4o" : " · Analyse locale"}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#6d28d9", fontStyle: "italic" }}>
            {data.summary}
          </p>
        </div>
        <button onClick={dismiss} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#9ca3af", fontSize: 18, lineHeight: 1, padding: "0 4px",
        }} title="Ignorer">×</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {data.skills.map((s, i) => {
          const checked = selected.includes(i);
          return (
            <label key={i} style={{
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
              padding: "7px 12px", borderRadius: 9,
              background: checked ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.6)",
              border: `1px solid ${checked ? "#a78bfa" : "transparent"}`,
              transition: "all 0.15s",
            }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleSkill(i)}
                style={{ accentColor: "#7c3aed", width: 15, height: 15, cursor: "pointer" }}
              />
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 999,
                background: typeColors[s.type] + "22", color: typeColors[s.type],
                whiteSpace: "nowrap",
              }}>{typeLabels[s.type] || s.type}</span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: "var(--text-1)" }}>{s.intitule}</span>
              <span style={{ fontSize: 11, color: "var(--text-2)" }}>
                {["", "Notions", "Pratique", "Maîtrise", "Expert"][s.auto_eval] || "—"}
              </span>
            </label>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button onClick={importSelected} disabled={importing || selected.length === 0} style={{
          padding: "9px 20px", borderRadius: 10, border: "none",
          background: selected.length === 0 ? "var(--border)" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
          color: "#fff", fontWeight: 700, fontSize: 13,
          cursor: (importing || selected.length === 0) ? "not-allowed" : "pointer",
          opacity: importing ? 0.7 : 1,
        }}>
          {importing ? "Import en cours…" : `⬇️ Importer ${selected.length} compétence(s)`}
        </button>
        <button onClick={() => setSelected(data.skills.map((_, i) => i))} style={{
          padding: "7px 14px", borderRadius: 9, border: "1px solid #a78bfa",
          background: "transparent", color: "#7c3aed", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Tout sélectionner</button>
        <button onClick={() => setSelected([])} style={{
          padding: "7px 14px", borderRadius: 9, border: "1px solid var(--border)",
          background: "transparent", color: "var(--text-2)", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>Tout désélectionner</button>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function EmployeeSkills() {
  const [fiche, setFiche]         = useState(null);
  const [competences, setComp]    = useState([]);
  const [catalog, setCatalog]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmit]   = useState(false);
  const [msg, setMsg]             = useState(null);
  const [showAdd, setShowAdd]     = useState(false);

  // Mode édition globale (pour réécrire toute la fiche)
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState([]);
  const [saving, setSaving]       = useState(false);

  const load = () => {
    Promise.all([
      http.get("/competences/mine"),
      http.get("/competences/catalog"),
    ])
      .then(([mineRes, catRes]) => {
        setFiche(mineRes.data.fiche);
        setComp(mineRes.data.competences || []);
        setCatalog(Array.isArray(catRes.data) ? catRes.data : []);
      })
      .catch(() => setMsg({ type: "error", text: "Impossible de charger vos compétences." }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    setSubmit(true); setMsg(null);
    try {
      const res = await http.post("/competences/mine/submit");
      setFiche(res.data.fiche);
      setComp(res.data.competences || []);
      setMsg({ type: "success", text: "Fiche envoyée au manager pour validation ✅" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Erreur lors de l'envoi" });
    } finally {
      setSubmit(false);
    }
  };

  // Édition globale (réécriture complète)
  const startEdit = () => {
    setDraft(competences.map(c => ({ ...c })));
    setEditing(true);
    setMsg(null);
  };

  const saveAll = async () => {
    setSaving(true); setMsg(null);
    try {
      const items = draft.map(c => ({
        type: c.type, intitule: c.intitule, auto_eval: c.auto_eval,
        question_competence_id: c.question_competence_id,
      }));
      const res = await http.post("/competences/mine/save", { competences: items });
      setFiche(res.data.fiche);
      setComp(res.data.competences || []);
      setEditing(false);
      setMsg({ type: "success", text: "Compétences sauvegardées ✅" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Erreur" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-2)" }}>Chargement…</div>;

  const ficheEtat  = fiche?.etat || "draft";
  const etatStyle  = ETAT_STYLE[ficheEtat] || ETAT_STYLE.draft;
  const canSubmit  = (ficheEtat === "draft" || ficheEtat === "rejected") && competences.length > 0 && !editing;

  const byCategory = (arr) => CATEGORIES.map(c => ({ ...c, items: arr.filter(x => x.type === c.key) }));

  return (
    <div style={{ padding: "24px", maxWidth: "960px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "26px", fontWeight: 800, color: "var(--text-1)" }}>
            🎯 Mes Compétences
          </h1>
          <p style={{ margin: 0, color: "var(--text-2)", fontSize: "14px" }}>
            Évaluez vos compétences — le manager valide et peut ajuster vos niveaux
          </p>
        </div>
        <span style={{
          padding: "6px 16px", borderRadius: "999px", fontSize: "13px", fontWeight: 700,
          background: etatStyle.bg, color: etatStyle.color,
        }}>{etatStyle.label}</span>
      </div>

      {msg && (
        <div style={{
          padding: "12px 16px", borderRadius: "10px", marginBottom: "20px",
          background: msg.type === "success" ? "#d1fae5" : "#fee2e2",
          color: msg.type === "success" ? "#065f46" : "#991b1b",
          fontWeight: 600, fontSize: "14px",
        }}>{msg.text}</div>
      )}

      {ficheEtat === "rejected" && fiche?.rejection_note && (
        <div style={{
          padding: "12px 16px", borderRadius: "10px", marginBottom: "20px",
          background: "#fee2e2", color: "#991b1b", fontSize: "14px",
        }}>
          <strong>Note du manager :</strong> {fiche.rejection_note}
        </div>
      )}

      {/* CV Import Banner */}
      <CvImportBanner onImported={(n) => {
        load();
        setMsg({ type: "success", text: `✨ ${n} compétence(s) importée(s) depuis votre CV !` });
      }} />

      {/* Formulaire ajout rapide */}
      {showAdd && (
        <AddCompForm
          catalog={catalog}
          onAdded={() => { load(); setShowAdd(false); setMsg({ type: "success", text: "Compétence ajoutée ✅" }); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* ─── Mode lecture ─── */}
      {!editing && (
        <div style={{
          background: "var(--surface)", borderRadius: "16px", border: "1px solid var(--border)",
          padding: "20px 24px", marginBottom: "24px",
          boxShadow: "0 4px 20px rgba(59,111,212,0.07)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-1)" }}>
              📋 Ma fiche ({competences.length} compétence{competences.length !== 1 ? "s" : ""})
            </h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => { setShowAdd(s => !s); }} style={{
                padding: "7px 14px", borderRadius: "8px",
                background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7",
                fontWeight: 700, fontSize: "13px", cursor: "pointer",
              }}>➕ Ajouter</button>
              <button onClick={startEdit} style={{
                padding: "7px 14px", borderRadius: "8px",
                background: "#eff6ff", color: "#3b6fd4", border: "1px solid #bfdbfe",
                fontWeight: 700, fontSize: "13px", cursor: "pointer",
              }}>✏️ Modifier tout</button>
            </div>
          </div>

          {competences.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#aab4c3" }}>
              Aucune compétence — cliquez sur "Ajouter" pour commencer.
            </div>
          ) : (
            byCategory(competences).map(cat => (
              <div key={cat.key} style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: 700, color: cat.color, marginBottom: "6px" }}>
                  {cat.icon} {cat.label} ({cat.items.length})
                </div>
                {cat.items.length === 0
                  ? <span style={{ color: "#aab4c3", fontSize: "13px" }}>—</span>
                  : cat.items.map((c, i) => (
                    <CompRow key={c._id || i} comp={c} onUpdate={load} />
                  ))
                }
              </div>
            ))
          )}

          {/* Soumettre / En attente */}
          {canSubmit && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "8px" }}>
              <button onClick={submit} disabled={submitting} style={{
                padding: "10px 24px", borderRadius: "10px",
                background: "linear-gradient(135deg,#10b981,#059669)",
                color: "#fff", border: "none", fontWeight: 700, fontSize: "14px",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
                boxShadow: "0 4px 14px rgba(16,185,129,0.30)",
              }}>{submitting ? "Envoi…" : "📤 Envoyer pour validation"}</button>
              <span style={{ marginLeft: "12px", fontSize: "12px", color: "var(--text-2)" }}>
                Le manager recevra la demande et évaluera chaque compétence.
              </span>
            </div>
          )}

          {ficheEtat === "submitted" && (
            <div style={{
              padding: "12px 16px", borderRadius: "10px", marginTop: "12px",
              background: "#fef3c7", border: "1px solid #fcd34d", color: "#92400e",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span>⏳</span>
              <span style={{ fontWeight: 600 }}>Fiche en attente de validation — vous pouvez ajouter de nouvelles compétences en attendant.</span>
            </div>
          )}

          {ficheEtat === "validated" && (
            <div style={{
              padding: "12px 16px", borderRadius: "10px", marginTop: "12px",
              background: "#d1fae5", border: "1px solid #6ee7b7", color: "#065f46",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span>✅</span>
              <span style={{ fontWeight: 600 }}>Fiche validée — vous pouvez ajouter de nouvelles compétences, elles seront soumises au manager.</span>
            </div>
          )}
        </div>
      )}

      {/* ─── Mode édition globale ─── */}
      {editing && (
        <div style={{
          background: "var(--surface)", borderRadius: "16px", border: "2px solid #3b6fd4",
          padding: "24px", boxShadow: "0 4px 20px rgba(59,111,212,0.12)", marginBottom: "24px",
        }}>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "16px", fontWeight: 700, color: "var(--text-1)" }}>
            ✏️ Modifier toute la fiche
          </h2>
          <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "var(--text-2)" }}>
            Cette action remplace toutes vos compétences. Pour ajouter uniquement, utilisez "Ajouter" à la place.
          </p>

          {byCategory(draft).map(cat => (
            <div key={cat.key} style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: cat.color, marginBottom: "6px" }}>
                {cat.icon} {cat.label}
              </div>
              {cat.items.length === 0
                ? <span style={{ color: "#aab4c3", fontSize: "13px" }}>—</span>
                : cat.items.map((c, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "7px 10px", background: "#f8faff", borderRadius: "9px",
                    border: "1px solid var(--border)", marginBottom: "5px",
                  }}>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: "13px", color: "var(--text-1)" }}>{c.intitule}</span>
                    <select
                      value={c.auto_eval}
                      onChange={e => setDraft(d => d.map((x, idx) =>
                        x.type === c.type && x.intitule === c.intitule
                          ? { ...x, auto_eval: parseInt(e.target.value, 10) } : x
                      ))}
                      style={selStyle}
                    >
                      {EVAL_LEVELS.map(l => <option key={l.val} value={l.val}>{l.label}</option>)}
                    </select>
                    <button onClick={() => setDraft(d => d.filter((x, idx) => !(x.type === c.type && x.intitule === c.intitule)))} style={{
                      background: "#fee2e2", border: "none", borderRadius: "6px",
                      color: "#dc2626", cursor: "pointer", padding: "3px 8px",
                    }}>×</button>
                  </div>
                ))
              }
            </div>
          ))}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button onClick={() => { setEditing(false); setMsg(null); }} style={{
              padding: "10px 20px", borderRadius: "10px",
              background: "var(--bg)", color: "var(--text-2)", border: "none", fontWeight: 600, cursor: "pointer",
            }}>Annuler</button>
            <button onClick={saveAll} disabled={saving} style={{
              padding: "10px 24px", borderRadius: "10px",
              background: "linear-gradient(135deg,#3b6fd4,#2d58b0)",
              color: "#fff", border: "none", fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
            }}>{saving ? "Sauvegarde…" : "💾 Sauvegarder"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const selStyle = {
  padding: "4px 8px", borderRadius: "7px", fontSize: "12px",
  border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer", color: "var(--text-1)",
};

const inputFieldStyle = {
  padding: "8px 12px", borderRadius: "8px", fontSize: "13.5px",
  border: "1.5px solid var(--border)", background: "var(--surface)", color: "var(--text-1)",
  outline: "none",
};
