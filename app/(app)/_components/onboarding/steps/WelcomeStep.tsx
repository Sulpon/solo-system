"use client";

type WelcomeStepProps = Readonly<{
  onBegin: () => void;
}>;

const flowSteps = ["Dreams become Goals.", "Goals become Progress Goals.", "Progress Goals become Quests.", "Daily Quests build your future."];

export default function WelcomeStep({ onBegin }: WelcomeStepProps) {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-300">Atlas</p>
      <h1 className="mt-3 text-4xl font-black text-white">Welcome to Atlas.</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">
        Atlas is your personal Life Operating System. Before you step into the dashboard, let&apos;s build your character: your attributes, your
        dreams, and the daily quests that will carry you there.
      </p>

      <div className="mx-auto mt-8 max-w-md space-y-3 text-left">
        {flowSteps.map((line, index) => (
          <div key={line} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-purple-400/40 bg-purple-500/10 text-xs font-bold text-purple-200">
              {index + 1}
            </span>
            <span className="text-sm text-slate-200">{line}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onBegin}
        className="mt-10 rounded-xl border border-purple-400/50 bg-purple-500/15 px-8 py-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 hover:scale-[1.03] active:scale-[0.98]"
      >
        Begin
      </button>
    </div>
  );
}
