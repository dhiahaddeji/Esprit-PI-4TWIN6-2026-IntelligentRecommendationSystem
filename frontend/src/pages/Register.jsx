import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function redirectByRole(r) {
    if (r === "HR") return nav("/hr/employees", { replace: true });
    if (r === "MANAGER") return nav("/manager/inbox", { replace: true });
    return nav("/dashboard", { replace: true });
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await register({ name, email, password, role });
      redirectByRole(res.user.role);
    } catch (err) {
      setError(err.message || "Register failed");
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 6 }}>Create account</h1>
      <p style={{ marginTop: 0, color: "var(--text-2)" }}>Sign up and choose your role</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
          style={{ padding: 12, borderRadius: 10, border: "1px solid #e4e7ec" }}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          required
          style={{ padding: 12, borderRadius: 10, border: "1px solid #e4e7ec" }}
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ padding: 12, borderRadius: 10, border: "1px solid #e4e7ec" }}
        >
          <option value="EMPLOYEE">EMPLOYEE</option>
          <option value="HR">HR</option>
          <option value="MANAGER">MANAGER</option>
        </select>

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          required
          style={{ padding: 12, borderRadius: 10, border: "1px solid #e4e7ec" }}
        />

        {error && (
          <div style={{ color: "#b42318", background: "#fffbfa", border: "1px solid #fecdca", padding: 10, borderRadius: 10 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          style={{
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: "#0b2b4b",
            color: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Sign up
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
