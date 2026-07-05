"use client";

import { useState } from "react";
import type { SettingsSection } from "../../_lib/types/customization";
import AppearanceSettingsPanel from "./AppearanceSettingsPanel";
import DashboardSettingsPanel from "./DashboardSettingsPanel";
import DataSettingsPanel from "./DataSettingsPanel";
import GeneralSettingsPanel from "./GeneralSettingsPanel";
import QuestManager from "./QuestManager";

const sections: { id: SettingsSection; label: string }[] = [
  { id: "general", label: "General" },
  { id: "dashboard", label: "Dashboard" },
  { id: "quests", label: "Quests" },
  { id: "appearance", label: "Appearance" },
  { id: "data", label: "Data" },
];

export default function SettingsPageClient() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Settings</p>
        <h1 className="mt-2 text-3xl font-black text-white">Customize MENACE</h1>
        <p className="mt-2 text-sm text-slate-400">Control quests, dashboard widgets, charts, appearance, and local data.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={
                "rounded-xl border px-4 py-2 text-sm transition " +
                (activeSection === section.id
                  ? "border-purple-400/60 bg-purple-500/15 text-white shadow-[0_0_18px_rgba(168,85,247,0.14)]"
                  : "border-slate-700 bg-slate-950/45 text-slate-300 hover:border-purple-400/50 hover:text-white")
              }
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {activeSection === "general" ? <GeneralSettingsPanel /> : null}
      {activeSection === "dashboard" ? <DashboardSettingsPanel /> : null}
      {activeSection === "quests" ? <QuestManager /> : null}
      {activeSection === "appearance" ? <AppearanceSettingsPanel /> : null}
      {activeSection === "data" ? <DataSettingsPanel /> : null}
    </div>
  );
}
