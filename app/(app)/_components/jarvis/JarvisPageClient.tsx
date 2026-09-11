"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Wifi, WifiOff } from "lucide-react";
import { useAtlasContext } from "../../_lib/atlas-context";
import { useOnlineStatus } from "../../_lib/hooks/useOnlineStatus";
import { useJarvisConversation } from "../../_lib/hooks/useJarvisConversation";
import JarvisMessageBubble from "./JarvisMessageBubble";
import JarvisComposer from "./JarvisComposer";
import type { JarvisEntitySeed } from "../../_lib/jarvis/jarvis-context-engine";

const STARTER_QUESTIONS: ReadonlyArray<string> = ["What should I do now?", "What happened today?", "What patterns do you see in my behavior?", "What have I achieved recently?"];

function parseSeed(searchParams: URLSearchParams): { seed?: JarvisEntitySeed; label?: string; question?: string } {
  const type = searchParams.get("seedType");
  const id = searchParams.get("seedId");
  const label = searchParams.get("seedLabel") ?? undefined;
  const question = searchParams.get("q") ?? undefined;
  if ((type === "goal" || type === "quest") && id) {
    return { seed: { type, id }, label };
  }
  return { question };
}

export default function JarvisPageClient() {
  const searchParams = useSearchParams();
  const { seed, label, question } = parseSeed(searchParams);
  const atlas = useAtlasContext();
  const isOnline = useOnlineStatus();
  const { messages, status, send, stop, reset, confirmAction, cancelAction, confirmPlan, cancelPlan } = useJarvisConversation(seed);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoSentRef = useRef(false);

  useEffect(() => {
    if (hasAutoSentRef.current || messages.length > 0) return;
    if (seed && label) {
      hasAutoSentRef.current = true;
      send(`Tell me about ${label}.`);
    } else if (question) {
      hasAutoSentRef.current = true;
      send(question);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed?.id, label, question]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const statusLabel = status === "sending" ? "Thinking..." : status === "error" ? "Last response failed" : "Ready";

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-purple-500/25 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.1),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.75),rgba(2,6,23,0.92))]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Bot className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">JARVIS</p>
            <p className="text-[11px] text-slate-500">{statusLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-slate-400">
            {isOnline ? <Wifi className="h-3 w-3 text-emerald-400" aria-hidden="true" /> : <WifiOff className="h-3 w-3 text-rose-400" aria-hidden="true" />}
            {isOnline ? "Online" : "Offline"}
          </span>
          <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 font-semibold text-amber-200">LV {atlas.currentLevel}</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Bot className="h-10 w-10 text-cyan-400/40" aria-hidden="true" />
            <p className="text-sm text-slate-500">Ask JARVIS about your current state, goals, patterns, or achievements - grounded in real Atlas data.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTER_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => send(question)}
                  className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <JarvisMessageBubble key={message.id} message={message} onConfirmAction={confirmAction} onCancelAction={cancelAction} onConfirmPlan={confirmPlan} onCancelPlan={cancelPlan} />
          ))
        )}
        {status === "sending" ? (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-cyan-400/20 bg-slate-950/70 px-4 py-3">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <JarvisComposer disabled={false} isSending={status === "sending"} onSend={send} onStop={stop} onClear={reset} />
    </div>
  );
}
