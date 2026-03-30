// src/pages/hr/HRActivityWorkflow.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import http from "../../api/http";

// ── Constants ──────────────────────────────────────────────────────────────────
const EVAL_LABELS = ["Pas de compétence", "Notions", "Pratique", "Maîtrise", "Expert"];

const STATUS_META = {
  DRAFT:             { label: "Brouillon",           bg: "#f1f5f9", color: "var(--text-2)" },
  AI_SUGGESTED:      { label: "IA lancée",            bg: "#fef3c7", color: "#92400e" },
  HR_VALIDATED:      { label: "Validée HR",           bg: "#d1fae5", color: "#065f46" },
  SENT_TO_MANAGER:   { label: "Envoyée au manager",   bg: "#dbeafe", color: "#1e40af" },
  MANAGER_CONFIRMED: { label: "Confirmée manager",    bg: "#d1fae5", color: "#065f46" },
  NOTIFIED:          { label: "Employés notifiés",    bg: "#ede9fe", color: "#5b21b6" },
};

const TYPE_ICONS = {
  formation: "📚", certification: "🏆", projet: "🛠️", mission: "🎯", audit: "🔍",
};

const COMP_TYPE_LABELS = { savoir: "Savoir", savoir_faire: "Savoir-faire", savoir_etre: "Savoir-être" };

// ── Score bar component ────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const color =
    score >= 80 ? "#059669" :
    score >= 60 ? "#2563eb" :
    score >= 40 ? "#d97706" : "#dc2626";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--bg)", overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color, minWidth: 38, textAlign: "right" }}>{score}%</span>
    </div>
  );
}

// ── Employee recommendation card ───────────────────────────────────────────────
function RecCard({ item, seats, onRemove, onPromoteToSelected }) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = item.status === "Selected" || item.rank <= seats;
  const isBackup   = item.status === "Backup"   || item.rank > seats;

  return (
    <div style={{
      borderRadius: 14,
      border: `1.5px solid ${isSelected ? "#86efac" : "#c7d2fe"}`,
      background: isSelected ? "#f0fdf4" : "#f5f3ff",
      padding: "14px 16px",
      marginBottom: 10,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Rank badge */}
        <div style={{
          minWidth: 28, height: 28, borderRadius: "50%",
          background: isSelected ? "#10b981" : "#8b5cf6",
          color: "#fff", display: "flex", alignItems: "center",
          justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0,
        }}>#{item.rank}</div>

        <div style={{ flex: 1 }}>
          {/* Name + status badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: "var(--text-1)" }}>
              {item.employeeName || item.employeeId || "Inconnu"}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              background: isSelected ? "#d1fae5" : "#ede9fe",
              color: isSelected ? "#065f46" : "#5b21b6",
            }}>
              {isSelected ? "✅ Sélectionné" : "🔄 Backup"}
            </span>
          </div>

          {/* Score bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <ScoreBar score={item.score ?? 0} />
          </div>

          {/* Explanation */}
          {item.explanation && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-2)", fontStyle: "italic" }}>
              {item.explanation}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {isBackup && onPromoteToSelected && (
            <button
              onClick={() => onPromoteToSelected(item.employeeId)}
              title="Promouvoir en sélectionné"
              style={{
                background: "#d1fae5", border: "none", borderRadius: 7,
                color: "#059669", cursor: "pointer", padding: "4px 8px", fontSize: 12, fontWeight: 700,
              }}
            >↑ Sélect.</button>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              background: "var(--bg)", border: "none", borderRadius: 7,
              color: "var(--text-2)", cursor: "pointer", padding: "4px 8px", fontSize: 12,
            }}
          >{expanded ? "▲" : "▼"}</button>
          <button
            onClick={() => onRemove(item.employeeId)}
            title="Retirer de la liste"
            style={{
              background: "#fee2e2", border: "none", borderRadius: 7,
              color: "#dc2626", cursor: "pointer", padding: "4px 8px", fontSize: 13,
            }}
          >✕</button>
        </div>
      </div>

      {/* Skill tags */}
      {(item.matchedSkills?.length > 0 || item.missingSkills?.length > 0) && (
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>
          {(item.matchedSkills || []).map((s, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
              background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7",
            }}>✓ {s}</span>
          ))}
          {(item.missingSkills || []).map((s, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
              background: "#fee2e2", color: "#b42318", border: "1px solid #fca5a5",
            }}>✗ {s}</span>
          ))}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && item.details?.length > 0 && (
        <div style={{
          marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 10,
          display: "grid", gap: 5,
        }}>
          {item.details.map((d, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 8,
              background: d.meets_minimum ? "#f0fdf4" : "#fffbeb",
              border: `1px solid ${d.meets_minimum ? "#bbf7d0" : "#fde68a"}`,
            }}>
              <span style={{ fontSize: 14 }}>{d.meets_minimum ? "✅" : "⚠️"}</span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 12.5, color: "var(--text-1)" }}>{d.intitule}</span>
              <span style={{ fontSize: 11, color: "var(--text-2)" }}>
                Employé : <b>{d.emp_label || (d.employee_level >= 0 ? EVAL_LABELS[d.employee_level] : "—")}</b>
              </span>
              <span style={{ fontSize: 11, color: "var(--text-2)" }}>
                Requis : <b>{d.req_label || EVAL_LABELS[d.required_level] || `${d.required_level}`}</b>
              </span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            {item.totalCompetences} compétence{item.totalCompetences !== 1 ? "s" : ""} validée{item.totalCompetences !== 1 ? "s" : ""} au total
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini AI chat panel ─────────────────────────────────────────────────────────
function AiChatPanel({ activity, recList }) {
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestions = recList?.length ? [
    recList[0] ? `Pourquoi ${recList[0].employeeName} a été sélectionné ?` : null,
    "Qui manque des compétences requises ?",
    "Montre les candidats backup",
    "Montre la liste complète",
  ].filter(Boolean) : [
    "Quels employés ont des compétences en Python ?",
    "Top 5 pour cette activité",
  ];

  const send = async (text) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await http.post("/ai/chat", {
        message: userMsg,
        context: {
          recommendedList: recList || [],
          activityTitle:   activity?.title,
          prioritization:  activity?.prioritization,
          requiredSkills:  (activity?.competences_requises || []).map(c => c.intitule),
        },
      });
      setMessages(prev => [...prev, { role: "assistant", content: res.data.reply || "Pas de réponse." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Erreur de connexion au backend." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      marginTop: 20, border: "1.5px solid var(--border)", borderRadius: 16,
      background: "var(--input-bg)", overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid var(--border)",
        background: "linear-gradient(135deg,#3b6fd4,#2d58b0)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>🤖 Assistant IA</span>
        <span style={{ color: "#bfdbfe", fontSize: 12 }}>— questions sur cette recommandation</span>
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div style={{ padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => send(s)} style={{
              padding: "5px 11px", borderRadius: 999, cursor: "pointer",
              background: "#eff6ff", color: "#3b6fd4", border: "1px solid #bfdbfe",
              fontSize: 12, fontWeight: 600,
            }}>{s}</button>
          ))}
        </div>
      )}

      {/* Message thread */}
      {messages.length > 0 && (
        <div style={{ maxHeight: 220, overflowY: "auto", padding: "10px 14px", display: "grid", gap: 8 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              padding: "8px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.55,
              background: m.role === "user" ? "#3b6fd4" : "#fff",
              color: m.role === "user" ? "#fff" : "#1a2340",
              border: m.role === "user" ? "none" : "1px solid #dde3f0",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "90%",
              whiteSpace: "pre-wrap",
            }}>
              {m.content.split("\n").map((line, j) => {
                const parts = line.split(/\*\*(.*?)\*\*/g);
                return (
                  <span key={j}>
                    {parts.map((p, k) => k % 2 === 1 ? <strong key={k}>{p}</strong> : p)}
                    {"\n"}
                  </span>
                );
              })}
            </div>
          ))}
          {loading && (
            <div style={{
              padding: "8px 12px", borderRadius: 10, background: "var(--surface)",
              border: "1px solid var(--border)", fontSize: 13, color: "var(--text-2)",
            }}>Analyse en cours…</div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: "10px 14px", borderTop: "1px solid var(--border)",
        display: "flex", gap: 8,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ex: Pourquoi cet employé ? Qui manque de Python ?"
          disabled={loading}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 9, border: "1.5px solid var(--border)",
            background: "var(--surface)", fontSize: 13, outline: "none", color: "var(--text-1)",
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{
            padding: "8px 16px", borderRadius: 9,
            background: "linear-gradient(135deg,#3b6fd4,#2d58b0)",
            color: "#fff", border: "none", fontWeight: 700, fontSize: 13,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >↑</button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HRActivityWorkflow() {
  const { id } = useParams();

  const [activity,  setActivity]  = useState(null);
  const [rec,       setRec]       = useState(null);
  const [employees, setEmployees] = useState([]);  // for manual-add panel
  const [empSearch, setEmpSearch] = useState("");
  const [loadingPage,  setLoadingPage]  = useState(true);
  const [loadingAI,    setLoadingAI]    = useState(false);
  const [loadingSave,  setLoadingSave]  = useState(false);
  const [error,  setError]  = useState("");
  const [success,setSuccess]= useState("");

  const load = async () => {
    try {
      setLoadingPage(true);
      setError("");
      const [actRes, recRes, empRes] = await Promise.all([
        http.get(`/activities/${id}`),
        http.get(`/recommendations/${id}`).catch(() => ({ data: null })),
        http.get("/users/employees"),
      ]);
      setActivity(actRes.data);
      setRec(recRes.data);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur de chargement");
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // ── Derived state ────────────────────────────────────────────────────
  const recList        = rec?.list || [];
  const recIds         = new Set(recList.map(r => r.employeeId));
  const seats          = activity?.seats || 5;

  const filteredEmployees = employees.filter(e => {
    const name = (e.name || e.firstName || "").toLowerCase();
    return !empSearch || name.includes(empSearch.toLowerCase());
  });

  // ── Actions ──────────────────────────────────────────────────────────

  const onRunAI = async () => {
    setLoadingAI(true);
    setError("");
    setSuccess("");
    try {
      await http.post(`/recommendations/${id}/run-ai`);
      await load();
      setSuccess("Analyse IA terminée. Liste mise à jour.");
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors du lancement de l'IA");
    } finally {
      setLoadingAI(false);
    }
  };

  const removeFromList = async (empId) => {
    const newList = recList.filter(r => r.employeeId !== empId);
    await saveList(newList);
  };

  const promoteToSelected = async (empId) => {
    // Find the employee and mark as Selected, bump others to Backup if over seats
    const updated = recList.map(r =>
      r.employeeId === empId ? { ...r, status: "Selected" } : r
    );
    // Re-assign ranks/statuses: top seats = Selected, rest = Backup
    const reranked = updated.map((r, idx) => ({ ...r, rank: idx + 1, status: idx < seats ? "Selected" : "Backup" }));
    await saveList(reranked);
  };

  const addToList = async (emp) => {
    const empId   = String(emp._id || emp.id);
    const empName = emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email || empId;
    if (recIds.has(empId)) return;
    const newEntry = {
      employeeId:       empId,
      employeeName:     empName,
      score:            0,
      rank:             recList.length + 1,
      status:           recList.length < seats ? "Selected" : "Backup",
      matchedSkills:    [],
      missingSkills:    [],
      totalCompetences: 0,
      meetsAll:         false,
      meetsCount:       0,
      explanation:      "Ajouté manuellement par HR.",
      details:          [],
    };
    await saveList([...recList, newEntry]);
  };

  const saveList = async (list) => {
    setLoadingSave(true);
    setError("");
    try {
      const res = await http.patch(`/recommendations/${id}`, { list });
      setRec(res.data);
      setSuccess("Liste mise à jour.");
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoadingSave(false);
    }
  };

  const onValidateForward = async () => {
    if (!recList.length) { setError("Aucun employé dans la liste."); return; }
    setLoadingSave(true);
    setError("");
    setSuccess("");
    try {
      await http.patch(`/recommendations/${id}/validate`);
      await load();
      setSuccess("✅ Liste validée et invitations envoyées !");
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la validation");
    } finally {
      setLoadingSave(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────

  if (loadingPage) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--text-2)" }}>
        Chargement…
      </div>
    );
  }

  if (!activity) {
    return (
      <div style={{ padding: 18 }}>
        <div style={card()}>Activité introuvable.</div>
        <Link to="/hr/activities">← Retour</Link>
      </div>
    );
  }

  const st  = STATUS_META[activity.status] || STATUS_META.DRAFT;
  const icon = TYPE_ICONS[activity.type] || "📋";
  const selectedCount = recList.filter(r => r.status === "Selected" || r.rank <= seats).length;
  const backupCount   = recList.filter(r => r.status === "Backup"   || r.rank > seats).length;
  const isLocked      = ["HR_VALIDATED", "SENT_TO_MANAGER", "MANAGER_CONFIRMED", "NOTIFIED"].includes(activity.status);

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)",
        padding: "20px 24px", marginBottom: 18,
        boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>{icon}</span>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>{activity.title}</h1>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                background: st.bg, color: st.color,
              }}>{st.label}</span>
            </div>
            <div style={{ color: "var(--text-2)", fontSize: 13 }}>
              {activity.date && <span>📅 {activity.date}</span>}
              {activity.location && <span style={{ marginLeft: 12 }}>📍 {activity.location}</span>}
              <span style={{ marginLeft: 12 }}>🪑 {seats} places</span>
              {activity.prioritization && (
                <span style={{
                  marginLeft: 12, fontSize: 11, fontWeight: 700,
                  padding: "2px 8px", borderRadius: 6,
                  background: "#eff6ff", color: "#3b6fd4",
                }}>
                  {activity.prioritization}
                </span>
              )}
            </div>

            {/* Required competences */}
            {activity.competences_requises?.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>
                {activity.competences_requises.map((c, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                    background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0",
                  }}>
                    {COMP_TYPE_LABELS[c.type] || c.type}: {c.intitule}
                    {c.niveau_min !== undefined && ` (min: ${EVAL_LABELS[c.niveau_min] || c.niveau_min})`}
                  </span>
                ))}
              </div>
            )}
          </div>

          <Link to="/hr/activities" style={{
            textDecoration: "none", fontWeight: 700, color: "var(--text-2)",
            padding: "8px 12px", borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--surface-2)", fontSize: 13,
          }}>← Retour</Link>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          marginBottom: 14, padding: "12px 16px", borderRadius: 12,
          background: "#fffbfa", border: "1px solid #fecdca", color: "#b42318",
        }}>{error}</div>
      )}
      {success && (
        <div style={{
          marginBottom: 14, padding: "12px 16px", borderRadius: 12,
          background: "#ecfdf3", border: "1px solid #abefc6", color: "#065f46",
        }}>{success}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, alignItems: "start" }}>

        {/* ── LEFT: Recommendations ──────────────────────────────── */}
        <div>
          <div style={{ ...card(), padding: "20px 22px" }}>
            {/* Panel header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--text-1)" }}>
                  🤖 Recommandations IA
                </h2>
                {recList.length > 0 && (
                  <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3 }}>
                    {selectedCount} sélectionné{selectedCount !== 1 ? "s" : ""} · {backupCount} backup
                  </div>
                )}
              </div>

              <button
                onClick={onRunAI}
                disabled={loadingAI || isLocked}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 18px", borderRadius: 10, border: "none",
                  background: loadingAI || isLocked
                    ? "#e2e8f0"
                    : "linear-gradient(135deg,#3b6fd4,#2d58b0)",
                  color: loadingAI || isLocked ? "#94a3b8" : "#fff",
                  fontWeight: 700, fontSize: 13.5, cursor: loadingAI || isLocked ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                }}
              >
                {loadingAI ? (
                  <>
                    <span style={{ fontSize: 15, animation: "spin 1s linear infinite" }}>⏳</span>
                    Analyse des profils…
                  </>
                ) : (
                  <>🚀 Run AI Recommendation</>
                )}
              </button>
            </div>

            {/* Empty state */}
            {recList.length === 0 && !loadingAI && (
              <div style={{
                textAlign: "center", padding: "40px 20px",
                background: "var(--surface-2)", borderRadius: 12, border: "1px dashed #dde3f0",
                color: "var(--text-2)", fontSize: 13,
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🤖</div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Aucune recommandation</div>
                <div>Cliquez sur "Run AI Recommendation" pour analyser les profils employés.</div>
              </div>
            )}

            {/* Loading overlay */}
            {loadingAI && (
              <div style={{
                textAlign: "center", padding: "40px 20px",
                background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 700, color: "#3b6fd4", marginBottom: 4 }}>
                  Analyse des profils en cours…
                </div>
                <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                  Comparaison des compétences avec les critères requis
                </div>
              </div>
            )}

            {/* Recommendation cards */}
            {!loadingAI && recList.length > 0 && (
              <>
                {/* Section: Selected */}
                {selectedCount > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#059669", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      ✅ Sélectionnés ({selectedCount}/{seats} places)
                    </div>
                    {recList
                      .filter(r => r.status === "Selected" || r.rank <= seats)
                      .map(r => (
                        <RecCard
                          key={r.employeeId}
                          item={r}
                          seats={seats}
                          onRemove={removeFromList}
                          onPromoteToSelected={null}
                        />
                      ))
                    }
                  </div>
                )}

                {/* Section: Backup */}
                {backupCount > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      🔄 Backup ({backupCount})
                    </div>
                    {recList
                      .filter(r => r.status === "Backup" || r.rank > seats)
                      .map(r => (
                        <RecCard
                          key={r.employeeId}
                          item={r}
                          seats={seats}
                          onRemove={removeFromList}
                          onPromoteToSelected={promoteToSelected}
                        />
                      ))
                    }
                  </div>
                )}
              </>
            )}

            {/* Validate button */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <button
                onClick={onValidateForward}
                disabled={!recList.length || loadingSave || isLocked}
                style={{
                  width: "100%", padding: "11px", borderRadius: 11, border: "none",
                  background: !recList.length || isLocked
                    ? "#e2e8f0"
                    : "linear-gradient(135deg,#10b981,#059669)",
                  color: !recList.length || isLocked ? "#94a3b8" : "#fff",
                  fontWeight: 800, fontSize: 14,
                  cursor: !recList.length || isLocked ? "not-allowed" : "pointer",
                }}
              >
                {loadingSave ? "Envoi en cours…" : isLocked ? `Déjà validée (${st.label})` : "✅ Valider & envoyer les invitations"}
              </button>
              {!isLocked && recList.length > 0 && (
                <div style={{ textAlign: "center", marginTop: 6, fontSize: 11, color: "var(--text-2)" }}>
                  Enverra des invitations à {recList.length} employé{recList.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>

          {/* AI Chat panel */}
          <AiChatPanel activity={activity} recList={recList.length ? recList : null} />
        </div>

        {/* ── RIGHT: Manual employee add ────────────────────────── */}
        <div style={{ ...card(), padding: "20px 22px" }}>
          <h2 style={{ margin: "0 0 14px 0", fontSize: 16, fontWeight: 800, color: "var(--text-1)" }}>
            👥 Ajouter manuellement
          </h2>

          <input
            type="text"
            placeholder="Rechercher un employé…"
            value={empSearch}
            onChange={e => setEmpSearch(e.target.value)}
            style={{
              width: "100%", padding: "8px 12px", marginBottom: 12,
              border: "1.5px solid var(--border)", borderRadius: 9,
              background: "var(--surface-2)", fontSize: 13, outline: "none",
              color: "var(--text-1)", boxSizing: "border-box",
            }}
          />

          <div style={{ maxHeight: 420, overflowY: "auto", display: "grid", gap: 6 }}>
            {filteredEmployees.length === 0 ? (
              <div style={{ color: "var(--text-2)", fontSize: 13, textAlign: "center", padding: 20 }}>
                Aucun employé trouvé.
              </div>
            ) : (
              filteredEmployees.map(e => {
                const empId  = String(e._id || e.id);
                const inList = recIds.has(empId);
                const name   = e.name || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email || empId;

                return (
                  <div key={empId} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 12px", borderRadius: 10,
                    border: `1px solid ${inList ? "#bbf7d0" : "#dde3f0"}`,
                    background: inList ? "#f0fdf4" : "#fff",
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text-1)" }}>{name}</div>
                      {e.email && <div style={{ fontSize: 11, color: "var(--text-2)" }}>{e.email}</div>}
                    </div>
                    <button
                      onClick={() => addToList(e)}
                      disabled={inList || loadingSave || isLocked}
                      style={{
                        padding: "5px 12px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 700,
                        background: inList ? "#d1fae5" : "#eff6ff",
                        color: inList ? "#059669" : "#3b6fd4",
                        cursor: inList || loadingSave || isLocked ? "not-allowed" : "pointer",
                      }}
                    >
                      {inList ? "✓ Ajouté" : "+ Ajouter"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function card() {
  return {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
  };
}
