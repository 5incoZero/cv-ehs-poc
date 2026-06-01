import type { Alert } from "@/lib/supabase";

function count(alerts: Alert[], type: string) {
  return alerts.filter((a) => a.violation_type.includes(type)).length;
}

export default function StatsBar({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Stat label="Total alertas" value={alerts.length} color="text-white" />
      <Stat label="Sin casco" value={count(alerts, "helmet") + count(alerts, "hardhat")} color="text-red-400" />
      <Stat label="Sin chaleco" value={count(alerts, "vest")} color="text-orange-400" />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className={`text-4xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}
