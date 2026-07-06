"use client";

type ModalProps = Readonly<{
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}>;

export default function Modal({ title, children, onClose, wide = false }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className={"max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-purple-500/30 bg-slate-950 p-5 shadow-[0_0_55px_rgba(124,58,237,0.28)] " + (wide ? "max-w-6xl" : "max-w-2xl")}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-purple-300">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="pt-5">{children}</div>
      </div>
    </div>
  );
}
