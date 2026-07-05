import Card from "../Card";

export default function GeneralSettingsPanel() {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">General</p>
      <h2 className="mt-2 text-2xl font-black text-white">MENACE customization system</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
        This milestone keeps the first five categories fixed for the MVP while moving quests, dashboard widgets, chart configuration, appearance, and daily quest state into local customization storage.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {["Local-first", "Widget-driven", "Supabase-ready"].map((item) => (
          <div key={item} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm font-semibold text-slate-200">{item}</div>
        ))}
      </div>
    </Card>
  );
}
