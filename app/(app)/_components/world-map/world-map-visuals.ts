import type { CountryProgressState } from "../../_lib/types/world-map";

export function getStateVisuals(state: CountryProgressState) {
  switch (state) {
    case "conquered":
      return { border: "border-amber-400/60", bg: "bg-amber-400/15", text: "text-amber-200", ring: "#fbbf24", glow: "shadow-[0_0_22px_rgba(251,191,36,0.35)]", fogClass: "" };
    case "dominated":
      return { border: "border-purple-400/50", bg: "bg-purple-400/10", text: "text-purple-200", ring: "#c084fc", glow: "shadow-[0_0_18px_rgba(168,85,247,0.28)]", fogClass: "" };
    case "occupied":
      return { border: "border-cyan-400/40", bg: "bg-cyan-400/10", text: "text-cyan-200", ring: "#22d3ee", glow: "shadow-[0_0_14px_rgba(34,211,238,0.2)]", fogClass: "" };
    case "explored":
      return { border: "border-slate-500/40", bg: "bg-slate-500/10", text: "text-slate-300", ring: "#94a3b8", glow: "", fogClass: "opacity-75 saturate-[0.6]" };
    default:
      return { border: "border-slate-700/60", bg: "bg-slate-800/30", text: "text-slate-500", ring: "#475569", glow: "", fogClass: "opacity-45 saturate-0 blur-[0.5px]" };
  }
}
