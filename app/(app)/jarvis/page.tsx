import { Suspense } from "react";
import JarvisPageClient from "../_components/jarvis/JarvisPageClient";

export default function JarvisPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">Loading JARVIS...</div>}>
      <JarvisPageClient />
    </Suspense>
  );
}
