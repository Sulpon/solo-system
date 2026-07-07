"use client";

import { useState } from "react";
import Modal from "../Modal";
import { achievements } from "../../_lib/mock/achievements";
import { getWidgetDefinition, createDefaultWidgetSettings } from "../../_lib/widgets/widget-registry";
import type { Category } from "../../_lib/types/category";
import type {
  ChartMetric,
  ChartTimeRange,
  ChartType,
  ChartWidgetConfig,
  DashboardWidget,
  WidgetAccent,
  WidgetPadding,
  WidgetSettings,
} from "../../_lib/types/dashboard-widget";

type WidgetSettingsModalProps = Readonly<{
  widget: DashboardWidget;
  categories: Category[];
  onClose: () => void;
  onSave: (widget: DashboardWidget) => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const accentOptions: WidgetAccent[] = ["purple", "cyan", "emerald", "amber", "rose", "blue"];
const paddingOptions: WidgetPadding[] = ["compact", "normal", "relaxed"];

function isChartConfig(config: DashboardWidget["config"]): config is ChartWidgetConfig {
  return Boolean(config && "chartType" in config && "metric" in config && "timeRange" in config);
}

function getDefaultSettings(widget: DashboardWidget) {
  return getWidgetDefinition(widget.type)?.defaultSettings ?? createDefaultWidgetSettings();
}

export default function WidgetSettingsModal({ widget, categories, onClose, onSave }: WidgetSettingsModalProps) {
  const [title, setTitle] = useState(widget.title);
  const [settings, setSettings] = useState<WidgetSettings>(widget.settings ?? getDefaultSettings(widget));
  const [showCompletedCount, setShowCompletedCount] = useState(
    Boolean((widget.config as { showCompletedCount?: boolean } | undefined)?.showCompletedCount ?? true),
  );
  const [achievementId, setAchievementId] = useState((widget.config as { achievementId?: string } | undefined)?.achievementId ?? "100-backtests");
  const [chartConfig, setChartConfig] = useState<ChartWidgetConfig>(
    isChartConfig(widget.config)
      ? widget.config
      : { chartType: "bar", metric: "xp", timeRange: "7d", categoryId: "discipline" },
  );

  function saveWidget() {
    const nextConfig =
      widget.type === "chart"
        ? chartConfig
        : widget.type === "daily-quests"
          ? { ...(widget.config ?? {}), showCompletedCount }
          : widget.type === "achievement"
            ? { achievementId }
            : widget.config;

    onSave({
      ...widget,
      title,
      settings,
      config: nextConfig,
    });
  }

  return (
    <Modal title="Widget Settings" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-1">
          <label className="space-y-2">
            <span className={labelClass}>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Accent Color</span>
            <select value={settings.accentColor} onChange={(event) => setSettings({ ...settings, accentColor: event.target.value as WidgetAccent })} className={inputClass}>
              {accentOptions.map((accent) => (
                <option key={accent} value={accent}>
                  {accent}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Padding</span>
            <select value={settings.padding} onChange={(event) => setSettings({ ...settings, padding: event.target.value as WidgetPadding })} className={inputClass}>
              {paddingOptions.map((padding) => (
                <option key={padding} value={padding}>
                  {padding}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className={labelClass}>Transparency</span>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.transparency}
              onChange={(event) => setSettings({ ...settings, transparency: Number(event.target.value) })}
              className="w-full accent-purple-500"
            />
            <div className="text-xs text-slate-500">{settings.transparency}%</div>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
            <span className={labelClass}>Compact Mode</span>
            <input type="checkbox" checked={settings.compactMode} onChange={(event) => setSettings({ ...settings, compactMode: event.target.checked })} className="h-4 w-4 accent-purple-500" />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
            <span className={labelClass}>Show Border</span>
            <input type="checkbox" checked={settings.showBorder} onChange={(event) => setSettings({ ...settings, showBorder: event.target.checked })} className="h-4 w-4 accent-purple-500" />
          </label>
        </div>

        {widget.type === "daily-quests" ? (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
            <span className={labelClass}>Show Completed Count</span>
            <input
              type="checkbox"
              checked={showCompletedCount}
              onChange={(event) => setShowCompletedCount(event.target.checked)}
              className="h-4 w-4 accent-purple-500"
            />
          </label>
        ) : null}

        {widget.type === "achievement" ? (
          <label className="space-y-2">
            <span className={labelClass}>Achievement</span>
            <select
              value={achievementId}
              onChange={(event) => setAchievementId(event.target.value)}
              className={inputClass}
            >
              {achievements.map((achievement) => (
                <option key={achievement.id} value={achievement.id}>
                  {achievement.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {widget.type === "chart" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClass}>Chart Type</span>
              <select value={chartConfig.chartType} onChange={(event) => setChartConfig({ ...chartConfig, chartType: event.target.value as ChartType })} className={inputClass}>
                <option value="line">Line</option>
                <option value="bar">Bar</option>
                <option value="area">Area</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Metric</span>
              <select value={chartConfig.metric} onChange={(event) => setChartConfig({ ...chartConfig, metric: event.target.value as ChartMetric })} className={inputClass}>
                <option value="xp">XP</option>
                <option value="completed-quests">Completed Quests</option>
                <option value="trading">Trading</option>
                <option value="health">Health</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Category</span>
              <select value={chartConfig.categoryId ?? "discipline"} onChange={(event) => setChartConfig({ ...chartConfig, categoryId: event.target.value as ChartWidgetConfig["categoryId"] })} className={inputClass}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Time Range</span>
              <select value={chartConfig.timeRange} onChange={(event) => setChartConfig({ ...chartConfig, timeRange: event.target.value as ChartTimeRange })} className={inputClass}>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="90d">90 Days</option>
                <option value="all">All Time</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button type="button" onClick={saveWidget} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
          Save Widget
        </button>
      </div>
    </Modal>
  );
}
