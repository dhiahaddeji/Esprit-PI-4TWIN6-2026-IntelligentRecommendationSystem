// src/pages/manager/ManagerReviewActivity.jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import http from "../../api/http";

const EVAL_LABELS = ["Pas de compétence", "Notions", "Pratique", "Maîtrise", "Expert"];

const STATUS_CFG = {
  DRAFT:              { label: "Brouillon",           bg: "#F1F5F9", color: "#64748B" },
  AI_SUGGESTED:       { label: "IA exécutée",         bg: "#EEF7FA", color: "#1D7A91" },
  HR_VALIDATED:       { label: "Validée RH",          bg: "#F0FDF4", color: "#145C2B" },
  SENT_TO_MANAGER:    { label: "En attente manager",  bg: "#FEF6E4", color: "#7A4A00" },
  HR_REGEN_NEEDED:    { label: "Regénération requise",bg: "#FFF3CD", color: "#856404" },
  MANAGER_CONFIRMED:  { label: "Confirmée",           bg: "#F0FDF4", color: "#145C2B" },
  MANAGER_REFUSED:    { label: "Refusée",             bg: "#FBE9E9", color: "#8B1A1A" },
  NOTIFIED:           { label: "Employés notifiés",   bg: "#F0FDF4", color: "#145C2B" },
};

export default function ManagerReviewActivity() {
  const { id } = useParams();

  const [activity, setActivity]         = useState(null);
  const [rec, setRec]                   = useState(null);
  const [selected, setSelected]         = useState([]);
  const [toRefuse, setToRefuse]         = useState([]);          // employees to refuse
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  const [expanded, setExpanded]         = useState({});

  // Refuse activity modal state
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refuseReason, setRefuseReason]       = useState("");
  const [refuseStep, setRefuseStep]           = useState("idle"); // idle | activity | employees

  const load = () => {
    setLoading(true);
    Promise.all([
      http.get(`/activities/${id}`),
      http.get(`/recommendations/${id}`).catch(() => ({ data: null })),
    ])
      .then(([actRes, recRes]) => {
        setActivity(actRes.data);
        setRec(recRes.data);
        const initialSelected = actRes.data?.participants?.length
          ? actRes.data.participants
          : (recRes.data?.list || []).map(x => x.employeeId);
        setSelected(initialSelected);
        setToRefuse([]);
      })
      .catch(e => setError(e?.response?.data?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const toggle = (empId) => {
    setSelected(prev => prev.includes(empId) ? prev.filter(x => x !== empId) : [...prev, empId]);
  };

  const toggleRefuse = (empId) => {
    setToRefuse(prev => prev.includes(empId) ? prev.filter(x => x !== empId) : [...prev, empId]);
  };

  const toggleExpand = (empId) => {
    setExpanded(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  const onConfirm = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      await http.patch(`/activities/${id}/confirm`, { participants: selected });
      setSuccess("Participants confirmés avec succès.");
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la confirmation");
    } finally { setSaving(false); }
  };

  const onNotify = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      await http.patch(`/activities/${id}/notified`);
      setSuccess("Employés marqués comme notifiés.");
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur");
    } finally { setSaving(false); }
  };

  // Refuse the entire activity
  const onRefuseActivity = async () => {
    if (!refuseReason.trim()) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      await http.patch(`/activities/${id}/refuse`, { reason: refuseReason.trim() });
      setSuccess("Activité refusée. Le RH a été notifié.");
      setShowRefuseModal(false);
      setRefuseReason("");
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors du refus");
    } finally { setSaving(false); }
  };

  // Refuse selected employees from the list
  const onRefuseEmployees = async () => {
    if (!toRefuse.length) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const list = rec?.list || [];
      const employeeNames = toRefuse.map(eid => list.find(r => r.employeeId === eid)?.employeeName || eid);
      await http.patch(`/activities/${id}/refuse-employees`, { employeeIds: toRefuse, employeeNames });
      setSuccess(`${toRefuse.length} candidat(s) refusé(s). Le RH va regénérer la liste.`);
      setToRefuse([]);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors du refus des candidats");
    } finally { setSaving(false); }
  };

  if (loading) return <div style={loadingStyle}>Chargement…</div>;

  if (!activity) return (
    <div style={{ padding: 24 }}>
      <div style={cardStyle}>Activité introuvable.</div>
      <Link to="/manager/inbox">← Retour</Link>
    </div>
  );

  const list      = rec?.list || [];
  const refused   = rec?.refusedEmployees || [];
  const canNotify = (activity.participants?.length > 0) && activity.status !== "NOTIFIED";
  const isLocked  = ["MANAGER_CONFIRMED", "NOTIFIED", "MANAGER_REFUSED"].includes(activity.status);
  const statusCfg = STATUS_CFG[activity.status] || { label: activity.status, bg: "#F1F5F9", color: "#64748B" };

  const sortedList = list.slice().sort((a, b) => b.score - a.score);

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <Link to="/manager/inbox" style={{ color: "#1D7A91", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            ← Retour aux approbations
          </Link>
          <h1 style={{ margin: "8px 0 4px", fontSize: 22, fontWeight: 900, color: "#0B2D38" }}>
            {activity.title}
          </h1>
          <div style={{ color: "#64748B", fontSize: 13, display: "flex", gap: 16 }}>
            {activity.date && <span>📅 {activity.date}</span>}
            {activity.location && <span>📍 {activity.location}</span>}
            <span>👥 {activity.seats} places</span>
            <span>🎯 {activity.type}</span>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ ...pillStyle, background: statusCfg.bg, color: statusCfg.color }}>
              {statusCfg.label}
            </span>
            {activity.prioritization && (
              <span style={{ ...pillStyle, background: "#EEF7FA", color: "#1D7A91" }}>
                {activity.prioritization}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Refused banner ── */}
      {activity.status === "MANAGER_REFUSED" && (
        <div style={{ ...bannerStyle, background: "#FBE9E9", borderColor: "#F28080", color: "#8B1A1A", marginBottom: 16 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>🚫 Vous avez refusé cette activité</div>
          <div style={{ marginTop: 4, fontSize: 13 }}>
            Motif : <em>"{activity.refusalReason}"</em>
          </div>
        </div>
      )}

      {/* ── Feedback messages ── */}
      {error   && <div style={{ ...bannerStyle, background: "#FBE9E9", borderColor: "#F28080", color: "#8B1A1A", marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ ...bannerStyle, background: "#F0FDF4", borderColor: "#abefc6", color: "#065f46", marginBottom: 12 }}>{success}</div>}

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>

        {/* Left: recommendation list */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#0B2D38" }}>
              Liste recommandée par l'IA
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              {list.length} candidat{list.length !== 1 ? "s" : ""}
              {refused.length > 0 && <span style={{ marginLeft: 6, color: "#8B1A1A" }}>• {refused.length} exclu{refused.length !== 1 ? "s" : ""}</span>}
            </div>
          </div>

          {!isLocked && list.length > 0 && (
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
              Coche pour <strong>confirmer</strong> ou utilise le mode refus pour <strong>exclure</strong> des candidats.
            </div>
          )}

          {/* Mode tabs when not locked */}
          {!isLocked && list.length > 0 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <button
                onClick={() => setRefuseStep("idle")}
                style={refuseStep === "idle" ? modeTabActive : modeTab}
              >✅ Confirmer</button>
              <button
                onClick={() => setRefuseStep("employees")}
                style={refuseStep === "employees" ? { ...modeTabActive, background: "#FBE9E9", color: "#8B1A1A", borderColor: "#F28080" } : { ...modeTab, color: "#8B1A1A" }}
              >❌ Refuser des candidats</button>
            </div>
          )}

          {/* Employee cards */}
          <div style={{ display: "grid", gap: 8 }}>
            {sortedList.length === 0 ? (
              <div style={{ color: "#94A3B8", textAlign: "center", padding: "24px 0" }}>
                Aucune liste reçue du RH.
              </div>
            ) : (
              sortedList.map((r, idx) => {
                const isSelected  = selected.includes(r.employeeId);
                const isToRefuse  = toRefuse.includes(r.employeeId);
                const isExpanded  = expanded[r.employeeId];
                const scoreColor  = r.score >= 80 ? "#145C2B" : r.score >= 60 ? "#1D7A91" : r.score >= 40 ? "#7A4A00" : "#8B1A1A";
                const scoreBg     = r.score >= 80 ? "#F0FDF4" : r.score >= 60 ? "#EEF7FA" : r.score >= 40 ? "#FEF6E4" : "#FBE9E9";

                return (
                  <div key={r.employeeId} style={{
                    border: isToRefuse ? "2px solid #F28080" : isSelected && refuseStep === "idle" ? "2px solid #1D7A91" : "1px solid #E2E8F0",
                    borderRadius: 14,
                    padding: 14,
                    background: isToRefuse ? "#FFF8F8" : "var(--surface)",
                    transition: "border-color 0.15s",
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      {/* Rank */}
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: idx === 0 ? "#C9952A" : idx === 1 ? "#94A3B8" : "#E2E8F0",
                        color: idx < 2 ? "#fff" : "#64748B",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 900, fontSize: 13,
                      }}>
                        {r.rank || idx + 1}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "#0B2D38", truncate: true }}>
                            {r.employeeName || r.employeeId}
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 900, padding: "3px 9px", borderRadius: 999, background: scoreBg, color: scoreColor }}>
                              {r.score}%
                            </span>
                            {r.status === "Backup" && (
                              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, background: "#EEF7FA", color: "#1D7A91", fontWeight: 700 }}>
                                Backup
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Meets count */}
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                          {r.meetsCount ?? 0}/{r.details?.length ?? 0} compétences requises atteintes
                          {r.meetsAll ? " ✅" : ""}
                        </div>

                        {/* Explanation */}
                        {r.explanation && (
                          <div style={{ fontSize: 11, color: "#64748B", marginTop: 3, fontStyle: "italic" }}>
                            {r.explanation}
                          </div>
                        )}

                        {/* Skill chips */}
                        {r.details?.length > 0 && (
                          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {r.details.slice(0, isExpanded ? r.details.length : 3).map((d, i) => (
                              <span key={i} style={{
                                fontSize: 10, padding: "2px 7px", borderRadius: 6,
                                background: d.meets_minimum ? "#F0FDF4" : "#FBE9E9",
                                color: d.meets_minimum ? "#145C2B" : "#8B1A1A",
                                border: `1px solid ${d.meets_minimum ? "#abefc6" : "#F28080"}`,
                              }}>
                                {d.intitule}: <strong>{d.emp_label}</strong> / {d.req_label}
                              </span>
                            ))}
                            {r.details.length > 3 && (
                              <button onClick={() => toggleExpand(r.employeeId)} style={expandBtn}>
                                {isExpanded ? "▲ Moins" : `+${r.details.length - 3} autres`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action checkbox */}
                      {!isLocked && (
                        <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                          {refuseStep === "idle" ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggle(r.employeeId)}
                              style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#1D7A91" }}
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={isToRefuse}
                              onChange={() => toggleRefuse(r.employeeId)}
                              style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#8B1A1A" }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Actions */}
          {!isLocked && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {refuseStep === "idle" ? (
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={onConfirm}
                    disabled={saving || selected.length === 0}
                    style={btnPrimary}
                  >
                    {saving ? "…" : `✅ Confirmer (${selected.length})`}
                  </button>
                  <button
                    onClick={onNotify}
                    disabled={saving || !canNotify}
                    style={btnGhost}
                  >
                    {saving ? "…" : "📣 Marquer notifié"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#64748B" }}>
                    {toRefuse.length} sélectionné{toRefuse.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={onRefuseEmployees}
                    disabled={saving || toRefuse.length === 0}
                    style={{ ...btnPrimary, background: "#8B1A1A" }}
                  >
                    {saving ? "…" : `❌ Refuser (${toRefuse.length})`}
                  </button>
                  <button onClick={() => { setRefuseStep("idle"); setToRefuse([]); }} style={btnGhost}>
                    Annuler
                  </button>
                </div>
              )}

              {/* Refuse entire activity */}
              {!isLocked && (
                <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowRefuseModal(true)}
                    style={{ background: "none", border: "1px solid #F28080", color: "#8B1A1A", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    🚫 Refuser l'activité entière
                  </button>
                </div>
              )}
            </div>
          )}

          {!isLocked && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#94A3B8" }}>
              ⚠️ Confirme d'abord les participants, puis marque comme notifié.
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Confirmed participants */}
          <div style={cardStyle}>
            <div style={{ fontWeight: 900, fontSize: 15, color: "#0B2D38", marginBottom: 12 }}>
              Participants confirmés ({activity.participants?.length || 0})
            </div>
            {(activity.participants || []).length === 0 ? (
              <div style={{ color: "#94A3B8", fontSize: 13 }}>Aucun participant confirmé.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {(activity.participants || []).map(pid => {
                  const fromList = list.find(r => r.employeeId === pid);
                  return (
                    <div key={pid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 10, background: "#F0FDF4", border: "1px solid #abefc6" }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#065f46" }}>
                        {fromList?.employeeName || pid}
                      </span>
                      {fromList && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#145C2B" }}>
                          {fromList.score}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Required competencies */}
          {activity.competences_requises?.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontWeight: 900, fontSize: 15, color: "#0B2D38", marginBottom: 10 }}>
                Compétences requises
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {activity.competences_requises.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 8, background: "#EEF7FA", border: "1px solid #D6EEF3" }}>
                    <span style={{ fontSize: 13, color: "#0B2D38", fontWeight: 600 }}>{c.intitule}</span>
                    <span style={{ fontSize: 11, color: "#1D7A91", fontWeight: 700 }}>
                      min: {EVAL_LABELS[c.niveau_min] ?? c.niveau_min}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Excluded employees */}
          {refused.length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontWeight: 900, fontSize: 15, color: "#8B1A1A", marginBottom: 10 }}>
                🚫 Candidats exclus ({refused.length})
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>
                Ces candidats ne seront plus proposés par l'IA.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {refused.map(eid => {
                  const emp = list.find(r => r.employeeId === eid);
                  return (
                    <div key={eid} style={{ padding: "5px 10px", borderRadius: 8, background: "#FBE9E9", border: "1px solid #F28080", fontSize: 13, color: "#8B1A1A" }}>
                      {emp?.employeeName || eid}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Refuse activity modal ── */}
      {showRefuseModal && (
        <>
          <div onClick={() => setShowRefuseModal(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100,
          }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: "var(--surface)", borderRadius: 20, padding: 28, width: 440, maxWidth: "90vw",
            zIndex: 101, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#8B1A1A", marginBottom: 6 }}>
              🚫 Refuser l'activité
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
              Le RH sera notifié avec votre motif de refus.
            </div>
            <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0B2D38" }}>
              Motif de refus *
            </label>
            <textarea
              value={refuseReason}
              onChange={e => setRefuseReason(e.target.value)}
              placeholder="Expliquez pourquoi vous refusez cette activité…"
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1.5px solid #E2E8F0", borderRadius: 10, padding: 10,
                fontSize: 13, resize: "vertical", fontFamily: "inherit",
                outline: "none", color: "#0B2D38",
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowRefuseModal(false)} style={btnGhost}>Annuler</button>
              <button
                onClick={onRefuseActivity}
                disabled={saving || !refuseReason.trim()}
                style={{ ...btnPrimary, background: "#8B1A1A" }}
              >
                {saving ? "…" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Style helpers ── */
const cardStyle = {
  background: "var(--surface)", border: "1px solid #E2E8F0",
  borderRadius: 18, padding: 18,
};
const pillStyle = {
  fontSize: 11, padding: "4px 10px", borderRadius: 999, fontWeight: 700,
};
const bannerStyle = {
  borderRadius: 12, padding: "12px 16px", border: "1px solid",
};
const loadingStyle = {
  padding: 24, color: "#64748B",
};
const btnPrimary = {
  background: "#0B2D38", color: "#fff", padding: "9px 16px",
  borderRadius: 10, border: "none", fontWeight: 800, cursor: "pointer", fontSize: 13,
};
const btnGhost = {
  background: "var(--surface)", border: "1px solid #E2E8F0", padding: "9px 16px",
  borderRadius: 10, fontWeight: 700, cursor: "pointer", fontSize: 13, color: "#0B2D38",
};
const modeTab = {
  padding: "7px 14px", borderRadius: 8, border: "1px solid #E2E8F0",
  background: "var(--surface)", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#64748B",
};
const modeTabActive = {
  padding: "7px 14px", borderRadius: 8, border: "1px solid #1D7A91",
  background: "#EEF7FA", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#1D7A91",
};
const expandBtn = {
  fontSize: 10, padding: "2px 7px", borderRadius: 6, border: "1px solid #E2E8F0",
  background: "none", cursor: "pointer", color: "#64748B", fontWeight: 700,
};
