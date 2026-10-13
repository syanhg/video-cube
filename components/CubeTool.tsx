"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import VideoCube from "./VideoCube";
import { FACE_NAMES, disposeFace, makeFace, type Face } from "./faces";

const ASPECTS = {
  "1:1": { w: 1080, h: 1080 },
  "16:9": { w: 1920, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
} as const;
type Aspect = keyof typeof ASPECTS;

const MIME_TYPES = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"];

export default function CubeTool() {
  const [faces, setFaces] = useState<(Face | null)[]>(() => Array(6).fill(null));
  const [size, setSize] = useState(1.6);
  const [spinX, setSpinX] = useState(0.25);
  const [spinY, setSpinY] = useState(0.5);
  const [background, setBackground] = useState("#0e0e10");
  const [aspect, setAspect] = useState<Aspect>("1:1");
  const [duration, setDuration] = useState(6);
  const [fps, setFps] = useState(30);
  const [playing, setPlaying] = useState(true);
  const [exportDpr, setExportDpr] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const facesRef = useRef(faces);
  facesRef.current = faces;

  useEffect(() => () => uniqueFaces(facesRef.current).forEach(disposeFace), []);

  function replaceFaces(next: (Face | null)[]) {
    const keep = new Set(next.filter(Boolean));
    uniqueFaces(faces).forEach((f) => !keep.has(f) && disposeFace(f));
    next.forEach((f) => f && (playing ? void f.video.play().catch(() => {}) : f.video.pause()));
    setFaces(next);
  }

  function setFace(i: number, file: File | undefined) {
    if (!file) return;
    const next = [...faces];
    next[i] = makeFace(file);
    replaceFaces(next);
  }

  function fillAll(file: File | undefined) {
    if (!file) return;
    replaceFaces(Array(6).fill(makeFace(file)));
  }

  function fillEmpty() {
    const first = faces.find(Boolean);
    if (!first) return;
    replaceFaces(faces.map((f) => f ?? first));
  }

  function clearFace(i: number) {
    const next = [...faces];
    next[i] = null;
    replaceFaces(next);
  }

  function togglePlay() {
    const next = !playing;
    uniqueFaces(faces).forEach((f) => (next ? void f.video.play().catch(() => {}) : f.video.pause()));
    setPlaying(next);
  }

  function restartAll() {
    uniqueFaces(faces).forEach((f) => {
      f.video.currentTime = 0;
      if (playing) void f.video.play().catch(() => {});
    });
  }

  function savePng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    download(canvas.toDataURL("image/png"), "video-cube.png");
  }

  async function exportVideo() {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || progress !== null) return;
    if (typeof MediaRecorder === "undefined" || !canvas.captureStream) {
      setStatus("This browser can't record the canvas.");
      return;
    }

    setExportDpr(ASPECTS[aspect].w / stage.clientWidth);
    await nextFrames(3);

    const mimeType = MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m));
    const recorder = new MediaRecorder(canvas.captureStream(fps), {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 16_000_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

    setStatus("");
    setProgress(0);
    restartAll();
    const recording = new Promise<void>((resolve) => (recorder.onstart = () => resolve()));
    recorder.start(250);
    await recording;
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const p = (performance.now() - started) / (duration * 1000);
        setProgress(Math.min(p, 1));
        if (p >= 1) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    recorder.stop();
    await stopped;

    const type = recorder.mimeType || "video/webm";
    const blob = new Blob(chunks, { type });
    const url = URL.createObjectURL(blob);
    download(url, `video-cube-${aspect.replace(":", "x")}.${type.includes("mp4") ? "mp4" : "webm"}`);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);

    setExportDpr(null);
    setProgress(null);
    setStatus(`Exported ${duration}s at ${ASPECTS[aspect].w}×${ASPECTS[aspect].h}, ${(blob.size / 1e6).toFixed(1)} MB.`);
  }

  const filled = faces.filter(Boolean).length;
  const { w, h } = ASPECTS[aspect];

  return (
    <div className="app">
      <aside className="sidebar">
        <header>
          <h1>Video Cube</h1>
          <p className="muted">{filled}/6 faces filled</p>
        </header>

        <section>
          <h2>Faces</h2>
          <div className="faces">
            {FACE_NAMES.map((name, i) => {
              const face = faces[i];
              return (
                <div key={name} className={`face ${face ? "on" : ""}`}>
                  <label className="drop">
                    <input type="file" accept="video/*" onChange={(e) => setFace(i, e.target.files?.[0])} />
                    <span className="face-name">{name}</span>
                    <span className="face-file">{face ? face.name : "Add video"}</span>
                  </label>
                  {face && (
                    <button className="x" onClick={() => clearFace(i)} aria-label={`Clear ${name}`}>
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="row">
            <label className="btn">
              <input type="file" accept="video/*" onChange={(e) => fillAll(e.target.files?.[0])} />
              One video on all faces
            </label>
            <button className="btn" onClick={fillEmpty} disabled={!filled || filled === 6}>
              Fill empty faces
            </button>
          </div>
        </section>

        <section>
          <h2>Motion</h2>
          <Slider label="Spin X" value={spinX} min={-2} max={2} step={0.05} onChange={setSpinX} />
          <Slider label="Spin Y" value={spinY} min={-2} max={2} step={0.05} onChange={setSpinY} />
          <Slider label="Size" value={size} min={0.6} max={2.4} step={0.05} onChange={setSize} />
          <div className="row">
            <button className="btn" onClick={togglePlay} disabled={!filled}>
              {playing ? "Pause videos" : "Play videos"}
            </button>
            <button className="btn" onClick={restartAll} disabled={!filled}>
              Restart
            </button>
          </div>
        </section>

        <section>
          <h2>Output</h2>
          <div className="field">
            <span>Format</span>
            <div className="seg">
              {(Object.keys(ASPECTS) as Aspect[]).map((a) => (
                <button key={a} className={a === aspect ? "active" : ""} onClick={() => setAspect(a)}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Background</span>
            <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} />
          </div>
          <Slider label="Length" value={duration} min={2} max={30} step={1} unit="s" onChange={setDuration} />
          <div className="field">
            <span>Frame rate</span>
            <div className="seg">
              {[24, 30, 60].map((f) => (
                <button key={f} className={f === fps ? "active" : ""} onClick={() => setFps(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="row">
            <button className="btn primary" onClick={exportVideo} disabled={progress !== null}>
              {progress === null ? "Export video" : `Recording ${Math.round(progress * 100)}%`}
            </button>
            <button className="btn" onClick={savePng} disabled={progress !== null}>
              Save PNG
            </button>
          </div>
          <p className="muted small">
            {status || `${w}×${h}. Exporting records in real time, so it takes as long as the clip.`}
          </p>
        </section>
      </aside>

      <main className="stage-wrap">
        <div ref={stageRef} className="stage" style={{ aspectRatio: `${w} / ${h}` }}>
          <Canvas
            dpr={exportDpr ?? [1, 2]}
            gl={{ preserveDrawingBuffer: true, antialias: true }}
            camera={{ position: [2.6, 2, 2.6], fov: 45 }}
            onCreated={({ gl }) => (canvasRef.current = gl.domElement)}
          >
            <color attach="background" args={[background]} />
            <VideoCube faces={faces} size={size} spinX={spinX} spinY={spinY} emptyColor="#2a2a2f" />
            <OrbitControls enablePan={false} minDistance={2} maxDistance={10} />
          </Canvas>
          {progress !== null && <div className="rec">● REC</div>}
        </div>
        <p className="muted small hint">Drag to orbit, scroll to zoom. What you see is what gets exported.</p>
      </main>
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="field">
      <span>{props.label}</span>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
      />
      <output>
        {props.value}
        {props.unit}
      </output>
    </label>
  );
}

function uniqueFaces(faces: (Face | null)[]) {
  return [...new Set(faces.filter((f): f is Face => f !== null))];
}

function nextFrames(n: number) {
  return new Promise<void>((resolve) => {
    const step = (left: number) => (left ? requestAnimationFrame(() => step(left - 1)) : resolve());
    step(n);
  });
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}
