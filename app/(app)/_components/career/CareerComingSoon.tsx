"use client";

import Card from "../Card";
import CareerHubBackLink from "./CareerHubBackLink";

type CareerComingSoonProps = Readonly<{
  emoji: string;
  title: string;
  description: string;
}>;

export default function CareerComingSoon({ emoji, title, description }: CareerComingSoonProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <CareerHubBackLink />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Career Hub</p>
        <h1 className="mt-2 text-3xl font-black text-white">
          {emoji} {title}
        </h1>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>

      <Card className="p-8">
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
          <h2 className="text-lg font-bold text-white">Coming soon</h2>
          <p className="mt-2 text-sm text-slate-400">This section isn&rsquo;t built yet - it&rsquo;s reserved here so the Career Hub already reflects where it will live.</p>
        </div>
      </Card>
    </div>
  );
}
