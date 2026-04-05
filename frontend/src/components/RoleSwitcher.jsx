import { useAuth } from "../auth/AuthContext";

const roles = ["ADMIN", "HR", "HR_MANAGER", "MANAGER", "EMPLOYEE"];

export default function RoleSwitcher() {
  const { user, setDevRole } = useAuth();

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--text-2)" }}>Role:</span>
      <select
        value={user?.role || "EMPLOYEE"}
        onChange={(e) => setDevRole(e.target.value)}
        style={{ padding: "6px 8px", borderRadius: 10, border: "1px solid #e7e9ef" }}
      >
        {roles.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}
