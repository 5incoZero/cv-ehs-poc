"use client";

import { useEffect, useState, useRef } from "react";
import { supabase, type Alert } from "@/lib/supabase";
import AlertCard from "@/components/AlertCard";
import StatsBar from "@/components/StatsBar";
import CameraFeed from "@/components/CameraFeed";
import AlertsChart from "@/components/AlertsChart";

const LABELS: Record<string, string> = {
  "no-hardhat":     "Sin casco",
  "no-safety vest": "Sin chaleco",
  "no-mask":        "Sin mascarilla",
};

export default function Dashboard() {
  const [alerts, setAlerts]       = useState<Alert[]>([]);
  const [loading, setLoading]     = useState(true);
  const [notifOk, setNotifOk]     = useState(false);
  const audioCtxRef               = useRef<AudioContext | null>(null);

  // Pedir permiso de notificaciones al montar
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      Notification.requestPermission().then((p) => setNotifOk(p === "granted"));
    }
  }, []);

  useEffect(() => {
    supabase
      .from("alerts")
      .select("id, violation_type, confidence, camera_id, created_at, snapshot_b64")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setAlerts(data as Alert[]);
        setLoading(false);
      });

    const channel = supabase
      .channel("alerts-feed")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          const newAlert = payload.new as Alert;
          setAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);

          // 🔔 Notificación del sistema
          const label = LABELS[newAlert.violation_type] ?? newAlert.violation_type;
          if (notifOk) {
            new Notification("⚠️ Alerta EHS", {
              body: `${label} detectado — ${newAlert.camera_id ?? "cam-0"} (${(newAlert.confidence * 100).toFixed(0)}%)`,
              icon: "/favicon.ico",
            });
          }

          // 🔊 Sonido de alerta
          try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          } catch {}
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOk]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <h1 className="text-xl font-bold">CV-EHS Monitor</h1>
          <span className="text-gray-500 text-sm hidden sm:block">YOLOv8 · Tiempo real</span>
        </div>
        <div className="flex items-center gap-3">
          {!notifOk && (
            <button
              onClick={() => Notification.requestPermission().then(p => setNotifOk(p === "granted"))}
              className="text-xs text-yellow-400 border border-yellow-800 px-3 py-1 rounded-full hover:bg-yellow-900/30"
            >
              🔔 Activar notificaciones
            </button>
          )}
          <span className="text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
            {alerts.length} alertas hoy
          </span>
        </div>
      </header>

      {/* Contenido */}
      <div className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Izquierda — stats + cámara + gráfico */}
        <div className="xl:col-span-2 space-y-4">
          <StatsBar alerts={alerts} />
          <CameraFeed />
          <AlertsChart alerts={alerts} />
        </div>

        {/* Derecha — alertas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Alertas recientes
            </h2>
            {alerts.length > 0 && (
              <span className="text-xs text-red-400 animate-pulse">● EN VIVO</span>
            )}
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-gray-600 text-sm">Cargando...</p>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p className="text-4xl mb-2">✅</p>
                <p className="text-sm">Sin violaciones detectadas</p>
              </div>
            ) : (
              alerts.map((a) => <AlertCard key={a.id} alert={a} />)
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <p className="text-xs text-gray-600">
          Construido por <span className="text-gray-400 font-medium">Equipo EHS — HydroAlia</span>
          <span className="ml-2 text-gray-700">· Proof of Concept</span>
        </p>
        <p className="text-xs text-gray-700">
          cv-ehs-poc · YOLOv8n · Supabase Realtime
        </p>
      </footer>
    </div>
  );
}
