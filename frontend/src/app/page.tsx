"use client";

import { useEffect, useState } from "react";
import { supabase, type Alert } from "@/lib/supabase";
import AlertCard from "@/components/AlertCard";
import StatsBar from "@/components/StatsBar";

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    supabase
      .from("alerts")
      .select("id, violation_type, confidence, camera_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setAlerts(data as Alert[]);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel("alerts-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts" },
        (payload) => {
          setAlerts((prev) => [payload.new as Alert, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">CV-EHS Monitor</h1>
        <p className="text-gray-400 mt-1">Detección de EPP en tiempo real — YOLOv8</p>
      </header>

      <StatsBar alerts={alerts} />

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-300 mb-4">
          Alertas recientes
        </h2>
        {loading ? (
          <p className="text-gray-500">Cargando...</p>
        ) : alerts.length === 0 ? (
          <p className="text-gray-500">Sin alertas. El sistema está monitoreando.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
