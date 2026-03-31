import { useEffect, useRef, useState } from "react";
import http from "../api/http";
import { getStoredUser, LS_USER } from "../auth/authService";

const ROLE_LABELS = {
  SUPERADMIN: "Super Admin",
  HR: "Responsable RH",
  MANAGER: "Manager",
  EMPLOYEE: "Employé",
};

const ROLE_COLORS = {
  SUPERADMIN: "#0b2b4b",
  HR: "#0ea5a0",
  MANAGER: "#6366f1",
  EMPLOYEE: "#10b981",
};

function getInitials(user) {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return (user.name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export default function MyProfile() {
  const storedUser = getStoredUser();
  const userId = storedUser?.id || storedUser?.userId;

  const [profile, setProfile] = useState(storedUser || {});
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    telephone: "",
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [cvName, setCvName] = useState("");
  const [cvAnalyzing, setCvAnalyzing] = useState(false);
  const [cvExtracted, setCvExtracted] = useState(null); // { skills, summary, total }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const photoInputRef = useRef(null);
  const cvInputRef = useRef(null);

  // Load full profile from API
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await http.get(`/users/${userId}`);
        const data = res.data;
        setProfile(data);
        setForm({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          telephone: data.telephone || "",
        });
        if (data.photoUrl) setPhotoPreview(data.photoUrl);
      } catch {
        // fall back to stored user
        setForm({
          firstName: storedUser?.firstName || "",
          lastName: storedUser?.lastName || "",
          telephone: storedUser?.telephone || "",
        });
        if (storedUser?.photoUrl) setPhotoPreview(storedUser.photoUrl);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCvChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCvFile(file);
    setCvName(file.name);
    setCvExtracted(null);
  };

  const handleAnalyzeCv = async () => {
    if (!cvFile) return;
    setCvAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append("cv", cvFile);
      const res = await http.post("/ai/analyze-cv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const result = res.data;
      setCvExtracted(result);
      if (result.skills?.length > 0) {
        localStorage.setItem("cvExtractedSkills", JSON.stringify(result));
        const label = result.mode === "openai" ? "par OpenAI GPT-4o" : "par analyse locale";
        showToast(`✨ ${result.total} compétence(s) détectée(s) ${label} !`);
      } else {
        showToast("Aucune compétence détectée dans ce CV.", "error");
      }
    } catch {
      showToast("Erreur lors de l'analyse du CV.", "error");
    } finally {
      setCvAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      if (form.firstName) fd.append("firstName", form.firstName);
      if (form.lastName) fd.append("lastName", form.lastName);
      if (form.telephone) fd.append("telephone", form.telephone);
      if (photoFile) fd.append("photo", photoFile);
      if (cvFile) fd.append("cv", cvFile);

      const res = await http.patch("/users/profile", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = res.data;
      setProfile(updated);

      // Update localStorage
      const current = getStoredUser() || {};
      const merged = { ...current, ...updated };
      localStorage.setItem(LS_USER, JSON.stringify(merged));

      showToast("Profil mis à jour avec succès !");
    } catch (err) {
      showToast(
        err?.response?.data?.message || "Erreur lors de la mise à jour",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingText}>Chargement...</div>
      </div>
    );
  }

  const role = (profile.role || "").toUpperCase();
  const roleLabel = ROLE_LABELS[role] || role;
  const roleColor = ROLE_COLORS[role] || "#0b2b4b";
  const initials = getInitials(profile);
  const displayName =
    profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.name || "—";

  const canUploadCv = role === "EMPLOYEE" || role === "HR";

  return (
    <div style={styles.page}>
      {/* TOAST */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === "error" ? "#dc2626" : "#10b981",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* PROFILE HEADER */}
      <div style={styles.header}>
        <div style={styles.avatarWrap}>
          {photoPreview ? (
            <img src={photoPreview} alt="avatar" style={styles.avatarImg} />
          ) : (
            <div style={styles.avatarInitials}>{initials}</div>
          )}
        </div>
        <div style={styles.headerInfo}>
          <h1 style={styles.headerName}>{displayName}</h1>
          <span
            style={{
              ...styles.roleBadge,
              background: roleColor,
            }}
          >
            {roleLabel}
          </span>
          {profile.matricule && (
            <p style={styles.matriculeText}>#{profile.matricule}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.formGrid}>

        {/* SECTION: Informations personnelles */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Informations personnelles</h2>
          <div style={styles.fieldRow}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Prénom</label>
              <input
                style={styles.input}
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
                placeholder="Votre prénom"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Nom</label>
              <input
                style={styles.input}
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
                placeholder="Votre nom"
              />
            </div>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Téléphone</label>
            <input
              style={styles.input}
              value={form.telephone}
              onChange={(e) =>
                setForm((f) => ({ ...f, telephone: e.target.value }))
              }
              placeholder="+216 XX XXX XXX"
            />
          </div>
        </div>

        {/* SECTION: Photo de profil */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Photo de profil</h2>
          <div style={styles.uploadArea}>
            <div style={styles.photoPreviewWrap}>
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="preview"
                  style={styles.photoPreview}
                />
              ) : (
                <div style={styles.photoInitials}>{initials}</div>
              )}
            </div>
            <div>
              <button
                type="button"
                style={styles.uploadBtn}
                onClick={() => photoInputRef.current?.click()}
              >
                Choisir une photo
              </button>
              <p style={styles.uploadHint}>
                JPG, PNG ou GIF — max 5 Mo
              </p>
              {photoFile && (
                <p style={styles.uploadHint}>{photoFile.name}</p>
              )}
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />
          </div>
        </div>

        {/* SECTION: CV — EMPLOYEE and HR only */}
        {canUploadCv && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>CV &amp; Analyse IA</h2>
            <div style={styles.uploadArea}>
              <button
                type="button"
                style={styles.uploadBtn}
                onClick={() => cvInputRef.current?.click()}
              >
                Uploader un CV (PDF)
              </button>
              {cvName && <p style={styles.uploadHint}>Sélectionné : {cvName}</p>}
              {!cvName && profile.cvUrl && (
                <a
                  href={profile.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.cvLink}
                >
                  Voir le CV actuel
                </a>
              )}
              <input
                ref={cvInputRef}
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={handleCvChange}
              />
            </div>

            {/* AI analysis button — visible only when a new CV is selected */}
            {cvFile && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--surface-2)", borderRadius: 12, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "1.2rem" }}>🤖</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "var(--text-1)" }}>
                      Analyse IA des compétences
                    </p>
                    <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.78rem", color: "var(--text-2)" }}>
                      L'IA extrait automatiquement vos compétences depuis le CV
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyzeCv}
                    disabled={cvAnalyzing}
                    style={{
                      padding: "0.5rem 1.1rem", borderRadius: 8, border: "none",
                      background: cvAnalyzing ? "var(--border)" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
                      color: "#fff", fontWeight: 700, fontSize: "0.85rem",
                      cursor: cvAnalyzing ? "not-allowed" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cvAnalyzing ? "Analyse en cours…" : "✨ Analyser le CV"}
                  </button>
                </div>

                {/* Results */}
                {cvExtracted && cvExtracted.total > 0 && (
                  <div style={{ marginTop: "0.85rem" }}>
                    <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.82rem", color: "var(--text-2)", fontStyle: "italic" }}>
                      {cvExtracted.summary}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                      {cvExtracted.skills.map((s, i) => {
                        const typeColors = { savoir: "#3b6fd4", savoir_faire: "#0891b2", savoir_etre: "#7c3aed" };
                        return (
                          <span key={i} style={{
                            padding: "2px 10px", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600,
                            background: "var(--surface)", border: `1px solid ${typeColors[s.type] || "#ccc"}`,
                            color: typeColors[s.type] || "var(--text-1)",
                          }}>
                            {s.intitule}
                          </span>
                        );
                      })}
                    </div>
                    <p style={{ margin: "0.6rem 0 0 0", fontSize: "0.78rem", color: "#059669", fontWeight: 600 }}>
                      ✅ {cvExtracted.total} compétence(s) prêtes {cvExtracted.mode === "openai" ? "(OpenAI GPT-4o)" : "(analyse locale)"} — rendez-vous dans "Mes Compétences" pour les importer.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION: Informations professionnelles (readonly) */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Informations professionnelles</h2>
          <div style={styles.infoGrid}>
            <InfoCard label="Email" value={profile.email} />
            <InfoCard label="Matricule" value={profile.matricule} />
            <InfoCard
              label="Rôle"
              value={
                <span
                  style={{
                    ...styles.roleBadgeSmall,
                    background: roleColor,
                  }}
                >
                  {roleLabel}
                </span>
              }
            />
            {profile.departement_id && (
              <InfoCard label="Département" value={profile.departement_id} />
            )}
            {profile.date_embauche && (
              <InfoCard
                label="Date d'embauche"
                value={new Date(profile.date_embauche).toLocaleDateString("fr-FR")}
              />
            )}
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div style={styles.saveRow}>
          <button type="submit" style={styles.saveBtn} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div style={styles.infoCard}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value || "—"}</span>
    </div>
  );
}

const styles = {
  page: {
    padding: "2rem",
    maxWidth: 900,
    margin: "0 auto",
    position: "relative",
  },
  loadingText: {
    color: "var(--muted)",
    fontSize: "1rem",
    padding: "2rem",
  },
  toast: {
    position: "fixed",
    top: "1.2rem",
    right: "1.5rem",
    color: "#fff",
    padding: "0.75rem 1.5rem",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: "0.95rem",
    zIndex: 9999,
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "1.5rem 2rem",
    marginBottom: "1.5rem",
    boxShadow: "var(--shadow)",
  },
  avatarWrap: {
    flexShrink: 0,
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid var(--primary-2)",
  },
  avatarInitials: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "var(--primary)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.8rem",
    fontWeight: 700,
    letterSpacing: 1,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    margin: "0 0 0.4rem 0",
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text)",
  },
  roleBadge: {
    display: "inline-block",
    color: "#fff",
    borderRadius: 20,
    padding: "0.2rem 0.9rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  matriculeText: {
    margin: "0.4rem 0 0 0",
    fontSize: "0.85rem",
    color: "var(--muted)",
  },
  formGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  card: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "1.5rem 2rem",
    boxShadow: "var(--shadow)",
  },
  cardTitle: {
    margin: "0 0 1.2rem 0",
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--primary)",
    borderBottom: "2px solid var(--border)",
    paddingBottom: "0.6rem",
  },
  fieldRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "1rem",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    marginBottom: "0.75rem",
  },
  label: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    padding: "0.6rem 0.85rem",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.15s",
  },
  uploadArea: {
    display: "flex",
    alignItems: "center",
    gap: "1.2rem",
    flexWrap: "wrap",
  },
  photoPreviewWrap: {
    flexShrink: 0,
  },
  photoPreview: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid var(--border)",
  },
  photoInitials: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "var(--primary)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    fontWeight: 700,
  },
  uploadBtn: {
    padding: "0.55rem 1.2rem",
    borderRadius: 8,
    border: "1.5px solid var(--primary-2)",
    background: "transparent",
    color: "var(--primary-2)",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  },
  uploadHint: {
    margin: "0.35rem 0 0 0",
    fontSize: "0.8rem",
    color: "var(--muted)",
  },
  cvLink: {
    display: "inline-block",
    marginTop: "0.35rem",
    fontSize: "0.88rem",
    color: "var(--primary-2)",
    textDecoration: "underline",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "1rem",
  },
  infoCard: {
    background: "var(--surface-2)",
    borderRadius: 10,
    padding: "0.85rem 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    border: "1px solid var(--border)",
  },
  infoLabel: {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: "0.95rem",
    color: "var(--text)",
    fontWeight: 500,
    wordBreak: "break-all",
  },
  roleBadgeSmall: {
    display: "inline-block",
    color: "#fff",
    borderRadius: 20,
    padding: "0.15rem 0.7rem",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  saveRow: {
    display: "flex",
    justifyContent: "flex-end",
  },
  saveBtn: {
    padding: "0.7rem 2rem",
    borderRadius: 10,
    border: "none",
    background: "var(--primary)",
    color: "#fff",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
};
