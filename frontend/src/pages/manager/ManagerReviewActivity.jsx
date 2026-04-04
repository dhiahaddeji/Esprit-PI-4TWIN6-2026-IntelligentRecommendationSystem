// src/pages/manager/ManagerReviewActivity.jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import http from "../../api/http";

const EVAL_LABELS = ["Pas de compétence", "Notions", "Pratique", "Maîtrise", "Expert"];

export default function ManagerReviewActivity() {
  const { id } = useParams();

  const [activity, setActivity] = useState(null);
  const [rec, setRec]           = useState(null);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

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
      })
      .catch(e => setError(e?.response?.data?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const toggle = (empId) => {
    setSelected(prev => prev.includes(empId) ? prev.filter(x => x !== empId) : [...prev, empId]);
  };

  const onConfirm = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await http.patch(`/activities/${id}/confirm`, { participants: selected });
      setSuccess("Participants confirmés.");
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la confirmation");
    } finally {
      setSaving(false);
    }
  };

  const onNotify = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await http.patch(`/activities/${id}/notified`);
      setSuccess("Statut mis à jour : employés notifiés.");
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Erreur lors de la notification");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 18 }}>Chargement…</div>;

  if (!activity) {
    return (
      <div style={{ padding: 18 }}>
        <div style={card()}>Activité introuvable.</div>
        <Link to="/manager/inbox">← Retour</Link>
      </div>
    );
  }

  const list = rec?.list || [];
  const canNotify = (activity.participants?.length > 0) && activity.status !== "NOTIFIED";

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>{activity.title}</h1>
          <div style={{ marginTop: 6, color: "var(--text-2)" }}>
            {activity.date} • {activity.location} • {activity.seats} places
          </div>
          <div style={{ marginTop: 10 }}>
            <span style={pill()}>{activity.status}</span>
          </div>
        </div>
        <Link to="/manager/inbox" style={{ textDecoration: "none", fontWeight: 900, color: "#0b2b4b" }}>
          ← Retour inbox
        </Link>
      </div>

      {error && (
        <div style={{ ...card(), borderColor: "#fecdca", background: "#fffbfa", color: "#b42318", marginTop: 14 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ ...card(), borderColor: "#abefc6", background: "#ecfdf3", color: "#065f46", marginTop: 14 }}>
          {success}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
        {/* Left: recommended list */}
        <div style={card()}>
          <div style={{ fontWeight: 900 }}>Liste recommandée par l'IA</div>
          <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 6 }}>
            Coche les participants à confirmer, puis clique sur "Confirmer".
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {list.length === 0 ? (
              <div style={{ color: "var(--text-2)" }}>Aucune liste reçue de HR.</div>
            ) : (
              list
                .slice()
                .sort((a, b) => b.score - a.score)
                .map(r => {
                  const checked = selected.includes(r.employeeId);
                  return (
                    <label key={r.employeeId} style={{ ...row(), cursor: "pointer" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {r.rank ? `#${r.rank} ` : ""}{r.employeeName || r.employeeId}
                        </div>
                        <div style={{ color: "var(--text-2)", fontSize: 12, marginTop: 2 }}>
                          {r.meetsCount ?? 0}/{(r.details?.length ?? 0)} compétences requises atteintes
                          {r.meetsAll ? " ✅" : ""}
                        </div>
                        {r.details?.length > 0 && (
                          <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {r.details.slice(0, 3).map((d, i) => (
                              <span key={i} style={{
                                fontSize: 10, padding: "1px 6px", borderRadius: 6,
                                background: d.meets_minimum ? "#d1fae5" : "#fee2e2",
                                color: d.meets_minimum ? "#065f46" : "#b42318",
                              }}>
                                {d.intitule}: {EVAL_LABELS[d.employee_level] ?? "—"} / {EVAL_LABELS[d.required_level] ?? "—"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                        <span style={scoreTag()}>{r.score}%</span>
                        <input type="checkbox" checked={checked} onChange={() => toggle(r.employeeId)} />
                      </div>
                    </label>
                  );
                })
            )}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onConfirm} disabled={saving || selected.length === 0} style={btnGhost()}>
              {saving ? "…" : `Confirmer (${selected.length})`}
            </button>
            <button onClick={onNotify} disabled={saving || !canNotify} style={btnPrimary()}>
              {saving ? "…" : "Marquer notifié"}
            </button>
          </div>

          <div style={{ marginTop: 10, color: "var(--text-2)", fontSize: 12 }}>
            ⚠️ Confirme d'abord les participants, ensuite marque comme notifié.
          </div>
        </div>

        {/* Right: confirmed participants */}
        <div style={card()}>
          <div style={{ fontWeight: 900 }}>Participants confirmés ({activity.participants?.length || 0})</div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {(activity.participants || []).length === 0 ? (
              <div style={{ color: "var(--text-2)" }}>Aucun participant confirmé.</div>
            ) : (
              (activity.participants || []).map(pid => {
                const fromList = list.find(r => r.employeeId === pid);
                return (
                  <div key={pid} style={{ border: "1px solid #eef0f4", borderRadius: 12, padding: 10 }}>
                    <div style={{ fontWeight: 700 }}>{fromList?.employeeName || pid}</div>
                    {fromList && (
                      <div style={{ color: "var(--text-2)", fontSize: 12 }}>Score IA: {fromList.score}%</div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Activity details */}
          {activity.competences_requises?.length > 0 && (
            <div style={{ marginTop: 16, borderTop: "1px solid #eef0f4", paddingTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Compétences requises</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {activity.competences_requises.map((c, i) => (
                  <span key={i} style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 6,
                    background: "#eff6ff", color: "#3b6fd4", border: "1px solid #bfdbfe",
                  }}>
                    {c.intitule} (min: {EVAL_LABELS[c.niveau_min] ?? c.niveau_min})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function card() {
  return { background: "var(--surface)", border: "1px solid #eef0f4", borderRadius: 16, padding: 16 };
}
function pill() {
  return { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid #eef0f4", background: "var(--surface-2)", fontWeight: 900 };
}
function btnPrimary() {
  return { background: "#0b2b4b", color: "white", padding: "10px 12px", borderRadius: 12, border: "none", fontWeight: 900, cursor: "pointer" };
}
function btnGhost() {
  return { background: "var(--surface)", border: "1px solid #eef0f4", padding: "10px 12px", borderRadius: 12, fontWeight: 900, cursor: "pointer" };
}
function row() {
  return { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 14, border: "1px solid #eef0f4", background: "var(--surface)" };
}
function scoreTag() {
  return { fontSize: 12, fontWeight: 900, padding: "4px 10px", borderRadius: 999, background: "#ecfdf3", border: "1px solid #abefc6" };
}
