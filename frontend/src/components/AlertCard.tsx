import type { Alert } from "@/lib/supabase";

const LABELS: Record<string, string> = {
  "no-hardhat":    "Sin casco",
  "no-helmet":     "Sin casco",
  "no-safety vest":"Sin chaleco",
  "no-vest":       "Sin chaleco",
  "no-mask":       "Sin mascarilla",
};

const STYLES: Record<string, string> = {
  "no-hardhat":    "border-red-800 bg-red-950/50 text-red-300",
  "no-helmet":     "border-red-800 bg-red-950/50 text-red-300",
  "no-safety vest":"border-orange-800 bg-orange-950/50 text-orange-300",
  "no-vest":       "border-orange-800 bg-orange-950/50 text-orange-300",
  "no-mask":       "border-yellow-800 bg-yellow-950/50 text-yellow-300",
};

const ICONS: Record<string, string> = {
  "no-hardhat": "⛑️",
  "no-helmet":  "⛑️",
  "no-safety vest": "🦺",
  "no-vest":    "🦺",
  "no-mask":    "😷",
};

export default function AlertCard({ alert }: { alert: Alert }) {
  const label  = LABELS[alert.violation_type]  ?? alert.violation_type;
  const style  = STYLES[alert.violation_type]  ?? "border-gray-700 bg-gray-900 text-gray-300";
  const icon   = ICONS[alert.violation_type]   ?? "⚠️";
  const time   = new Date(alert.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const conf   = (alert.confidence * 100).toFixed(0);

  return (
    <div className={`border rounded-xl overflow-hidden ${style}`}>
      {/* Snapshot */}
      {alert.snapshot_b64 && (
        <div className="relative w-full h-32 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/jpeg;base64,${alert.snapshot_b64}`}
            alt="snapshot"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute bottom-1 right-2 text-xs font-mono bg-black/60 px-1 rounded text-white">
            {time}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-3 flex gap-3 items-start">
        <span className="text-xl shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs opacity-60 mt-0.5">
            {alert.camera_id ?? "cam-0"} · {conf}% confianza
          </p>
        </div>
        {!alert.snapshot_b64 && (
          <time className="text-xs font-mono opacity-50 shrink-0 mt-0.5">{time}</time>
        )}
      </div>
    </div>
  );
}
