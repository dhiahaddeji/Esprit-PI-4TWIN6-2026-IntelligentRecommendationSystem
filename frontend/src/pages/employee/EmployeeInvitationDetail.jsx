import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { employeeGetInvitation, employeeRespond, getActivityById } from "../../services/workflowService";

export default function EmployeeInvitationDetail() {
  const { id } = useParams();
  const nav = useNavigate();

  const [inv, setInv] = useState(null);
  const [act, setAct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");

  // fetch invitation and related activity
  useEffect(() => {
    async function load() {
      try {
        const invitation = await employeeGetInvitation(id);
        setInv(invitation);
        if (invitation?.activityId) {
          const activity = await getActivityById(invitation.activityId);
          setAct(activity);
        }
      } catch (e) {
        setError(e.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div style={{ padding: 18 }}>Chargement...</div>;
  }

  if (!inv) {
    return (
      <div style={{ padding: 18 }}>
        <div style={card()}>Invitation introuvable.</div>
        <Link to="/employee/invitations">← Retour</Link>
      </div>
    );
  }

  const accept = () => {
    setError("");
    try {
      employeeRespond(id, { decision: "ACCEPTED" });
      nav("/employee/participations", { replace: true });
    } catch (e) {
      setError(e.message);
    }
  };

  const decline = () => {
    setError("");
    try {
      if (!justification.trim()) throw new Error("Justification obligatoire pour refuser.");
      employeeRespond(id, { decision: "DECLINED", justification });
      nav("/employee/participations", { replace: true });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: 18, maxWidth: 860 }}>
      <Link to="/employee/invitations" style={{ textDecoration: "none", fontWeight: 900, color: "#0B2D38" }}>
        ← Retour notifications
      </Link>

      <div style={{ ...card(), marginTop: 12 }}>
        <h1 style={{ margin: 0 }}>{act?.title}</h1>
        <div style={{ marginTop: 6, color: "var(--text-2)" }}>
          {act?.date} • {act?.location}
        </div>

        <div style={{ marginTop: 12 }}>
          <span style={pill(inv.status)}>{inv.status}</span>
        </div>

        <div style={{ marginTop: 14, color: "#344054" }}>
          <b>Description:</b> {act?.description || "—"}
        </div>

        {error && (
          <div style={{ marginTop: 12, color: "#8B1A1A", background: "#FDF8EE", border: "1px solid #F28080", padding: 10, borderRadius: 12 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={accept} style={btnPrimary()} disabled={inv.status !== "PENDING"}>
            Accepter
          </button>

          <button onClick={decline} style={btnDanger()} disabled={inv.status !== "PENDING"}>
            Refuser
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontWeight: 900, fontSize: 13 }}>Justification (si refus):</label>
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
            placeholder="Explique pourquoi tu refuses (ex: indisponible, surcharge, conflit planning...)"
            style={{ width: "100%", marginTop: 6, padding: 12, borderRadius: 12, border: "1px solid #eef0f4" }}
          />
        </div>
      </div>
    </div>
  );
}

function card() {
  return { background: "var(--surface)", border: "1px solid #eef0f4", borderRadius: 16, padding: 16 };
}
function btnPrimary() {
  return { background: "#0B2D38", color: "white", padding: "10px 14px", borderRadius: 12, border: "none", fontWeight: 900, cursor: "pointer" };
}
function btnDanger() {
  return { background: "#8B1A1A", color: "white", padding: "10px 14px", borderRadius: 12, border: "none", fontWeight: 900, cursor: "pointer" };
}
function pill(status) {
  const map = {
    PENDING: { bg: "#EEF7FA", bd: "#eef0f4", tx: "#344054" },
    ACCEPTED: { bg: "#ecfdf3", bd: "#abefc6", tx: "#067647" },
    DECLINED: { bg: "#FDF8EE", bd: "#F28080", tx: "#8B1A1A" },
  };
  const s = map[status] || map.PENDING;
  return { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: `1px solid ${s.bd}`, background: s.bg, fontWeight: 900, color: s.tx };
}
