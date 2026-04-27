import { useEffect, useMemo, useState } from "react";
import { fetchMyParticipations } from "../../services/participationService";
 
export default function MyParticipationStatus() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMyParticipations();
        setList(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const eventsByDate = useMemo(() => buildEventsByDate(list), [list]);
  const monthLabel = viewDate.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
  const calendarCells = buildCalendarCells(viewDate);

  if (loading) return <div style={{ padding: 18 }}>Chargement...</div>;

  return (
    <div style={{ padding: 18 }}>
      <style>{`
        @keyframes calIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Statut de participation</h1>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>
          Calendrier personnel des activites
        </span>
      </div>

      <div style={{ ...calendarWrap() }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setViewDate(prev => addMonths(prev, -1))} style={navBtn()}>
              ←
            </button>
            <div style={{ fontWeight: 900, fontSize: 16, textTransform: "capitalize" }}>{monthLabel}</div>
            <button onClick={() => setViewDate(prev => addMonths(prev, 1))} style={navBtn()}>
              →
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={legendDot("#22c55e")} /> Accepte
            <span style={{ width: 6 }} />
            <span style={legendDot("#ef4444")} /> Refuse
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 14 }}>
          {weekdays().map((d) => (
            <div key={d} style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "#6b7280" }}>
              {d}
            </div>
          ))}
          {calendarCells.map((cell, idx) => {
            const key = cell.date ? toKey(cell.date) : `empty-${idx}`;
            const events = cell.date ? eventsByDate.get(key) || [] : [];
            const isToday = cell.date && isSameDay(cell.date, new Date());
            return (
              <div
                key={key}
                style={dayCell({ muted: !cell.inMonth, today: isToday })}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: cell.inMonth ? "#0f172a" : "#cbd5f5" }}>
                  {cell.date ? cell.date.getDate() : ""}
                </div>
                {events.slice(0, 2).map((ev, i) => (
                  <div key={`${ev.id}-${i}`} style={eventPill(ev.status)} title={ev.title}>
                    {ev.title}
                  </div>
                ))}
                {events.length > 2 && (
                  <div style={{ fontSize: 10, color: "#64748b" }}>+{events.length - 2} autre(s)</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {list.length === 0 ? (
          <div style={card()}>Aucun statut pour le moment.</div>
        ) : (
          list.map((p) => (
            <div key={p._id || p.id} style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {p.activity?.title || `Activite ${p.activityId}`}
                  </div>
                  {p.activity?.startDate || p.activity?.date ? (
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-2)" }}>
                      {formatRange(p.activity)}
                      {p.activity?.location ? ` • ${p.activity.location}` : ""}
                    </div>
                  ) : null}
                </div>
                <span style={pill(p.status)}>{p.status}</span>
              </div>

              {p.status === "DECLINED" && (
                <div style={{ marginTop: 10, color: "#8B1A1A" }}>
                  <b>Justification:</b> {p.justification || "—"}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function card() {
  return { background: "var(--surface)", border: "1px solid #eef0f4", borderRadius: 16, padding: 16 };
}
function pill(status) {
  const map = {
    ACCEPTED: { bg: "#ecfdf3", bd: "#abefc6", tx: "#067647" },
    DECLINED: { bg: "#FDF8EE", bd: "#F28080", tx: "#8B1A1A" },
  };
  const s = map[status] || { bg: "#EEF7FA", bd: "#eef0f4", tx: "#344054" };
  return { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: `1px solid ${s.bd}`, background: s.bg, fontWeight: 900, color: s.tx };
}

function calendarWrap() {
  return {
    marginTop: 16,
    borderRadius: 18,
    padding: 18,
    border: "1px solid #dbeafe",
    background: "linear-gradient(135deg, #eff6ff, #f8fafc)",
    boxShadow: "0 8px 28px rgba(15, 23, 42, 0.08)",
    fontFamily: "Sora, 'Space Grotesk', 'Poppins', sans-serif",
  };
}

function navBtn() {
  return {
    border: "1px solid #dbeafe",
    background: "#fff",
    borderRadius: 10,
    padding: "6px 10px",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function legendDot(color) {
  return {
    width: 10,
    height: 10,
    borderRadius: 999,
    display: "inline-block",
    background: color,
    boxShadow: `0 0 0 2px ${color}22`,
  };
}

function dayCell({ muted, today }) {
  return {
    minHeight: 78,
    padding: 8,
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    background: muted ? "#f8fafc" : "#ffffff",
    outline: today ? "2px solid #2563eb" : "none",
    animation: "calIn 0.45s ease",
    display: "grid",
    gap: 4,
  };
}

function eventPill(status) {
  const map = {
    ACCEPTED: { bg: "#dcfce7", tx: "#166534" },
    DECLINED: { bg: "#fee2e2", tx: "#991b1b" },
  };
  const s = map[status] || { bg: "#e2e8f0", tx: "#334155" };
  return {
    fontSize: 10,
    padding: "2px 6px",
    borderRadius: 999,
    background: s.bg,
    color: s.tx,
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function weekdays() {
  return ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
}

function buildCalendarCells(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7;
  const totalDays = last.getDate();
  const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayIndex = i - startOffset + 1;
    if (dayIndex < 1 || dayIndex > totalDays) {
      cells.push({ date: null, inMonth: false });
    } else {
      cells.push({ date: new Date(year, month, dayIndex), inMonth: true });
    }
  }
  return cells;
}

function buildEventsByDate(list) {
  const map = new Map();
  for (const p of list || []) {
    const activity = p.activity || {};
    const start = toDate(activity.startDate || activity.date);
    const end = toDate(activity.endDate || activity.startDate || activity.date);
    if (!start || !end) continue;

    const title = activity.title || `Activite ${p.activityId}`;
    const safeEnd = end >= start ? end : start;
    const maxDays = 120;
    let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    let days = 0;
    while (cursor <= safeEnd && days < maxDays) {
      const key = toKey(cursor);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        id: p._id || p.id || `${p.activityId}-${p.status}`,
        title,
        status: p.status,
      });
      cursor.setDate(cursor.getDate() + 1);
      days++;
    }
  }
  return map;
}

function toDate(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatRange(activity) {
  const start = toDate(activity.startDate || activity.date);
  const end = toDate(activity.endDate || activity.startDate || activity.date);
  if (!start) return "";
  const startLabel = start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  if (!end) return startLabel;
  const endLabel = end.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  return endLabel !== startLabel ? `${startLabel} - ${endLabel}` : startLabel;
}