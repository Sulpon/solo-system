"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

type ModalProps = Readonly<{
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}>;

export default function Modal({ title, children, onClose, wide = false }: ModalProps) {
  // Rendered through a portal straight into document.body - a modal nested
  // anywhere inside the app's normal DOM tree can end up trapped behind (or
  // clipped inside) a sibling's box: any ancestor with a CSS backdrop-filter
  // (e.g. Card's backdrop-blur-xl, used by nearly every panel in this app)
  // establishes both a new containing block for position:fixed and a new
  // stacking context, so a fixed modal several levels deep can render inside
  // that ancestor's bounds instead of the viewport, and a later sibling with
  // its own backdrop-filter can paint on top of it. A portal sidesteps this
  // categorically instead of chasing it panel by panel. Lazy-initialized
  // (not an effect + setState) so the client's very first render already
  // has document available - Modal only ever actually renders once a
  // caller's own state flips to true from user interaction, never as part
  // of the initial server-rendered HTML, so there's nothing to reconcile
  // against on hydration.
  const [canUsePortal] = useState(() => typeof document !== "undefined");

  if (!canUsePortal) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={"max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-purple-500/30 bg-slate-950 shadow-[0_0_55px_rgba(124,58,237,0.28)] " + (wide ? "max-w-6xl" : "max-w-2xl")}>
        {/* Sticky, not just the first child in flow - a modal whose content
            is taller than 90vh (e.g. a long checklist) would otherwise
            scroll the title/Close button out of view along with everything
            else, making the modal look like it has no way to exit. */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-5 pb-4 pt-5">
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-purple-300">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
