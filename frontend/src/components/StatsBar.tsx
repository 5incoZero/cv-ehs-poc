import type { Alert } from "@/lib/supabase";

function count(alerts: Alert[], ...terms: string[]) {
  return alerts.filter((a) => terms.some(t => a.violation_type.includes(t))).length;
}

export default function StatsBar({ alerts }: { alerts: Alert[] }) {
  const helmets  = count(alerts, "hardhat", "helmet");
  const vests    = count(alerts, "vest");
  const masks    = count(alerts, "mask");
  const total    = alerts.length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Stat label="Total alertas" value={total}   color="text-white"        bg="bg-gray-900" />
      <Stat label="Sin casco"     value={helmets} color="text-red-400"      bg="bg-red-950/30" icon="⛑️" />
      <Stat label="Sin chaleco"   value={vests}   color="text-orange-400"   bg="bg-orange-950/30" icon="🦺" />
      <Stat label="Sin mascarilla"value={masks}   color="text-yellow-400"   bg="bg-yellow-950/30" icon="😷" />
    </div>
  );
}

function Stat({ label, value, color, bg, icon }: {
  label: string; value: number; color: string; bg: string; icon?: string
}) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-gray-800`}>
      <p className="text-gray-400 text-xs mb-1">{icon && <span className="mr-1">{icon}</span>}{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
