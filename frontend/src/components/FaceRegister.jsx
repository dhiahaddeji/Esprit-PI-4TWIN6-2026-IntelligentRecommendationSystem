import { useRef, useState } from "react";
import http from "../api/http";

/**
 * FaceRegister — drop-in button for the Profile page.
 * Opens a webcam modal, captures a frame, and sends it to POST /face/register.
 * Props:
 *   onSuccess(msg)  — called with a success message string
 *   onError(msg)    — called with an error message string
 */
export default function FaceRegister({ onSuccess, onError }) {
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [status, setStatus] = useState(""); // "idle" | "captured" | "saving"
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
      onError?.("Cannot access webcam. Please allow camera permissions.");
      setOpen(false);
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
    setOpen(true);
    // Give the DOM a tick to mount the video element
    setTimeout(startCam, 100);
  };

  const closeModal = () => {
    stopCam();
    setOpen(false);
    setPreview(null);
    setStatus("idle");
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
    setStatus("idle");
    // Re-attach stream in case it was paused
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play();
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────

  const save = async () => {
    if (!preview) return;
    setCapturing(true);
    setStatus("saving");
    try {
      await http.post("/face/register", { image: preview });
      stopCam();
      setOpen(false);
      onSuccess?.("Face registered successfully!");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Face registration failed. Make sure your face is clearly visible.";
      onError?.(msg);
      setStatus("captured");
    } finally {
      setCapturing(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <button type="button" onClick={openModal} style={styles.btn}>
        📷 Enregistrer mon visage
      </button>

      {open && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.title}>Enregistrement facial</h3>
            <p style={styles.hint}>
              Placez votre visage dans le cadre puis cliquez sur{" "}
              <strong>Capturer</strong>.
            </p>

            {/* Video or captured preview */}
            <div style={styles.frame}>
              {status !== "captured" && (
                <video
                  ref={videoRef}
                  style={styles.video}
                  muted
                  playsInline
                />
              )}
              {status === "captured" && preview && (
                <img src={preview} alt="capture" style={styles.video} />
              )}
            </div>

            {/* Hidden canvas used only for capturing */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Actions */}
            <div style={styles.actions}>
              {status !== "captured" && (
                <button type="button" onClick={capture} style={styles.primaryBtn}>
                  📸 Capturer
                </button>
              )}
              {status === "captured" && (
                <>
                  <button
                    type="button"
                    onClick={save}
                    disabled={capturing}
                    style={styles.primaryBtn}
                  >
                    {capturing ? "Enregistrement…" : "✅ Confirmer"}
                  </button>
                  <button
                    type="button"
                    onClick={retake}
                    disabled={capturing}
                    style={styles.secondaryBtn}
                  >
                    🔄 Reprendre
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={closeModal}
                disabled={capturing}
                style={styles.cancelBtn}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  btn: {
    padding: "0.55rem 1.2rem",
    borderRadius: 8,
    border: "1.5px solid #0ea5a0",
    background: "transparent",
    color: "#0ea5a0",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
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
    boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
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
    background: "#0ea5a0",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "0.6rem 1.5rem",
    borderRadius: 8,
    border: "1.5px solid #6366f1",
    background: "transparent",
    color: "#6366f1",
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
