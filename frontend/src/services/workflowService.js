import { loadDB, saveDB, dbUid } from "../mock/db";

export const ACTIVITY_STATUS = {
  DRAFT: "DRAFT",
  AI_SUGGESTED: "AI_SUGGESTED",
  HR_VALIDATED: "HR_VALIDATED",
  SENT_TO_MANAGER: "SENT_TO_MANAGER",
  MANAGER_CONFIRMED: "MANAGER_CONFIRMED",
  NOTIFIED: "NOTIFIED",
};

export function getManagers() {
  const db = loadDB();
  return db.users.filter((u) => u.role === "MANAGER");
}

export function getEmployees() {
  const db = loadDB();
  return db.users.filter((u) => u.role === "EMPLOYEE");
}

export function getActivityById(id) {
  const db = loadDB();
  return db.activities.find((a) => a.id === id);
}

export function listActivitiesForRole(role, userId) {
  const db = loadDB();

  if (role === "HR") return db.activities;
  if (role === "MANAGER") return db.activities.filter((a) => a.managerId === userId);

  // EMPLOYEE: show activities where employee is invited or participating
  const invited = new Set(
    db.invitations.filter((i) => i.employeeId === userId).map((i) => i.activityId)
  );
  const participating = new Set(
    db.participations.filter((p) => p.employeeId === userId).map((p) => p.activityId)
  );
  const ids = new Set([...invited, ...participating]);
  return db.activities.filter((a) => ids.has(a.id));
}

/* ---------------- HR FLOW ---------------- */

export function hrCreateActivity({ title, description, date, location, seats, managerId, createdBy }) {
  const db = loadDB();

  const activity = {
    id: dbUid("act"),
    title,
    description,
    date,
    location,
    seats: Number(seats || 0),
    managerId,
    createdBy,
    status: ACTIVITY_STATUS.DRAFT,
    createdAt: new Date().toISOString(),
  };

  db.activities.unshift(activity);
  saveDB(db);
  return activity;
}

export function hrRunAI(activityId) {
  const db = loadDB();
  const activity = db.activities.find((a) => a.id === activityId);
  if (!activity) throw new Error("Activity not found");

  // Fake AI: pick top N employees (based on dept match heuristic)
  const employees = db.users.filter((u) => u.role === "EMPLOYEE");
  const shuffled = [...employees].sort(() => Math.random() - 0.5);
  const suggested = shuffled.slice(0, Math.max(1, Math.min(activity.seats || 3, 5))).map((e, idx) => ({
    employeeId: e.id,
    score: Math.round(80 + Math.random() * 20),
    rank: idx + 1,
  }));

  // store recommendations
  const existing = db.recommendations.find((r) => r.activityId === activityId);
  const rec = {
    id: existing?.id || dbUid("rec"),
    activityId,
    list: suggested,
    hrValidated: false,
    updatedAt: new Date().toISOString(),
  };

  db.recommendations = db.recommendations.filter((r) => r.activityId !== activityId);
  db.recommendations.push(rec);

  activity.status = ACTIVITY_STATUS.AI_SUGGESTED;
  saveDB(db);
  return rec;
}

export function hrUpdateRecommendationList(activityId, list) {
  const db = loadDB();
  const rec = db.recommendations.find((r) => r.activityId === activityId);
  if (!rec) throw new Error("Run AI first (no recommendations found)");

  rec.list = list;
  rec.updatedAt = new Date().toISOString();
  saveDB(db);
  return rec;
}

export function hrValidateAndForward(activityId) {
  const db = loadDB();
  const activity = db.activities.find((a) => a.id === activityId);
  const rec = db.recommendations.find((r) => r.activityId === activityId);

  if (!activity) throw new Error("Activity not found");
  if (!rec || !rec.list?.length) throw new Error("No recommendation list to validate");

  rec.hrValidated = true;
  activity.status = ACTIVITY_STATUS.SENT_TO_MANAGER;

  saveDB(db);
  return { activity, rec };
}

/* ---------------- MANAGER FLOW ---------------- */

export function managerConfirmParticipants(activityId, participantIds) {
  const db = loadDB();
  const activity = db.activities.find((a) => a.id === activityId);
  if (!activity) throw new Error("Activity not found");

  activity.participants = participantIds; // final list
  activity.status = ACTIVITY_STATUS.MANAGER_CONFIRMED;

  saveDB(db);
  return activity;
}

export function managerNotifyEmployees(activityId) {
  const db = loadDB();
  const activity = db.activities.find((a) => a.id === activityId);
  if (!activity) throw new Error("Activity not found");
  if (!activity.participants?.length) throw new Error("No participants to notify");

  // create invitations
  activity.participants.forEach((employeeId) => {
    const inv = {
      id: dbUid("inv"),
      activityId,
      employeeId,
      status: "PENDING", // PENDING | ACCEPTED | DECLINED
      justification: "",
      createdAt: new Date().toISOString(),
    };
    db.invitations.unshift(inv);
  });

  activity.status = ACTIVITY_STATUS.NOTIFIED;
  saveDB(db);
  return activity;
}

/* ---------------- EMPLOYEE FLOW ---------------- */

export function employeeListInvitations(employeeId) {
  const db = loadDB();
  return db.invitations.filter((i) => i.employeeId === employeeId);
}

export function employeeGetInvitation(invitationId) {
  const db = loadDB();
  return db.invitations.find((i) => i.id === invitationId);
}

export function employeeRespond(invitationId, { decision, justification }) {
  const db = loadDB();
  const inv = db.invitations.find((i) => i.id === invitationId);
  if (!inv) throw new Error("Invitation not found");

  inv.status = decision; // ACCEPTED | DECLINED
  inv.justification = decision === "DECLINED" ? (justification || "") : "";
  inv.respondedAt = new Date().toISOString();

  // participation record
  db.participations = db.participations.filter(
    (p) => !(p.activityId === inv.activityId && p.employeeId === inv.employeeId)
  );
  db.participations.unshift({
    id: dbUid("part"),
    activityId: inv.activityId,
    employeeId: inv.employeeId,
    status: inv.status,
    justification: inv.justification,
    updatedAt: new Date().toISOString(),
  });

  saveDB(db);
  return inv;
}

export function employeeParticipationStatus(employeeId) {
  const db = loadDB();
  return db.participations.filter((p) => p.employeeId === employeeId);
}

/* Helpers */
export function getUserById(id) {
  const db = loadDB();
  return db.users.find((u) => u.id === id);
}

export function getRecommendation(activityId) {
  const db = loadDB();
  return db.recommendations.find((r) => r.activityId === activityId);
}
