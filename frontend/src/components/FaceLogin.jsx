import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LS_TOKEN, LS_USER } from "../auth/authService";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * FaceLogin — drop-in button for the Login page.
 * Opens a webcam modal, captures a frame, and sends it to POST /face/login.
 * On success: stores the JWT and redirects to /dashboard.
 */
export default function FaceLogin() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("idle"); // "idle" | "captured" | "loading" | "error" | "success"
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // ── Webcam helpers ──────────────────────────────────────────────────

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setStatus("error");
      setErrorMsg("Cannot access webcam. Please allow camera permissions.");
    }
  };

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  // ── Modal lifecycle ──────────────────────────────────────────────────

  const openModal = async () => {
    setPreview(null);
    setStatus("idle");
    setErrorMsg("");
    setOpen(true);
    setTimeout(startCam, 100);
  };

  const closeModal = () => {
    stopCam();
    setOpen(false);
    setPreview(null);
    setStatus("idle");
    setErrorMsg("");
  };

  // ── Capture ──────────────────────────────────────────────────────────

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setPreview(dataUrl);
    setStatus("captured");
  };

  const retake = () => {
    setPreview(null);
    setErrorMsg("");
    setStatus("idle");
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────

  const authenticate = async () => {
    if (!preview) return;
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/face/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Face not recognized");
      }

      const data = await res.json();
      localStorage.setItem(LS_TOKEN, data.accessToken);
      localStorage.setItem(LS_USER, JSON.stringify(data.user));

      setStatus("success");
      stopCam();
      setTimeout(() => {
        setOpen(false);
        navigate("/dashboard", { replace: true });
      }, 800);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Authentication failed. Please try again.");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <button type="button" onClick={openModal} style={styles.faceBtn}>
        <span style={{ fontSize: "1.1rem" }}>👁️</span> Connexion par visage
      </button>

      {open && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.title}>Authentification faciale</h3>

            {status !== "success" && (
              <p style={styles.hint}>
                {status === "idle"
                  ? "Positionnez votre visage dans le cadre puis cliquez sur Capturer."
                  : status === "captured"
                  ? "Vérifiez la capture puis cliquez sur Confirmer."
                  : status === "loading"
                  ? "Reconnaissance en cours…"
                  : "Erreur — réessayez ou reprenez."}
              </p>
            )}

            {status === "success" && (
              <p style={{ ...styles.hint, color: "#10b981", fontWeight: 700 }}>
                ✅ Visage reconnu ! Redirection…
              </p>
            )}

            {/* Video / preview frame */}
            {status !== "success" && (
              <div style={styles.frame}>
                {status !== "captured" && status !== "error" && (
                  <video
                    ref={videoRef}
                    style={styles.video}
                    muted
                    playsInline
                  />
                )}
                {(status === "captured" || status === "loading") && preview && (
                  <img src={preview} alt="capture" style={styles.video} />
                )}
                {status === "error" && !preview && (
                  <div style={styles.errorFrame}>⚠️</div>
                )}
              </div>
            )}

            {/* Error message */}
            {errorMsg && (
              <p style={styles.errorMsg}>{errorMsg}</p>
            )}

            {/* Hidden canvas */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Actions */}
            {status !== "success" && (
              <div style={styles.actions}>
                {status === "idle" && (
                  <button type="button" onClick={capture} style={styles.primaryBtn}>
                    📸 Capturer
                  </button>
                )}
                {(status === "captured" || status === "error") && (
                  <>
                    {status === "captured" && (
                      <button
                        type="button"
                        onClick={authenticate}
                        style={styles.primaryBtn}
                      >
                        ✅ Confirmer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={retake}
                      style={styles.secondaryBtn}
                    >
                      🔄 Reprendre
                    </button>
                  </>
                )}
                {status === "loading" && (
                  <button disabled style={{ ...styles.primaryBtn, opacity: 0.6 }}>
                    Vérification…
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={status === "loading"}
                  style={styles.cancelBtn}
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  faceBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "0.65rem 1rem",
    borderRadius: 8,
    border: "1.5px solid #6366f1",
    background: "transparent",
    color: "#6366f1",
    fontSize: "0.92rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.70)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    background: "var(--surface, #fff)",
    borderRadius: 16,
    padding: "2rem",
    width: "min(95vw, 520px)",
    boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
  },
  title: {
    margin: 0,
    fontSize: "1.15rem",
    fontWeight: 700,
    color: "var(--text, #111)",
  },
  hint: {
    margin: 0,
    fontSize: "0.85rem",
    color: "var(--muted, #666)",
    textAlign: "center",
  },
  frame: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
    background: "#000",
    aspectRatio: "4/3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  errorFrame: {
    fontSize: "3rem",
    color: "#dc2626",
  },
  errorMsg: {
    margin: 0,
    fontSize: "0.82rem",
    color: "#dc2626",
    textAlign: "center",
    fontWeight: 500,
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
  },
  primaryBtn: {
    padding: "0.6rem 1.5rem",
    borderRadius: 8,
    border: "none",
    background: "#6366f1",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "0.6rem 1.5rem",
    borderRadius: 8,
    border: "1.5px solid #0ea5a0",
    background: "transparent",
    color: "#0ea5a0",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "0.6rem 1.2rem",
    borderRadius: 8,
    border: "1.5px solid #dc2626",
    background: "transparent",
    color: "#dc2626",
    fontWeight: 600,
    fontSize: "0.88rem",
    cursor: "pointer",
  },
};
