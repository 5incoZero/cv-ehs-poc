"use client";

import { useEffect, useState } from "react";
import { supabase, type Alert } from "@/lib/supabase";
import AlertCard from "@/components/AlertCard";
import StatsBar from "@/components/StatsBar";
import CameraFeed from "@/components/CameraFeed";

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

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
          setAlerts((prev) => [payload.new as Alert, ...prev.slice(0, 49)]);
          // Sonido de alerta
          if (typeof window !== "undefined") {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            osc.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <h1 className="text-xl font-bold">CV-EHS Monitor</h1>
          <span className="text-gray-500 text-sm">YOLOv8 · Tiempo real</span>
        </div>
        <span className="text-xs text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
          {alerts.length} alertas hoy
        </span>
      </header>

      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Columna izquierda — cámara + stats */}
        <div className="xl:col-span-2 space-y-6">
          <StatsBar alerts={alerts} />
          <CameraFeed />
        </div>

        {/* Columna derecha — alertas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Alertas recientes
            </h2>
            {alerts.length > 0 && (
              <span className="text-xs text-red-400 animate-pulse">● EN VIVO</span>
            )}
          </div>

          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
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
    </main>
  );
}
