"use client";

import Link from "next/link";
import { Bot } from "lucide-react";

// Phase 14 Step 18 - contextual JARVIS entry points. Passes the selected
// entity as URL search params so JarvisPageClient can seed the
// conversation's context and first question without the model having to
// "rediscover" what the user was looking at. Deliberately a single shared
// component (not a bespoke button per page) - used sparingly, only where
// the spec explicitly calls for it.
export type AskJarvisSeed = Readonly<{ type: "goal" | "quest"; id: string; label: string }>;

type AskJarvisLinkProps = Readonly<{ label: string; seed?: AskJarvisSeed; question?: string; className?: string }>;

// `seed` forces a specific Goal/Quest's real relationships into context
// (Goal/Quest detail entry points). `question` is a simpler auto-sent
// starter question with no forced entity seed - used where the entity type
// doesn't map onto a get_goal/get_quest lookup (e.g. an Achievement Moment).
export default function AskJarvisLink({ label, seed, question, className }: AskJarvisLinkProps) {
  const href = seed
    ? `/jarvis?seedType=${seed.type}&seedId=${encodeURIComponent(seed.id)}&seedLabel=${encodeURIComponent(seed.label)}`
    : question
      ? `/jarvis?q=${encodeURIComponent(question)}`
      : "/jarvis";

  return (
    <Link
      href={href}
      className={className ?? "flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20"}
    >
      <Bot className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Link>
  );
}
