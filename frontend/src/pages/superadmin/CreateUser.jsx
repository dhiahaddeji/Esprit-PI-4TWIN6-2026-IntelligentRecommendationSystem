// src/pages/superadmin/CreateUser.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import http from "../../api/http";
import MicButton from "../../components/MicButton";

// ─── Role config ────────────────────────────────────────────────────────────

const ROLES = [
  {
    value:   "EMPLOYEE",
    label:   "Employé",
    prefix:  "EMP",
    icon:    "👤",
    color:   "#456070",
    bg:      "#EEF7FA",
    border:  "#DDD7C8",
    activeBg:"#E8F5ED",
    activeBorder: "#145C2B",
    activeColor:  "#145C2B",
    dot:     "#145C2B",
  },
  {
    value:   "HR",
    label:   "Responsable RH",
    prefix:  "RH",
    icon:    "🧑‍💼",
    color:   "#155B6E",
    bg:      "#EEF7FA",
    border:  "#D6EEF3",
    activeBg:"#EEF7FA",
    activeBorder: "#1D7A91",
    activeColor:  "#155B6E",
    dot:     "#1D7A91",
  },
  {
    value:   "MANAGER",
    label:   "Manager",
    prefix:  "MGR",
    icon:    "🏆",
    color:   "#1D7A91",
    bg:      "#EEF7FA",
    border:  "#D6EEF3",
    activeBg:"#EEF7FA",
    activeBorder: "#1D7A91",
    activeColor:  "#155B6E",
    dot:     "#1D7A91",
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

  // ── CSV import state ────────────────────────────────────────────────
  const [csvFile,       setCsvFile]       = useState(null);
  const [csvUploading,  setCsvUploading]  = useState(false);
  const [csvResult,     setCsvResult]     = useState(null); // { success, failed, errors }
  const [csvError,      setCsvError]      = useState("");
  const csvInputRef = useRef(null);

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

  // ── CSV handlers ─────────────────────────────────────────────────────

  const handleCsvChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);
    setCsvResult(null);
    setCsvError("");
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setCsvUploading(true);
    setCsvResult(null);
    setCsvError("");
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const res = await http.post("/admin/upload-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCsvResult(res.data);
      setCsvFile(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
    } catch (err) {
      setCsvError(
        err?.response?.data?.message || err.message || "CSV upload failed"
      );
    } finally {
      setCsvUploading(false);
    }
  };

  const downloadCsvTemplate = () => {
    const header = "name,email,role,date_embauche";
    const example1 = "Jean Dupont,jean.dupont@entreprise.com,EMPLOYEE,2024-01-15";
    const example2 = "Marie Martin,marie.martin@entreprise.com,HR,2024-02-01";
    const example3 = "Paul Durand,paul.durand@entreprise.com,MANAGER,";
    const content = [header, example1, example2, example3].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_utilisateurs.csv";
    a.click();
    URL.revokeObjectURL(url);
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
            background: "linear-gradient(135deg,#E8F5ED,#a7f3d0)",
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
            background: "#EEF7FA", color: "#155B6E", fontWeight: 700, fontSize: 14,
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
            background: "linear-gradient(135deg,#0B2D38,#1e3a5f)",
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

      {/* ── CSV Import Section ── */}
      <Section title="Import CSV — Création en masse" icon="📂">
        {/* Top row: file picker + template download */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{
            flex: 1, minWidth: 220,
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", borderRadius: 10,
            border: `1.5px dashed ${csvFile ? "#16a34a" : "var(--input-border)"}`,
            background: csvFile ? "#f0fdf4" : "var(--input-bg)",
            cursor: "pointer", transition: "all 0.15s",
          }}
            onClick={() => csvInputRef.current?.click()}
          >
            <span style={{ fontSize: 20 }}>{csvFile ? "📄" : "📁"}</span>
            <span style={{ fontSize: 13.5, color: csvFile ? "#15803d" : "var(--text-3)", fontWeight: csvFile ? 600 : 400 }}>
              {csvFile ? csvFile.name : "Choisir un fichier .csv…"}
            </span>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleCsvChange}
            />
          </div>

          <button
            type="button"
            onClick={handleCsvUpload}
            disabled={!csvFile || csvUploading}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 10, border: "none",
              background: !csvFile || csvUploading ? "#e2e8f0" : "linear-gradient(135deg,#0b2b4b,#1e3a5f)",
              color: !csvFile || csvUploading ? "#94a3b8" : "#fff",
              fontWeight: 700, fontSize: 13.5, cursor: !csvFile || csvUploading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap", transition: "all 0.15s",
            }}
          >
            {csvUploading ? (
              <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> Import en cours…</>
            ) : (
              <>⬆️ Importer CSV</>
            )}
          </button>

          <button
            type="button"
            onClick={downloadCsvTemplate}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px", borderRadius: 10,
              border: "1.5px solid #bae6fd", background: "#f0f9ff",
              color: "#0369a1", fontWeight: 600, fontSize: 13,
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            ⬇️ Télécharger le modèle
          </button>
        </div>

        {/* Format hint */}
        

        {/* Upload error */}
        {csvError && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            color: "#b42318", background: "#fff5f5", border: "1px solid #fecdca",
            padding: "10px 14px", borderRadius: 10, fontSize: 13.5,
          }}>
            <span>⚠️</span> {csvError}
          </div>
        )}

        {/* Results */}
        {csvResult && (
          <div style={{ marginTop: 4 }}>
            {/* Summary badges */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px", borderRadius: 10,
                background: "#f0fdf4", border: "1px solid #bbf7d0",
              }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <div>
                  <div style={{ fontSize: 11, color: "#15803d", fontWeight: 600, textTransform: "uppercase" }}>Créés</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#16a34a", lineHeight: 1 }}>{csvResult.success}</div>
                </div>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px", borderRadius: 10,
                background: csvResult.failed > 0 ? "#fff5f5" : "#f8fafc",
                border: `1px solid ${csvResult.failed > 0 ? "#fecdca" : "#e2e8f0"}`,
              }}>
                <span style={{ fontSize: 18 }}>❌</span>
                <div>
                  <div style={{ fontSize: 11, color: csvResult.failed > 0 ? "#b42318" : "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Échoués</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: csvResult.failed > 0 ? "#dc2626" : "#94a3b8", lineHeight: 1 }}>{csvResult.failed}</div>
                </div>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px", borderRadius: 10,
                background: "#f8fafc", border: "1px solid #e2e8f0",
              }}>
                <span style={{ fontSize: 18 }}>📊</span>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#334155", lineHeight: 1 }}>{csvResult.success + csvResult.failed}</div>
                </div>
              </div>
            </div>

            {/* Error list */}
            {csvResult.errors?.length > 0 && (
              <div style={{
                border: "1px solid #fecdca", borderRadius: 10,
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "8px 14px", background: "#fff5f5",
                  fontSize: 12.5, fontWeight: 700, color: "#b42318",
                  borderBottom: "1px solid #fecdca",
                }}>
                  ⚠️ {csvResult.errors.length} ligne(s) avec erreur
                </div>
                <ul style={{ margin: 0, padding: "8px 14px 10px 28px", listStyle: "disc" }}>
                  {csvResult.errors.map((msg, i) => (
                    <li key={i} style={{
                      fontSize: 12.5, color: "#7f1d1d", padding: "2px 0",
                      fontFamily: "monospace",
                    }}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Section>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          color: "#8B1A1A", background: "#fff5f5", border: "1px solid #F28080",
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
                    color: active ? r.activeColor : "#0B2D38",
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
            background: matLoading ? "#EEF7FA" : selectedRole.activeBg,
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
                <div style={{ fontWeight: 700, fontSize: 22, color: "#9BBCC7" }}>
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
                <div style={{ position: "relative" }}>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Ex : Marie Dupont"
                    style={{ ...inp(!!fieldErrors.name), paddingRight: 42 }}
                  />
                  <MicButton
                    onResult={(text) => {
                      setForm(p => ({ ...p, name: text }));
                      setFieldErrors(p => ({ ...p, name: validateName(text) }));
                    }}
                  />
                </div>
              </FormField>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Email professionnel" required error={fieldErrors.email}>
                <div style={{ position: "relative" }}>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="marie.dupont@entreprise.com"
                    style={{ ...inp(!!fieldErrors.email), paddingRight: 42 }}
                  />
                  <MicButton
                    onResult={(text) => {
                      setForm(p => ({ ...p, email: text }));
                      setFieldErrors(p => ({ ...p, email: validateEmail(text) }));
                    }}
                  />
                </div>
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
          background: "#EEF7FA", border: "1px solid #A8D8E3",
          marginBottom: 24,
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>📧</span>
          <div style={{ fontSize: 13, color: "#1D7A91", lineHeight: 1.6 }}>
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
              color: !isValid || loading ? "#638899" : "#fff",
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
        fontWeight: 600, fontSize: 13.5, color: "#456070",
      }}>
        {label}{required && <span style={{ color: "#8B1A1A", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          marginTop: 5, fontSize: 12.5, color: "#8B1A1A",
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
    border: `1.5px solid ${hasError ? "#8B1A1A" : "var(--input-border)"}`,
    background: hasError ? "var(--danger-bg)" : "var(--input-bg)",
    fontSize: 14, color: "var(--input-text)", outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  };
}
