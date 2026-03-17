/**
 * CaptureEngine.jsx
 *
 * Runs entirely in the student's browser:
 *  - Webcam → MediaPipe FaceMesh → face_detected, eye_openness, head_pose
 *  - keydown / mousemove events    → typing_speed, mouse_activity, idle_time
 *
 * Every CYCLE_SECONDS (20s) it:
 *  1. Snapshots the accumulated HCI counters
 *  2. Grabs a webcam frame and extracts CV features
 *  3. Calls onCycleComplete({ cycle, face_detected, eye_openness, head_pose,
 *                              typing_speed, mouse_activity, idle_time })
 *
 * Props:
 *   active          {bool}     start/stop capture
 *   intervalMinutes {number}   wait between cycles (passed through to parent)
 *   onCycleComplete {fn}       called with raw features after each cycle
 *   onPhaseChange   {fn}       called with "tracking" | "waiting" | "idle"
 *   onSecsLeft      {fn}       called every second with seconds remaining
 *   onError         {fn}       called with error string
 *   onCameraReady   {fn}       called when camera + MediaPipe are loaded
 */

import { useEffect, useRef, useCallback } from "react";

const CYCLE_SECONDS   = 20;
const MP_CDN          = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
const MP_WASM_PATH    = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/";

// Eye landmark indices (MediaPipe FaceMesh 468-point model)
const LEFT_EYE_TOP    = 159;
const LEFT_EYE_BOTTOM = 145;
const NOSE_TIP        = 1;
const LEFT_EYE_INNER  = 33;
const RIGHT_EYE_INNER = 263;

export default function CaptureEngine({
  active          = false,
  intervalMinutes = 5,
  onCycleComplete = () => {},
  onPhaseChange   = () => {},
  onSecsLeft      = () => {},
  onError         = () => {},
  onCameraReady   = () => {},
}) {
  // Refs — none of these trigger re-renders
  const videoRef      = useRef(null);
  const streamRef     = useRef(null);
  const faceMeshRef   = useRef(null);
  const mpLoadedRef   = useRef(false);
  const runningRef    = useRef(false);
  const cycleRef      = useRef(0);

  // HCI counters — reset each cycle
  const keyCountRef   = useRef(0);
  const mouseCountRef = useRef(0);
  const lastActiveRef = useRef(Date.now());

  const cvResolveRef  = useRef(null);  // resolves the per-frame promise

  // ── HCI event listeners ──────────────────────────────────────────
  const handleKey   = useCallback(() => {
    keyCountRef.current++;
    lastActiveRef.current = Date.now();
  }, []);

  const handleMouse = useCallback(() => {
    mouseCountRef.current++;
    lastActiveRef.current = Date.now();
  }, []);

  // ── Load MediaPipe via CDN script tag ───────────────────────────
  const loadMediaPipe = useCallback(() => new Promise((resolve, reject) => {
    if (mpLoadedRef.current) { resolve(); return; }
    if (document.getElementById("mp-face-mesh-script")) {
      // Already injected — wait for it
      const check = setInterval(() => {
        if (window.FaceMesh) { mpLoadedRef.current = true; clearInterval(check); resolve(); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id  = "mp-face-mesh-script";
    script.src = MP_CDN;
    script.crossOrigin = "anonymous";
    script.onload = () => { mpLoadedRef.current = true; resolve(); };
    script.onerror = () => reject(new Error("Failed to load MediaPipe FaceMesh"));
    document.head.appendChild(script);
  }), []);

  // ── Start webcam ────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise(res => { videoRef.current.onloadedmetadata = res; });
        await videoRef.current.play();
      }
    } catch (e) {
      throw new Error(`Camera access denied: ${e.message}`);
    }
  }, []);

  // ── Init MediaPipe FaceMesh ─────────────────────────────────────
  const initFaceMesh = useCallback(() => new Promise((resolve) => {
    const fm = new window.FaceMesh({
      locateFile: (file) => `${MP_WASM_PATH}${file}`,
    });
    fm.setOptions({
      maxNumFaces:          1,
      refineLandmarks:      false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence:  0.5,
    });
    fm.onResults((results) => {
      if (!cvResolveRef.current) return;

      const landmarks = results.multiFaceLandmarks?.[0];
      if (!landmarks) {
        cvResolveRef.current({ face_detected: 0, eye_openness: 0.0, head_pose: 0 });
        cvResolveRef.current = null;
        return;
      }

      // Eye openness — vertical EAR distance
      const top    = landmarks[LEFT_EYE_TOP];
      const bottom = landmarks[LEFT_EYE_BOTTOM];
      const eye_openness = Math.abs(top.y - bottom.y);

      // Head pose — nose offset from eye midpoint
      const nose     = landmarks[NOSE_TIP];
      const leftEye  = landmarks[LEFT_EYE_INNER];
      const rightEye = landmarks[RIGHT_EYE_INNER];
      const centerX  = (leftEye.x + rightEye.x) / 2;
      const deviation = Math.abs(nose.x - centerX);
      const stability = Math.max(0, 1 - deviation / 0.1);
      const head_pose = stability >= 0.5 ? 1 : 0;  // binary, matches fusion.py

      cvResolveRef.current({
        face_detected: 1,
        eye_openness:  Math.round(eye_openness * 10000) / 10000,
        head_pose,
      });
      cvResolveRef.current = null;
    });
    fm.initialize().then(() => {
      faceMeshRef.current = fm;
      resolve();
    });
  }), []);

  // ── Capture one frame → CV features ────────────────────────────
  const captureFrame = useCallback(() => new Promise((resolve) => {
    if (!faceMeshRef.current || !videoRef.current || !streamRef.current) {
      resolve({ face_detected: 0, eye_openness: 0.0, head_pose: 0 });
      return;
    }
    cvResolveRef.current = resolve;

    // Draw frame to canvas then send to MediaPipe
    const canvas = document.createElement("canvas");
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);

    faceMeshRef.current.send({ image: canvas }).catch(() => {
      resolve({ face_detected: 0, eye_openness: 0.0, head_pose: 0 });
      cvResolveRef.current = null;
    });

    // Timeout safety — resolve empty if MediaPipe stalls
    setTimeout(() => {
      if (cvResolveRef.current) {
        cvResolveRef.current({ face_detected: 0, eye_openness: 0.0, head_pose: 0 });
        cvResolveRef.current = null;
      }
    }, 3000);
  }), []);

  // ── Snapshot HCI counters, reset them ──────────────────────────
  const snapshotHCI = useCallback(() => {
    const now        = Date.now();
    const idleTime   = Math.round((now - lastActiveRef.current) / 1000);
    // typing_speed: keys per CYCLE_SECONDS → approximate WPM (÷5 chars/word)
    const typing_speed   = Math.round((keyCountRef.current / CYCLE_SECONDS) * 60 / 5);
    const mouse_activity = Math.round(mouseCountRef.current / CYCLE_SECONDS);

    keyCountRef.current   = 0;
    mouseCountRef.current = 0;

    return { typing_speed, mouse_activity, idle_time: Math.min(idleTime, CYCLE_SECONDS) };
  }, []);

  // ── Main monitoring loop ────────────────────────────────────────
  const runLoop = useCallback(async () => {
    runningRef.current = true;
    cycleRef.current   = 0;

    while (runningRef.current) {
      // ── Tracking phase ─────────────────────────────────────────
      onPhaseChange("tracking");
      // Count down CYCLE_SECONDS
      for (let s = CYCLE_SECONDS; s > 0; s--) {
        if (!runningRef.current) break;
        onSecsLeft(s);
        await sleep(1000);
      }

      if (!runningRef.current) break;

      // Snapshot features at end of cycle
      const hci = snapshotHCI();
      const cv  = await captureFrame();

      cycleRef.current++;
      onCycleComplete({
        cycle:          cycleRef.current,
        face_detected:  cv.face_detected,
        eye_openness:   cv.eye_openness,
        head_pose:      cv.head_pose,
        typing_speed:   hci.typing_speed,
        mouse_activity: hci.mouse_activity,
        idle_time:      hci.idle_time,
      });

      if (!runningRef.current) break;

      // ── Waiting phase ───────────────────────────────────────────
      onPhaseChange("waiting");
      const waitSecs = intervalMinutes * 60;
      for (let s = waitSecs; s > 0; s--) {
        if (!runningRef.current) break;
        onSecsLeft(s);
        await sleep(1000);
      }
    }

    onPhaseChange("idle");
    onSecsLeft(0);
    runningRef.current = false;
  }, [intervalMinutes, snapshotHCI, captureFrame, onCycleComplete, onPhaseChange, onSecsLeft]);

  // ── Stop camera + MediaPipe ─────────────────────────────────────
  const teardown = useCallback(() => {
    runningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ── Effect: start/stop when active changes ──────────────────────
  useEffect(() => {
    if (!active) {
      teardown();
      return;
    }

    let cancelled = false;

    async function setup() {
      try {
        // Attach HCI listeners
        window.addEventListener("keydown",   handleKey);
        window.addEventListener("mousemove", handleMouse);

        // Load MediaPipe + camera in parallel
        await Promise.all([loadMediaPipe(), startCamera()]);
        if (cancelled) return;

        await initFaceMesh();
        if (cancelled) return;

        onCameraReady();
        runLoop();
      } catch (e) {
        if (!cancelled) onError(e.message || "Capture setup failed");
      }
    }

    setup();

    return () => {
      cancelled = true;
      teardown();
      window.removeEventListener("keydown",   handleKey);
      window.removeEventListener("mousemove", handleMouse);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Hidden video element — required by MediaPipe
  return (
    <video
      ref={videoRef}
      style={{ position: "fixed", opacity: 0, pointerEvents: "none",
               width: 1, height: 1, top: 0, left: 0 }}
      playsInline muted
    />
  );
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}
