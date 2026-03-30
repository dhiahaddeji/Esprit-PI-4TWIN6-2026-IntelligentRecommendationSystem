// src/pages/CompleteProfile.jsx
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/auth.css";

export default function CompleteProfile() {
  const { user, completeProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    telephone: "",
  });
  const [photo, setPhoto] = useState(null);
  const [cv, setCv] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const photoRef = useRef();
  const cvRef = useRef();

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("La photo doit être une image (JPG, PNG…)."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("La photo ne doit pas dépasser 2 Mo."); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleCv = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Le CV doit être un fichier PDF."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Le CV ne doit pas dépasser 5 Mo."); return; }
    setCv(file);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Le prénom et le nom sont obligatoires.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("firstName", form.firstName.trim());
      fd.append("lastName", form.lastName.trim());
      if (form.telephone) fd.append("telephone", form.telephone.trim());
      if (photo) fd.append("photo", photo);
      if (cv)    fd.append("cv", cv);

      await completeProfile(fd);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage">
      <div className="authCard" style={{ maxWidth: 520 }}>
        <div className="authBrand">
          <div className="authLogo">👤</div>
          <div>
            <div className="authName">AssurReco</div>
            <div className="authSub">Compléter votre profil</div>
          </div>
        </div>

        <h1 className="authTitle">Votre profil</h1>
        <p className="authHint">
          Bienvenue ! Complétez ces informations pour accéder à la plateforme.
        </p>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="authForm">

          {/* Photo de profil */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div
              onClick={() => photoRef.current.click()}
              style={{
                width: 90, height: 90, borderRadius: "50%",
                background: "var(--bg)",
                border: "2px dashed #cbd5e1",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden", flexShrink: 0,
              }}
            >
              {photoPreview
                ? <img src={photoPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 32 }}>📷</span>
              }
            </div>
            <button type="button" onClick={() => photoRef.current.click()} style={{ fontSize: 12, color: "#0b2b4b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              {photo ? photo.name : "Choisir une photo de profil"}
            </button>
            <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
          </div>

          {/* Prénom */}
          <label className="authLabel">
            Prénom <span style={{ color: "#dc2626" }}>*</span>
            <input
              className="authInput"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="Ex: Sarah"
              required
            />
          </label>

          {/* Nom */}
          <label className="authLabel">
            Nom <span style={{ color: "#dc2626" }}>*</span>
            <input
              className="authInput"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="Ex: Benali"
              required
            />
          </label>

          {/* Téléphone */}
          <label className="authLabel">
            Téléphone (optionnel)
            <input
              className="authInput"
              name="telephone"
              value={form.telephone}
              onChange={handleChange}
              placeholder="Ex: 06 12 34 56 78"
              type="tel"
            />
          </label>

          {/* CV */}
          <div>
            <label style={{ display: "block", fontWeight: 500, marginBottom: 6, fontSize: 14, color: "var(--text)" }}>
              CV (PDF, optionnel)
            </label>
            <div
              onClick={() => cvRef.current.click()}
              style={{
                border: "2px dashed #cbd5e1",
                borderRadius: 10,
                padding: "16px",
                cursor: "pointer",
                textAlign: "center",
                background: cv ? "#f0fdf4" : "#f8fafc",
                color: cv ? "#16a34a" : "#94a3b8",
                fontSize: 13,
              }}
            >
              {cv ? `✓ ${cv.name}` : "Cliquer pour uploader votre CV (PDF, max 5 Mo)"}
            </div>
            <input ref={cvRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={handleCv} />
          </div>

          <button className="primaryBtn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Enregistrement…" : "Accéder à la plateforme"}
          </button>
        </form>
      </div>
    </div>
  );
}
