"use client";

import Link from "next/link";
import Card from "../Card";

type CareerHubNavCardProps = Readonly<{
  href: string;
  emoji: string;
  title: string;
  description: string;
  meta?: string;
}>;

export default function CareerHubNavCard({ href, emoji, title, description, meta }: CareerHubNavCardProps) {
  return (
    <Link href={href} className="block h-full">
      <Card className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between">
          <span className="text-3xl">{emoji}</span>
          <span className="text-slate-500">→</span>
        </div>
        <h2 className="mt-4 text-lg font-black text-white">{title}</h2>
        <p className="mt-2 flex-1 text-sm text-slate-400">{description}</p>
        {meta ? <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{meta}</p> : null}
      </Card>
    </Link>
  );
}
