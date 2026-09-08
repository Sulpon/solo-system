"use client";

export type QuestDetailTab = "overview" | "calendar" | "statistics" | "notes";

const TABS: ReadonlyArray<{ id: QuestDetailTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "calendar", label: "Calendar" },
  { id: "statistics", label: "Statistics" },
  { id: "notes", label: "Notes" },
];

type QuestDetailTabsProps = Readonly<{
  activeTab: QuestDetailTab;
  onChange: (tab: QuestDetailTab) => void;
}>;

export default function QuestDetailTabs({ activeTab, onChange }: QuestDetailTabsProps) {
  return (
    <div className="flex gap-1 border-b border-slate-800 px-5 pt-3">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={
            "rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold transition " +
            (activeTab === tab.id ? "border-purple-400 text-white" : "border-transparent text-slate-500 hover:text-slate-300")
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
