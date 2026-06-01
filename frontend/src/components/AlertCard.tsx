import type { Alert } from "@/lib/supabase";

const LABELS: Record<string, string> = {
  "no-helmet": "Sin casco",
  "no-hardhat": "Sin casco",
  "no-vest": "Sin chaleco",
  "no-safety-vest": "Sin chaleco",
};

const COLORS: Record<string, string> = {
  "no-helmet": "bg-red-900 border-red-600 text-red-300",
  "no-hardhat": "bg-red-900 border-red-600 text-red-300",
  "no-vest": "bg-orange-900 border-orange-600 text-orange-300",
  "no-safety-vest": "bg-orange-900 border-orange-600 text-orange-300",
};

export default function AlertCard({ alert }: { alert: Alert }) {
  const label = LABELS[alert.violation_type] ?? alert.violation_type;
  const color = COLORS[alert.violation_type] ?? "bg-gray-800 border-gray-600 text-gray-300";
  const time = new Date(alert.created_at).toLocaleTimeString("es-AR");

  return (
    <div className={`border rounded-lg p-4 flex items-center gap-4 ${color}`}>
      <div className="flex-1">
        <p className="font-semibold text-lg">{label}</p>
        <p className="text-sm opacity-75">
          Cámara: {alert.camera_id ?? "—"} · Confianza: {(alert.confidence * 100).toFixed(1)}%
        </p>
      </div>
      <time className="text-sm font-mono opacity-60 shrink-0">{time}</time>
    </div>
  );
}
