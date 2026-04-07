import { useEffect, useRef, useState } from "react";

const MEDIAPIPE_HANDS_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js";
const MEDIAPIPE_CAMERA_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default function FingerScrollController({ active, onDeactivate }) {
  const [status, setStatus]         = useState("Initialisation...");
  const [cursor, setCursor]         = useState({ x: -200, y: -200, state: "idle" });
  const videoRef                    = useRef(null);
  const canvasRef                   = useRef(null);
  const cameraRef                   = useRef(null);
  const handsRef                    = useRef(null);
  const animFrameRef                = useRef(null);
  const scrollSpeedRef              = useRef(0);
  const isPinchingRef               = useRef(false);
  const scriptsLoadedRef            = useRef(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    async function init() {
      try {
        setStatus("Chargement MediaPipe...");
        if (!scriptsLoadedRef.current) {
          await loadScript(MEDIAPIPE_CAMERA_URL);
          await loadScript(MEDIAPIPE_HANDS_URL);
          scriptsLoadedRef.current = true;
        }
        if (cancelled) return;

        setStatus("Démarrage caméra...");
        const HandsClass  = window.Hands;
        const CameraClass = window.Camera;

        const hands = new HandsClass({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
          if (!canvasRef.current) return;
          const ctx = canvasRef.current.getContext("2d");
          ctx.clearRect(0, 0, 320, 240);

          if (results.multiHandLandmarks?.length > 0) {
            const hand      = results.multiHandLandmarks[0];
            const indexTip  = hand[8];
            const middleTip = hand[12];
            const thumbTip  = hand[4];

            // Draw guide lines
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = "rgba(255,220,0,0.6)";
            ctx.lineWidth   = 1.5;
            ctx.beginPath(); ctx.moveTo(0, 120); ctx.lineTo(320, 120); ctx.stroke();
            ctx.strokeStyle = "rgba(255,220,0,0.25)";
            ctx.beginPath(); ctx.moveTo(0, 96);  ctx.lineTo(320, 96);  ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, 144); ctx.lineTo(320, 144); ctx.stroke();
            ctx.setLineDash([]);

            // Index finger dot (green) — controls scroll
            ctx.fillStyle = "#00e676";
            ctx.shadowColor = "#00e676";
            ctx.shadowBlur  = 10;
            ctx.beginPath();
            ctx.arc(indexTip.x * 320, indexTip.y * 240, 9, 0, 2 * Math.PI);
            ctx.fill();

            // Middle finger dot (orange) — controls click
            ctx.fillStyle  = "#ff6b35";
            ctx.shadowColor = "#ff6b35";
            ctx.shadowBlur  = 10;
            ctx.beginPath();
            ctx.arc(middleTip.x * 320, middleTip.y * 240, 9, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Scroll via index finger (vertical position relative to center)
            const dy = indexTip.y - 0.5;
            scrollSpeedRef.current = Math.abs(dy) > 0.1 ? dy * 50 : 0;

            // Pinch to click (thumb + middle finger distance)
            const pinchDist = Math.hypot(
              thumbTip.x - middleTip.x,
              thumbTip.y - middleTip.y,
            );
            const isPinching = pinchDist < 0.08;

            // Mirror X because video is mirrored — index finger drives screen cursor
            const screenX = (1 - indexTip.x) * window.innerWidth;
            const screenY = indexTip.y * window.innerHeight;

            // Update visible screen cursor
            let cursorState = "idle";
            if (isPinching)                       cursorState = "pinch";
            else if (scrollSpeedRef.current > 0)  cursorState = "down";
            else if (scrollSpeedRef.current < 0)  cursorState = "up";
            setCursor({ x: screenX, y: screenY, state: cursorState });

            // Pinch click via middle finger position
            const clickX = (1 - middleTip.x) * window.innerWidth;
            const clickY = middleTip.y * window.innerHeight;
            if (isPinching) {
              if (!isPinchingRef.current) {
                isPinchingRef.current = true;
                const el = document.elementFromPoint(clickX, clickY);
                if (el) el.click();
              }
            } else {
              isPinchingRef.current = false;
            }

            if (scrollSpeedRef.current > 0)  setStatus("⬇ Défilement bas");
            else if (scrollSpeedRef.current < 0) setStatus("⬆ Défilement haut");
            else if (isPinching)             setStatus("👌 Clic !");
            else                             setStatus("✋ Main détectée");
          } else {
            scrollSpeedRef.current = 0;
            setCursor({ x: -200, y: -200, state: "idle" });
            setStatus("Montrez votre main...");
          }
        });

        handsRef.current = hands;

        const camera = new CameraClass(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current) await handsRef.current.send({ image: videoRef.current });
          },
          width: 640, height: 480,
        });

        await camera.start();
        cameraRef.current = camera;
        if (!cancelled) setStatus("✋ Montrez votre main");

        // Animation scroll loop
        const loop = () => {
          if (scrollSpeedRef.current !== 0) window.scrollBy(0, scrollSpeedRef.current);
          animFrameRef.current = requestAnimationFrame(loop);
        };
        animFrameRef.current = requestAnimationFrame(loop);

      } catch (err) {
        if (!cancelled) {
          setStatus("Erreur: " + err.message);
          console.error("[FingerScroll]", err);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (cameraRef.current)    { cameraRef.current.stop();  cameraRef.current = null; }
      if (handsRef.current)     { handsRef.current = null; }
      if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); }
      scrollSpeedRef.current = 0;
    };
  }, [active]);

  if (!active) return null;

  // Cursor appearance by state
  const cursorStyles = {
    idle:  { bg: "rgba(0,230,118,0.15)", border: "#00e676", icon: "🖐️", scale: 1 },
    up:    { bg: "rgba(33,150,243,0.2)",  border: "#2196f3", icon: "⬆️",  scale: 1.1 },
    down:  { bg: "rgba(255,152,0,0.2)",   border: "#ff9800", icon: "⬇️",  scale: 1.1 },
    pinch: { bg: "rgba(255,64,129,0.25)", border: "#ff4081", icon: "👌",  scale: 1.3 },
  };
  const cs = cursorStyles[cursor.state] || cursorStyles.idle;

  return (
    <>
      {/* ── Screen cursor: follows index finger on the actual UI ── */}
      <div
        style={{
          position: "fixed",
          left: cursor.x,
          top:  cursor.y,
          transform: `translate(-50%, -50%) scale(${cs.scale})`,
          zIndex: 99998,
          pointerEvents: "none",
          transition: "transform 0.08s ease, border-color 0.15s, background 0.15s",
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: cs.bg,
          border: `2.5px solid ${cs.border}`,
          boxShadow: `0 0 18px ${cs.border}88`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
        }}
      >
        {cs.icon}
      </div>

      {/* ── Camera panel ── */}
    <div style={{
      position: "fixed", bottom: 24, left: 24, zIndex: 9999,
      background: "#0d1117", borderRadius: 14, overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,230,118,0.25), 0 2px 12px rgba(0,0,0,0.6)",
      border: "2px solid #00e676",
      width: 210,
      userSelect: "none",
    }}>
      {/* Camera preview */}
      <div style={{ position: "relative", width: 210, height: 158 }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: 210, height: 158,
            objectFit: "cover", display: "block",
            transform: "scaleX(-1)",
          }}
        />
        <canvas
          ref={canvasRef}
          width={320} height={240}
          style={{
            position: "absolute", top: 0, left: 0,
            width: 210, height: 158,
            transform: "scaleX(-1)",
            pointerEvents: "none",
          }}
        />
        {/* Close button */}
        <button
          onClick={onDeactivate}
          style={{
            position: "absolute", top: 6, right: 6,
            background: "rgba(0,0,0,0.6)", border: "1px solid #444",
            color: "#fff", borderRadius: "50%",
            width: 22, height: 22, cursor: "pointer",
            fontSize: 11, fontWeight: 700, lineHeight: "22px",
            padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="Désactiver"
        >
          ✕
        </button>
      </div>

      {/* Status bar */}
      <div style={{
        padding: "6px 10px", fontSize: 11, color: "#00e676",
        fontFamily: "monospace", textAlign: "center",
        background: "#090d0f", borderTop: "1px solid #1a2a1a",
        minHeight: 26, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {status}
      </div>

      {/* Legend */}
      <div style={{
        padding: "6px 12px 9px",
        display: "flex", gap: 14, justifyContent: "center",
        fontSize: 10, color: "#666",
        background: "#090d0f",
      }}>
        <span><span style={{ color: "#00e676" }}>●</span> Index → scroll</span>
        <span><span style={{ color: "#ff6b35" }}>●</span> Pince → clic</span>
      </div>
    </div>
    </>
  );
}
