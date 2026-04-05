export const ROLE = {
  ADMIN: "ADMIN",
  HR: "HR",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
};

export function canAccess(userRole, allowed = []) {
  if (!userRole) return false;

  // Manager has access to everything (your rule)
  if (userRole === ROLE.MANAGER) return true;

  return allowed.includes(userRole);
}

export function isManager(userRole) {
  return userRole === ROLE.MANAGER;
}

export function isHR(userRole) {
  return userRole === ROLE.HR;
}

export function isEmployee(userRole) {
  return userRole === ROLE.EMPLOYEE;
}
