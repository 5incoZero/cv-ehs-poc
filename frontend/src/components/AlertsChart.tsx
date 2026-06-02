"use client";

import type { Alert } from "@/lib/supabase";

export default function AlertsChart({ alerts }: { alerts: Alert[] }) {
  // Agrupar por hora
  const hours: Record<number, number> = {};
  for (let i = 0; i < 24; i++) hours[i] = 0;
  alerts.forEach((a) => {
    const h = new Date(a.created_at).getHours();
    hours[h] = (hours[h] || 0) + 1;
  });

  const max = Math.max(...Object.values(hours), 1);
  const now = new Date().getHours();

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
        Alertas por hora — hoy
      </h3>
      <div className="flex items-end gap-0.5 h-16">
        {Array.from({ length: 24 }, (_, i) => {
          const val = hours[i] || 0;
          const pct = (val / max) * 100;
          const isNow = i === now;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className={`w-full rounded-sm transition-all ${
                  val > 0
                    ? isNow ? "bg-red-500" : "bg-red-800"
                    : "bg-gray-800"
                }`}
                style={{ height: `${Math.max(pct, val > 0 ? 10 : 4)}%` }}
              />
              {/* Tooltip */}
              {val > 0 && (
                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                  {i}:00 — {val} alerta{val > 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-gray-600 text-xs mt-1">
        <span>00:00</span>
        <span>12:00</span>
        <span>23:00</span>
      </div>
    </div>
  );
}
