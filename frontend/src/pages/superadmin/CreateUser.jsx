// src/pages/superadmin/CreateUser.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../api/http";

// ─── Role config ────────────────────────────────────────────────────────────

const ROLES = [
  {
    value:   "EMPLOYEE",
    label:   "Employé",
    prefix:  "EMP",
    icon:    "👤",
    color:   "#374151",
    bg:      "#f3f4f6",
    border:  "#d1d5db",
    activeBg:"#f0fdf4",
    activeBorder: "#16a34a",
    activeColor:  "#15803d",
    dot:     "#16a34a",
  },
  {
    value:   "HR",
    label:   "Responsable RH",
    prefix:  "RH",
    icon:    "🧑‍💼",
    color:   "#1e40af",
    bg:      "#eff6ff",
    border:  "#bfdbfe",
    activeBg:"#eff6ff",
    activeBorder: "#3b82f6",
    activeColor:  "#1d4ed8",
    dot:     "#3b82f6",
  },
  {
    value:   "MANAGER",
    label:   "Manager",
    prefix:  "MGR",
    icon:    "🏆",
    color:   "#5b21b6",
    bg:      "#f5f3ff",
    border:  "#ddd6fe",
    activeBg:"#f5f3ff",
    activeBorder: "#7c3aed",
    activeColor:  "#6d28d9",
    dot:     "#7c3aed",
  },
];

const roleMap = Object.fromEntries(ROLES.map(r => [r.value, r]));

// ─── Validators ─────────────────────────────────────────────────────────────

function validateName(v) {
  if (!v) return "Le nom est requis";
  if (!/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]+$/.test(v))
    return "Lettres, espaces, tirets et apostrophes uniquement";
  return "";
}

function validateEmail(v) {
  if (!v) return "L'email est requis";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Format d'email invalide";
  return "";
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CreateUser() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:         "",
    email:        "",
    role:         "EMPLOYEE",
    date_embauche: "",
  });

  const [matricule,   setMatricule]   = useState("");
  const [matLoading,  setMatLoading]  = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "" });
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState(false);
  const [loading,     setLoading]     = useState(false);

  // Fetch next matricule whenever role changes
  useEffect(() => {
    let cancelled = false;
    setMatLoading(true);
    setMatricule("");
    http.get(`/admin/next-matricule/${form.role}`)
      .then(r => { if (!cancelled) setMatricule(r.data.matricule); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMatLoading(false); });
    return () => { cancelled = true; };
  }, [form.role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (name === "name")  setFieldErrors(p => ({ ...p, name:  validateName(value) }));
    if (name === "email") setFieldErrors(p => ({ ...p, email: validateEmail(value) }));
  };

  const selectRole = (role) => {
    setForm(p => ({ ...p, role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const nameErr  = validateName(form.name);
    const emailErr = validateEmail(form.email);
    setFieldErrors({ name: nameErr, email: emailErr });
    if (nameErr || emailErr || !matricule) return;

    setLoading(true);
    try {
      await http.post("/admin/create-user", {
        ...form,
        matricule,
        date_embauche: form.date_embauche || undefined,
      });
      setSuccess(true);
      setTimeout(() => navigate("/admin/users"), 2800);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roleMap[form.role];
  const isValid = !fieldErrors.name && !fieldErrors.email && form.name && form.email && matricule;

  if (success) {
    return (
      <div style={{
        minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}>
        <div style={{
          background: "var(--surface)", borderRadius: 24, padding: "40px 48px",
          textAlign: "center", maxWidth: 420,
          boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
          border: "1px solid var(--border)",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
            background: "linear-gradient(135deg,#d1fae5,#a7f3d0)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36,
          }}>✅</div>
          <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "var(--text-1)" }}>
            Compte créé avec succès !
          </h2>
          <p style={{ margin: "0 0 6px", color: "var(--text-2)", fontSize: 14 }}>
            Un email avec les identifiants a été envoyé à
          </p>
          <div style={{
            display: "inline-block", padding: "6px 16px", borderRadius: 999,
            background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: 14,
            marginBottom: 16,
          }}>{form.email}</div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            padding: "12px 20px", borderRadius: 12,
            background: selectedRole.activeBg, border: `1px solid ${selectedRole.activeBorder}`,
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 20 }}>{selectedRole.icon}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: selectedRole.activeColor }}>{selectedRole.label}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>Matricule : <strong>{matricule}</strong></div>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>Redirection automatique en cours…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", maxWidth: 760, margin: "0 auto" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg,#0b2b4b,#1e3a5f)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, color: "#fff", flexShrink: 0,
          }}>➕</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "var(--text-1)" }}>
              Créer un nouveau compte
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-2)", fontSize: 13.5 }}>
              Le mot de passe temporaire (24h) sera envoyé automatiquement par email.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          color: "#b42318", background: "#fff5f5", border: "1px solid #fecdca",
          padding: "12px 16px", borderRadius: 12, marginBottom: 20,
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontSize: 13.5 }}>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ── Section 1: Role selector ── */}
        <Section title="1. Rôle" icon="🎭">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {ROLES.map(r => {
              const active = form.role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => selectRole(r.value)}
                  style={{
                    padding: "16px 12px",
                    borderRadius: 14,
                    border: `2px solid ${active ? r.activeBorder : r.border}`,
                    background: active ? r.activeBg : "#fff",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s",
                    boxShadow: active ? `0 0 0 3px ${r.dot}22` : "none",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icon}</div>
                  <div style={{
                    fontWeight: 800, fontSize: 13.5,
                    color: active ? r.activeColor : "#1a2340",
                    marginBottom: 4,
                  }}>{r.label}</div>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 10px", borderRadius: 999,
                    background: active ? r.dot : r.border,
                    color: active ? "#fff" : r.color,
                    fontSize: 11, fontWeight: 700,
                    transition: "all 0.15s",
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: active ? "#fff" : r.dot,
                      display: "inline-block",
                    }} />
                    {r.prefix}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Section 2: Matricule preview ── */}
        <Section title="2. Matricule (généré automatiquement)" icon="🪪">
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: "16px 20px", borderRadius: 14,
            background: matLoading ? "#f8fafc" : selectedRole.activeBg,
            border: `2px dashed ${matLoading ? "#e2e8f0" : selectedRole.activeBorder}`,
            transition: "all 0.2s",
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: matLoading ? "#e2e8f0" : selectedRole.dot,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: matLoading ? 20 : 22, color: "#fff",
              transition: "all 0.2s",
            }}>
              {matLoading ? "⏳" : selectedRole.icon}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600, marginBottom: 4 }}>
                Matricule assigné
              </div>
              {matLoading ? (
                <div style={{ fontWeight: 700, fontSize: 22, color: "#cbd5e1" }}>
                  Génération…
                </div>
              ) : (
                <div style={{
                  fontWeight: 900, fontSize: 26, letterSpacing: "1px",
                  color: selectedRole.activeColor, fontFamily: "monospace",
                }}>
                  {matricule}
                </div>
              )}
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{
                fontSize: 11, color: "var(--text-3)",
                background: "var(--bg)", borderRadius: 8, padding: "4px 10px",
              }}>
                Prochain disponible
              </div>
            </div>
          </div>
        </Section>

        {/* ── Section 3: Informations personnelles ── */}
        <Section title="3. Informations personnelles" icon="📋">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Nom complet" required error={fieldErrors.name}>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Ex : Marie Dupont"
                  style={inp(!!fieldErrors.name)}
                />
              </FormField>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Email professionnel" required error={fieldErrors.email}>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="marie.dupont@entreprise.com"
                  style={inp(!!fieldErrors.email)}
                />
              </FormField>
            </div>
            <FormField label="Date d'embauche" hint="Optionnel">
              <input
                name="date_embauche"
                type="date"
                value={form.date_embauche}
                onChange={handleChange}
                style={inp(false)}
              />
            </FormField>
          </div>
        </Section>

        {/* ── Email notice ── */}
        <div style={{
          display: "flex", gap: 12, alignItems: "flex-start",
          padding: "14px 16px", borderRadius: 12,
          background: "#f0f9ff", border: "1px solid #bae6fd",
          marginBottom: 24,
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>📧</span>
          <div style={{ fontSize: 13, color: "#0369a1", lineHeight: 1.6 }}>
            <strong>Mot de passe automatique</strong><br />
            Un mot de passe sécurisé de 12 caractères sera généré et envoyé à l'adresse
            renseignée. Il sera valable <strong>24 heures</strong>, après quoi l'utilisateur
            devra en définir un nouveau.
          </div>
        </div>

        {/* ── Submit ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="submit"
            disabled={loading || !isValid}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "13px 28px", borderRadius: 12, border: "none",
              background: !isValid || loading
                ? "#e2e8f0"
                : `linear-gradient(135deg,${selectedRole.dot},${selectedRole.activeColor})`,
              color: !isValid || loading ? "#94a3b8" : "#fff",
              fontWeight: 800, fontSize: 15,
              cursor: !isValid || loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow: isValid && !loading
                ? `0 4px 16px ${selectedRole.dot}44`
                : "none",
            }}
          >
            {loading ? (
              <>⏳ Création en cours…</>
            ) : (
              <>{selectedRole.icon} Créer le compte {selectedRole.label}</>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            style={{
              padding: "13px 20px", borderRadius: 12,
              border: "1px solid var(--border)", background: "var(--surface)",
              color: "var(--text-2)", fontWeight: 600, fontSize: 14,
              cursor: "pointer",
            }}
          >Annuler</button>
        </div>
      </form>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div style={{
      background: "var(--surface)", borderRadius: 16,
      border: "1px solid var(--border)",
      padding: "20px 22px", marginBottom: 20,
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 16, paddingBottom: 12,
        borderBottom: "1px solid var(--border-2)",
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text-1)" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, required, error, hint, children }) {
  return (
    <div>
      <label style={{
        display: "block", marginBottom: 6,
        fontWeight: 600, fontSize: 13.5, color: "#374151",
      }}>
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          marginTop: 5, fontSize: 12.5, color: "#dc2626",
        }}>
          <span>⚠</span> {error}
        </div>
      )}
      {!error && hint && (
        <div style={{ marginTop: 5, fontSize: 12, color: "var(--text-3)" }}>{hint}</div>
      )}
    </div>
  );
}

function inp(hasError) {
  return {
    width: "100%", padding: "10px 14px", borderRadius: 10, boxSizing: "border-box",
    border: `1.5px solid ${hasError ? "#ef4444" : "var(--input-border)"}`,
    background: hasError ? "var(--danger-bg)" : "var(--input-bg)",
    fontSize: 14, color: "var(--input-text)", outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  };
}
