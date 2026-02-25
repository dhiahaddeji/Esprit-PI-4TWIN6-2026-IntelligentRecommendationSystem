const KEY = "assurreco_db_v1";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
}

function seed() {
  const existing = localStorage.getItem(KEY);
  if (existing) return JSON.parse(existing);

  // minimal fake employees & managers
  const users = [
    { id: "u_hr_1", name: "Sarah HR", role: "HR", email: "hr@test.com" },
    { id: "u_mgr_1", name: "Safaa Manager", role: "MANAGER", email: "manager@test.com" },
    { id: "u_emp_1", name: "Dhia Haddeji", role: "EMPLOYEE", email: "employee@test.com", dept: "IT" },
    { id: "u_emp_2", name: "Leila Amrani", role: "EMPLOYEE", email: "leila@test.com", dept: "RH" },
    { id: "u_emp_3", name: "Youssef Bennani", role: "EMPLOYEE", email: "youssef@test.com", dept: "Actuariat" },
    { id: "u_emp_4", name: "Karim Tazi", role: "EMPLOYEE", email: "karim.t@test.com", dept: "Commercial" },
  ];

  const db = {
    users,
    activities: [],        // created by HR
    recommendations: [],   // per activity: list suggested by AI + HR edits
    invitations: [],       // employee notifications
    participations: [],    // employee responses
  };

  localStorage.setItem(KEY, JSON.stringify(db));
  return db;
}

export function loadDB() {
  return seed();
}

export function saveDB(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export function dbUid(prefix) {
  return uid(prefix);
}
