import Card from "./Card";
import Progress from "./Progress";

type PageHeaderProps = Readonly<{
  title: string;
  level: number;
  xp: number;
  maxXp: number;
  accentClass?: string;
  eyebrow?: string;
}>;

export default function PageHeader({
  title,
  level,
  xp,
  maxXp,
  accentClass = "text-purple-300",
  eyebrow = "SYSTEM MODULE",
}: PageHeaderProps) {
  return (
    <Card className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-slate-900 p-6 shadow-[0_0_45px_rgba(147,51,234,0.12)]">
      <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_50%_35%,rgba(168,85,247,0.24),transparent_36%)]" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className={"text-sm font-semibold tracking-wide " + accentClass}>{eyebrow}</p>
          <h1 className="mt-2 text-5xl font-bold">{title}</h1>
          <p className="mt-2 text-slate-400">Level {level} progression active</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[140px_1fr] lg:min-w-[500px]">
          <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
            <p className="text-xs text-slate-500">LEVEL</p>
            <p className="mt-1 text-4xl font-bold">{level}</p>
          </div>
          <div className="rounded-xl border border-purple-500/30 bg-slate-950/60 p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span>XP</span>
              <span>{xp} / {maxXp}</span>
            </div>
            <Progress
              value={xp}
              max={maxXp}
              className="h-3 overflow-hidden rounded-full bg-slate-800"
              fillClassName="h-full bg-purple-500"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
