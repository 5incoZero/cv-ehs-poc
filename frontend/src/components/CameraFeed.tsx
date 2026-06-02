"use client";

import { useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function CameraFeed() {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
          <span className="text-sm font-medium">Webcam Principal — cam-0</span>
        </div>
        <span className="text-xs text-gray-500">MJPEG · 5 fps</span>
      </div>

      {/* Feed de video */}
      <div className="relative bg-black aspect-video flex items-center justify-center">
        {error ? (
          <div className="text-center text-gray-500 space-y-2">
            <p className="text-4xl">📵</p>
            <p className="text-sm">Backend desconectado</p>
            <p className="text-xs">Iniciá uvicorn en el puerto 8000</p>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${BACKEND_URL}/camera/stream`}
            alt="Camera feed"
            className="w-full h-full object-contain"
            onLoad={() => setConnected(true)}
            onError={() => { setError(true); setConnected(false); }}
          />
        )}

        {/* Overlay — badge de detección activa */}
        {connected && (
          <div className="absolute top-3 left-3 bg-black/60 text-green-400 text-xs px-2 py-1 rounded font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
            DETECTANDO
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="px-4 py-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500 inline-block"/>Sin casco</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500 inline-block"/>Sin chaleco</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block"/>OK</span>
      </div>
    </div>
  );
}
