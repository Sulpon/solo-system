"use client";

import Card from "../Card";
import CareerHubBackLink from "../career/CareerHubBackLink";
import EditableStringList from "../EditableStringList";
import { useCareerVision } from "../../_lib/hooks/useCareerVision";
import { CAREER_VISION_ADVANTAGE_TITLES } from "../../_lib/types/career-vision";
import type { CareerVisionBackground, CompetitiveAdvantageId } from "../../_lib/types/career-vision";

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const backgroundFields: ReadonlyArray<{ key: keyof CareerVisionBackground; label: string; placeholder: string }> = [
  { key: "university", label: "University", placeholder: "e.g. Delft University of Technology" },
  { key: "degree", label: "Degree", placeholder: "e.g. MSc Chemical Engineering" },
  { key: "expectedGraduation", label: "Expected Graduation", placeholder: "e.g. June 2027" },
  { key: "location", label: "Location", placeholder: "e.g. Rotterdam, Netherlands" },
];

export default function CareerVisionPageClient() {
  const { careerVision, setCareerVision, hasLoaded } = useCareerVision();

  if (!hasLoaded) {
    return null;
  }

  function updateAdvantageDescription(id: CompetitiveAdvantageId, description: string) {
    setCareerVision((current) => ({
      ...current,
      identity: {
        ...current.identity,
        competitiveAdvantages: current.identity.competitiveAdvantages.map((advantage) => (advantage.id === id ? { ...advantage, description } : advantage)),
      },
    }));
  }

  function updateBackground(key: keyof CareerVisionBackground, value: string) {
    setCareerVision((current) => ({ ...current, background: { ...current.background, [key]: value } }));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <CareerHubBackLink />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Career Hub</p>
        <h1 className="mt-2 text-3xl font-black text-white">🎯 Career Vision</h1>
        <p className="mt-2 text-sm text-slate-400">Your professional identity, direction, and long-term career goals. Write it once, refine it as you grow.</p>
      </div>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Identity</p>
        <h2 className="mt-2 text-xl font-black text-white">Current Position</h2>
        <p className="mt-2 text-sm text-slate-400">A short description of your current professional status.</p>
        <textarea
          value={careerVision.identity.currentPosition}
          onChange={(event) => setCareerVision((current) => ({ ...current, identity: { ...current.identity, currentPosition: event.target.value } }))}
          className={inputClass + " mt-4 min-h-20"}
          placeholder="MSc Chemical Engineering student specializing in..."
        />
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Identity</p>
        <h2 className="mt-2 text-xl font-black text-white">Core Identity</h2>
        <p className="mt-2 text-sm text-slate-400">Who you are, your unique combination of skills, and the type of problems you solve.</p>
        <textarea
          value={careerVision.identity.coreIdentity}
          onChange={(event) => setCareerVision((current) => ({ ...current, identity: { ...current.identity, coreIdentity: event.target.value } }))}
          className={inputClass + " mt-4 min-h-24"}
          placeholder="I am a..."
        />
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Identity</p>
        <h2 className="mt-2 text-xl font-black text-white">Competitive Advantage</h2>
        <p className="mt-2 text-sm text-slate-400">The three pillars behind your professional edge.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {careerVision.identity.competitiveAdvantages.map((advantage) => (
            <div key={advantage.id} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
              <h3 className="font-bold text-white">{CAREER_VISION_ADVANTAGE_TITLES[advantage.id]}</h3>
              <textarea
                value={advantage.description}
                onChange={(event) => updateAdvantageDescription(advantage.id, event.target.value)}
                className={inputClass + " mt-3 min-h-28"}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Background</p>
        <h2 className="mt-2 text-xl font-black text-white">Background</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {backgroundFields.map((field) => (
            <label key={field.key} className="space-y-1.5">
              <span className={labelClass}>{field.label}</span>
              <input
                value={careerVision.background[field.key]}
                onChange={(event) => updateBackground(field.key, event.target.value)}
                className={inputClass}
                placeholder={field.placeholder}
              />
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Target Roles</p>
        <h2 className="mt-2 text-xl font-black text-white">Roles you&rsquo;re aiming for</h2>
        <p className="mt-2 text-sm text-slate-400">Add, edit, remove, and reorder the roles you&rsquo;d consider.</p>
        <div className="mt-4">
          <EditableStringList
            items={careerVision.targetRoles}
            onChange={(next) => setCareerVision((current) => ({ ...current, targetRoles: next }))}
            placeholder="Add a target role"
          />
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Career Priorities</p>
        <h2 className="mt-2 text-xl font-black text-white">What matters most, ranked</h2>
        <p className="mt-2 text-sm text-slate-400">Order top to bottom by importance to you right now.</p>
        <div className="mt-4">
          <EditableStringList
            items={careerVision.careerPriorities}
            onChange={(next) => setCareerVision((current) => ({ ...current, careerPriorities: next }))}
            placeholder="Add a priority"
          />
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Career Direction</p>
        <h2 className="mt-2 text-xl font-black text-white">Main Goal</h2>
        <p className="mt-2 text-sm text-slate-400">Your long-term career objective, in your own words.</p>
        <textarea
          value={careerVision.direction.mainGoal}
          onChange={(event) => setCareerVision((current) => ({ ...current, direction: { ...current.direction, mainGoal: event.target.value } }))}
          className={inputClass + " mt-4 min-h-32"}
        />
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Preferred Industries</p>
        <h2 className="mt-2 text-xl font-black text-white">Industries you&rsquo;d target</h2>
        <div className="mt-4">
          <EditableStringList
            items={careerVision.preferredIndustries}
            onChange={(next) => setCareerVision((current) => ({ ...current, preferredIndustries: next }))}
            placeholder="Add an industry"
          />
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Target Countries</p>
        <h2 className="mt-2 text-xl font-black text-white">Countries you&rsquo;d relocate to</h2>
        <div className="mt-4">
          <EditableStringList
            items={careerVision.targetCountries}
            onChange={(next) => setCareerVision((current) => ({ ...current, targetCountries: next }))}
            placeholder="Add a target country"
          />
        </div>
      </Card>
    </div>
  );
}
