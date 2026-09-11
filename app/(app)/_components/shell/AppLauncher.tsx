"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useAppNavItems } from "../../_lib/icons/app-icon-map";

type AppLauncherProps = Readonly<{ onClose: () => void }>;

// Portaled to document.body for the same reason Modal.tsx is (see that
// file's comment): an ancestor with backdrop-filter creates a new
// containing block for position:fixed, and this app has backdrop-blur
// panels everywhere. Sits at z-40 - below Modal's z-50, so any in-page
// modal opened from a launched app (e.g. QuestCompletionModal) still wins.
export default function AppLauncher({ onClose }: AppLauncherProps) {
  const [canUsePortal] = useState(() => typeof document !== "undefined");
  const [query, setQuery] = useState("");
  const navItems = useAppNavItems();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? navItems.filter((item) => item.name.toLowerCase().includes(normalized)) : navItems;
  }, [navItems, query]);

  if (!canUsePortal) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 p-4 pt-[10vh] backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl border border-purple-500/30 bg-slate-950/95 shadow-[0_0_60px_rgba(124,58,237,0.3)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-4 border-b border-slate-800 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-500/40 bg-purple-500/10 text-lg font-black text-purple-300">A</div>
          <div className="min-w-0">
            <p className="truncate font-black text-white">Atlas</p>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Application Matrix</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close launcher"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-purple-400/60 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <label className="flex items-center gap-3 border-b border-slate-800 px-5 py-3 text-slate-400">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search applications…"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </label>

        <div className="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                className="flex flex-col items-center gap-2 rounded-xl border border-transparent px-3 py-4 text-center transition hover:border-purple-400/40 hover:bg-purple-500/10"
              >
                <Icon className="h-6 w-6 text-purple-300" aria-hidden="true" />
                <span className="text-xs font-semibold text-slate-200">{item.name}</span>
              </Link>
            );
          })}
          {filteredItems.length === 0 ? <p className="col-span-full py-6 text-center text-sm text-slate-500">No applications match &quot;{query}&quot;.</p> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
