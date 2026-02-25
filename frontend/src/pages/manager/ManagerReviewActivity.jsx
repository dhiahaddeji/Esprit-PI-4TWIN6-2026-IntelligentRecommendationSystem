import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getActivityById,
  getRecommendation,
  getUserById,
  managerConfirmParticipants,
  managerNotifyEmployees,
} from "../../services/workflowService";

export default function ManagerReviewActivity() {
  const { id } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");

  const activity = useMemo(() => getActivityById(id), [id, refreshKey]);
  const rec = useMemo(() => getRecommendation(id), [id, refreshKey]);

  const [selected, setSelected] = useState(() => (activity?.participants ? activity.participants : rec?.list?.map((x) => x.employeeId) || []));

  if (!activity) {
    return (
      <div style={{ padding: 18 }}>
        <div style={card()}>Activité introuvable.</div>
        <Link to="/manager/inbox">← Retour</Link>
      </div>
    );
  }

  const manager = getUserById(activity.managerId);

  const toggle = (empId) => {
    setSelected((prev) => (prev.includes(empId) ? prev.filter((x) => x !== empId) : [...prev, empId]));
  };

  const onConfirm = () => {
    setError("");
    try {
      managerConfirmParticipants(id, selected);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    }
  };

  const onNotify = () => {
    setError("");
    try {
      managerNotifyEmployees(id);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    }
  };

  const list = rec?.list || [];

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>{activity.title}</h1>
          <div style={{ marginTop: 6, color: "#667085" }}>
            Manager: <b>{manager?.name}</b> • {activity.date} • {activity.location} • places: {activity.seats}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
        <div style={card()}>
          <div style={{ fontWeight: 900 }}>Liste recommandée (HR → Manager)</div>
          <div style={{ color: "#667085", fontSize: 13, marginTop: 6 }}>
            Confirme la participation ou ajuste la liste, puis notifie les employés.
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {list.length === 0 ? (
              <div style={{ color: "#667085" }}>Aucune liste reçue.</div>
            ) : (
              list
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((r) => {
                  const emp = getUserById(r.employeeId);
                  const checked = selected.includes(r.employeeId);
                  return (
                    <label key={r.employeeId} style={row()}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{emp?.name}</div>
                        <div style={{ color: "#667085", fontSize: 12 }}>{emp?.dept || "—"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={scoreTag()}>{r.score}%</span>
                        <input type="checkbox" checked={checked} onChange={() => toggle(r.employeeId)} />
                      </div>
                    </label>
                  );
                })
            )}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={onConfirm} style={btnGhost()}>
              Confirmer participants
            </button>
            <button onClick={onNotify} style={btnPrimary()} disabled={!activity.participants?.length}>
              Notifier employés
            </button>
          </div>

          <div style={{ marginTop: 10, color: "#667085", fontSize: 12 }}>
            ⚠️ Tu dois d’abord <b>confirmer participants</b>, ensuite tu peux notifier.
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontWeight: 900 }}>Résumé</div>
          <div style={{ marginTop: 10, color: "#667085", fontSize: 13 }}>
            Participants confirmés: <b>{activity.participants?.length || 0}</b>
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {(activity.participants || []).map((pid) => {
              const emp = getUserById(pid);
              return (
                <div key={pid} style={{ border: "1px solid #eef0f4", borderRadius: 12, padding: 10 }}>
                  <div style={{ fontWeight: 900 }}>{emp?.name}</div>
                  <div style={{ color: "#667085", fontSize: 12 }}>{emp?.dept || "—"}</div>
                </div>
              );
            })}
            {!activity.participants?.length && <div style={{ color: "#667085" }}>Aucun participant confirmé.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ui helpers */
function card() {
  return { background: "#fff", border: "1px solid #eef0f4", borderRadius: 16, padding: 16 };
}
function pill() {
  return { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid #eef0f4", background: "#f8fafc", fontWeight: 900 };
}
function btnPrimary() {
  return { background: "#0b2b4b", color: "white", padding: "10px 12px", borderRadius: 12, border: "none", fontWeight: 900, cursor: "pointer" };
}
function btnGhost() {
  return { background: "#fff", border: "1px solid #eef0f4", padding: "10px 12px", borderRadius: 12, fontWeight: 900, cursor: "pointer" };
}
function row() {
  return { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, border: "1px solid #eef0f4", background: "#fff" };
}
function scoreTag() {
  return { fontSize: 12, fontWeight: 900, padding: "4px 10px", borderRadius: 999, background: "#ecfdf3", border: "1px solid #abefc6" };
}
