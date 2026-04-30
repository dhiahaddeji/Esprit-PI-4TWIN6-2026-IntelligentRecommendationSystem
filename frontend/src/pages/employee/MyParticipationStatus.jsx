import { useEffect, useMemo, useState } from "react";
import { fetchMyParticipations } from "../../services/participationService";

const QUICK_WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function MyParticipationStatus() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());

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
  const selectedEvents = eventsByDate.get(toKey(selectedDate)) || [];
  const acceptedCount = selectedEvents.filter((ev) => ev.status === "ACCEPTED").length;
  const declinedCount = selectedEvents.filter((ev) => ev.status === "DECLINED").length;

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

      <div style={calendarWrap()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => setViewDate((prev) => addMonths(prev, -1))} style={navBtn()}>
              ←
            </button>
            <div style={{ fontWeight: 900, fontSize: 16, textTransform: "capitalize" }}>{monthLabel}</div>
            <button onClick={() => setViewDate((prev) => addMonths(prev, 1))} style={navBtn()}>
              →
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDate(now);
              }}
              style={todayBtn()}
            >
              Aujourd'hui
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, flexWrap: "wrap" }}>
            <span style={legendDot("#22c55e")} /> Accepte
            <span style={{ width: 6 }} />
            <span style={legendDot("#ef4444")} /> Refuse
            <span style={{ width: 6 }} />
            <span style={legendDot("#2563eb")} /> Selection
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 14 }}>
          {QUICK_WEEKDAYS.map((d) => (
            <div key={d} style={{ fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: "#6b7280" }}>
              {d}
            </div>
          ))}

          {calendarCells.map((cell, idx) => {
            const key = `${toKey(cell.date)}-${idx}`;
            const events = eventsByDate.get(toKey(cell.date)) || [];
            const accepted = events.filter((ev) => ev.status === "ACCEPTED").length;
            const declined = events.filter((ev) => ev.status === "DECLINED").length;
            const isToday = isSameDay(cell.date, new Date());
            const isSelected = isSameDay(cell.date, selectedDate);

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDate(cell.date);
                  setViewDate(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                }}
                style={dayCell({
                  muted: !cell.inMonth,
                  today: isToday,
                  selected: isSelected,
                  hasEvents: events.length > 0,
                })}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: cell.inMonth ? "#0f172a" : "#94a3b8" }}>
                    {cell.date.getDate()}
                  </div>
                  {events.length > 0 && <div style={dayCountBadge(events.length)}>{events.length}</div>}
                </div>

                {events.slice(0, 2).map((ev, i) => (
                  <div key={`${ev.id}-${i}`} style={eventPill(ev.status)} title={ev.title}>
                    {ev.title}
                  </div>
                ))}

                {events.length > 2 && (
                  <div style={{ fontSize: 10, color: "#64748b" }}>+{events.length - 2} autre(s)</div>
                )}

                {events.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                    {accepted > 0 && <span style={miniStat("#22c55e")}>{accepted}A</span>}
                    {declined > 0 && <span style={miniStat("#ef4444")}>{declined}R</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ ...detailCard(), marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", color: "#64748b", fontWeight: 800 }}>
              Jour selectionne
            </div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900, color: "#0f172a", textTransform: "capitalize" }}>
              {selectedDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={summaryPill("#dcfce7", "#166534")}>{acceptedCount} accepte(s)</span>
            <span style={summaryPill("#fee2e2", "#991b1b")}>{declinedCount} refuse(s)</span>
            <span style={summaryPill("#eff6ff", "#1d4ed8")}>{selectedEvents.length} activite(s)</span>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {selectedEvents.length === 0 ? (
            <div style={{ color: "#64748b", fontSize: 14 }}>
              Aucune participation pour cette date.
            </div>
          ) : (
            selectedEvents.map((ev) => (
              <div key={`${ev.id}-${ev.status}-${ev.title}`} style={selectedEventRow()}>
                <div>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>{ev.title}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                    {ev.rangeLabel}
                    {ev.location ? ` • ${ev.location}` : ""}
                  </div>
                </div>
                <span style={pill(ev.status)}>{ev.status}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {list.length === 0 ? (
          <div style={card()}>Aucun statut pour le moment.</div>
        ) : (
          list.map((p) => (
            <div key={p._id || p.id} style={card()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
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
  return {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: `1px solid ${s.bd}`,
    background: s.bg,
    fontWeight: 900,
    color: s.tx,
  };
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

function todayBtn() {
  return {
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "7px 12px",
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

function dayCell({ muted, today, selected, hasEvents }) {
  return {
    minHeight: 92,
    padding: 8,
    borderRadius: 12,
    border: selected ? "1px solid #2563eb" : "1px solid #e2e8f0",
    background: muted ? "#f8fafc" : hasEvents ? "#fcfdff" : "#ffffff",
    outline: today ? "2px solid #93c5fd" : "none",
    animation: "calIn 0.45s ease",
    display: "grid",
    gap: 4,
    textAlign: "left",
    cursor: "pointer",
    boxShadow: selected ? "0 10px 24px rgba(37, 99, 235, 0.14)" : "none",
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
    cells.push({
      date: new Date(year, month, dayIndex),
      inMonth: dayIndex >= 1 && dayIndex <= totalDays,
    });
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
        location: activity.location || "",
        rangeLabel: formatRange(activity),
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

function detailCard() {
  return {
    background: "linear-gradient(135deg, #ffffff, #f8fbff)",
    border: "1px solid #dbeafe",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
  };
}

function selectedEventRow() {
  return {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid #e5eefc",
    background: "#fff",
  };
}

function summaryPill(bg, color) {
  return {
    background: bg,
    color,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 800,
  };
}

function dayCountBadge(count) {
  return {
    minWidth: 20,
    height: 20,
    padding: "0 6px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#1d4ed8",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 900,
  };
}

function miniStat(color) {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    height: 18,
    borderRadius: 999,
    background: `${color}18`,
    color,
    fontSize: 10,
    fontWeight: 900,
    padding: "0 6px",
  };
}
