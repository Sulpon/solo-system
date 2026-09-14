import CurrentQuestWidget from "../../(app)/_components/desktop/widgets/CurrentQuestWidget";
import PriorityWidget from "../../(app)/_components/desktop/widgets/PriorityWidget";
import XPWidget from "../../(app)/_components/desktop/widgets/XPWidget";

// Mirrors app/(app)/attributes/[attributeId]/page.tsx's exact pattern: an
// async server component awaiting `params`, delegating to the right client
// component. One parameterized route for all 3 new floating widgets
// (rather than a route-per-widget) so registry.ts stays the single place a
// future widget gets added - no new route/layout file needed alongside it,
// only a new registry entry and a new case here. "focus" is NOT one of
// these ids - it's still served by the existing /focus-companion route,
// unchanged.
export default async function Page({ params }: { params: Promise<{ widgetId: string }> }) {
  const { widgetId } = await params;

  switch (decodeURIComponent(widgetId)) {
    case "current-quest":
      return <CurrentQuestWidget />;
    case "priority":
      return <PriorityWidget />;
    case "xp":
      return <XPWidget />;
    default:
      return <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-xs text-slate-500">Unknown widget.</div>;
  }
}
