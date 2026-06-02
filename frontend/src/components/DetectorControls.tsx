"use client";

import { useState, useEffect } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function DetectorControls() {
  const [running, setRunning] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Verificar estado al montar
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`)
      .then(r => r.json())
      .then(d => setRunning(d.detector_running))
      .catch(() => setRunning(null));
  }, []);

  const toggle = async () => {
    setLoading(true);
    try {
      const endpoint = running ? "/detector/stop" : "/detector/start";
      const res = await fetch(`${BACKEND_URL}${endpoint}`, { method: "POST" });
      const data = await res.json();
      setRunning(data.running);
    } catch {
      alert("No se pudo conectar al backend");
    } finally {
      setLoading(false);
    }
  };

  if (running === null) return null; // backend desconectado — no mostrar

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
        running
          ? "border-red-700 text-red-400 hover:bg-red-900/30"
          : "border-green-700 text-green-400 hover:bg-green-900/30"
      } disabled:opacity-50`}
    >
      {loading ? (
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse inline-block" />
      ) : (
        <span className={`w-2 h-2 rounded-full inline-block ${running ? "bg-red-500" : "bg-green-500"}`} />
      )}
      {loading ? "..." : running ? "Detener cámara" : "Iniciar cámara"}
    </button>
  );
}
