import Card from "./Card";

type StatCardProps = Readonly<{
  label: string;
  value: string | number;
  detail?: string;
  accentClass?: string;
}>;

export default function StatCard({
  label,
  value,
  detail,
  accentClass = "text-purple-300",
}: StatCardProps) {
  return (
    <Card className="border-slate-700/70 bg-slate-950/45 p-5">
      <p className={"text-xs font-semibold uppercase tracking-[0.2em] " + accentClass}>{label}</p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-400">{detail}</p> : null}
    </Card>
  );
}
