"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const LABELS: Record<string, string> = {
  "no-hardhat":     "Sin casco",
  "no-safety vest": "Sin chaleco",
  "no-mask":        "Sin mascarilla",
};
const ICONS: Record<string, string> = {
  "no-hardhat": "⛑️", "no-safety vest": "🦺", "no-mask": "😷",
};

type Violation = {
  id: string;
  timestamp_sec: number;
  timestamp_fmt: string;
  violation_type: string;
  confidence: number;
  snapshot_b64: string;
};

type Summary = {
  total_violations: number;
  duration_sec: number;
  by_type: Record<string, number>;
};

export default function AnalisisPage() {
  const [file, setFile]           = useState<File | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [selected, setSelected]   = useState<Violation | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) setFile(f);
  }, []);

  const analyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setViolations([]);
    setSummary(null);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const resp = await fetch(`${BACKEND_URL}/analysis/upload`, {
      method: "POST",
      body: formData,
    });

    if (!resp.body) return;
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const msg = JSON.parse(line.slice(6));
          if (msg.type === "progress") setProgress(msg.pct);
          if (msg.type === "violation") setViolations(prev => [...prev, msg.data]);
          if (msg.type === "done") { setSummary(msg.summary); setProgress(100); }
        } catch {}
      }
    }
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 hover:text-white text-sm">← Dashboard</Link>
          <h1 className="text-xl font-bold">Análisis de Video</h1>
          <span className="text-gray-500 text-sm hidden sm:block">Cámara USB · Grabación</span>
        </div>
      </header>

      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Izquierda — upload + progreso + resumen */}
        <div className="space-y-4">

          {/* Drop zone */}
          {!analyzing && !summary && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                dragging ? "border-blue-500 bg-blue-950/20" : "border-gray-700 hover:border-gray-500"
              }`}
            >
              <p className="text-5xl mb-4">📹</p>
              <p className="text-lg font-semibold text-gray-300">
                {file ? file.name : "Arrastrá el video acá"}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(1)} MB — listo para analizar`
                  : "MP4, AVI, MOV · desde cámara USB"}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
              />
            </div>
          )}

          {/* Botón analizar */}
          {file && !analyzing && !summary && (
            <button
              onClick={analyze}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all"
            >
              🔍 Analizar video
            </button>
          )}

          {/* Progreso */}
          {analyzing && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                <p className="font-semibold">Analizando con YOLOv8...</p>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3">
                <div
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>{progress}% completado</span>
                <span>{violations.length} violaciones encontradas</span>
              </div>
            </div>
          )}

          {/* Resumen */}
          {summary && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
              <h2 className="font-bold text-lg">📊 Resumen del análisis</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-xl p-4">
                  <p className="text-gray-400 text-xs">Duración</p>
                  <p className="text-2xl font-bold">{summary.duration_sec}s</p>
                </div>
                <div className="bg-red-950/40 border border-red-900 rounded-xl p-4">
                  <p className="text-gray-400 text-xs">Total violaciones</p>
                  <p className="text-2xl font-bold text-red-400">{summary.total_violations}</p>
                </div>
              </div>
              {Object.entries(summary.by_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2">
                  <span className="text-sm">{ICONS[type] ?? "⚠️"} {LABELS[type] ?? type}</span>
                  <span className="font-bold text-red-400">{count}</span>
                </div>
              ))}
              <button
                onClick={() => { setFile(null); setSummary(null); setViolations([]); setProgress(0); }}
                className="w-full border border-gray-700 text-gray-400 hover:text-white py-2 rounded-xl text-sm"
              >
                Analizar otro video
              </button>
            </div>
          )}

          {/* Preview snapshot seleccionado */}
          {selected && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
                <span className="text-sm font-medium">
                  {ICONS[selected.violation_type]} {LABELS[selected.violation_type]} — {selected.timestamp_fmt}
                </span>
                <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/jpeg;base64,${selected.snapshot_b64}`}
                alt="snapshot"
                className="w-full"
              />
              <p className="text-xs text-gray-500 px-4 py-2">
                Confianza: {(selected.confidence * 100).toFixed(0)}%
              </p>
            </div>
          )}
        </div>

        {/* Derecha — timeline */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Timeline de violaciones {violations.length > 0 && `(${violations.length})`}
          </h2>

          {violations.length === 0 && !analyzing && (
            <div className="text-center py-16 text-gray-600">
              <p className="text-4xl mb-2">🎬</p>
              <p className="text-sm">Las violaciones aparecerán aquí mientras se analiza</p>
            </div>
          )}

          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {violations.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className={`w-full text-left border rounded-xl overflow-hidden transition-all hover:border-blue-600 ${
                  selected?.id === v.id ? "border-blue-500" : "border-gray-800"
                }`}
              >
                <div className="flex gap-3 p-3 bg-gray-900">
                  {/* Thumbnail */}
                  {v.snapshot_b64 && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`data:image/jpeg;base64,${v.snapshot_b64}`}
                      alt=""
                      className="w-20 h-14 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-red-300">
                      {ICONS[v.violation_type]} {LABELS[v.violation_type] ?? v.violation_type}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      🕐 {v.timestamp_fmt} · {(v.confidence * 100).toFixed(0)}% confianza
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <p className="text-xs text-gray-600">
          Construido por <span className="text-gray-400 font-medium">Equipo EHS — HydroAlia</span>
          <span className="ml-2 text-gray-700">· Proof of Concept</span>
        </p>
        <p className="text-xs text-gray-700">cv-ehs-poc · YOLOv8n · Análisis offline</p>
      </footer>
    </div>
  );
}
