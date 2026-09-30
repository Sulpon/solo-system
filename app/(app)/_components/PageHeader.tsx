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
  accentClass = "atlas-accent",
  eyebrow = "SYSTEM MODULE",
}: PageHeaderProps) {
  return (
    <Card className="relative overflow-hidden rounded-2xl p-6">
      <div aria-hidden className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_50%_35%,rgb(var(--atlas-accent,168_85_247)/0.22),transparent_36%)]" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className={"text-sm font-semibold tracking-wide " + accentClass}>{eyebrow}</p>
          <h1 className="atlas-display mt-2 text-5xl font-bold">{title}</h1>
          <p className="atlas-muted mt-2">Level {level} progression active</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[140px_1fr] lg:min-w-[500px]">
          <div className="atlas-surface rounded-xl border p-4">
            <p className="atlas-muted text-xs">LEVEL</p>
            <p className="mt-1 text-4xl font-bold">{level}</p>
          </div>
          <div className="atlas-surface rounded-xl border p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span>XP</span>
              <span>{xp} / {maxXp}</span>
            </div>
            <Progress
              value={xp}
              max={maxXp}
              className="h-3 overflow-hidden rounded-full bg-white/5"
              fillClassName="h-full bg-[rgb(var(--atlas-accent,168_85_247))]"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
