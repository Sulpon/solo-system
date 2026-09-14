import { getApplicationById, resolveApplication } from "../os/application-registry";
import { launchApplication } from "../desktop/os-launcher";
import type { JarvisActionProposal, JarvisActionResult, JarvisActionPreviewField, LLMToolDefinition } from "./types";

// Phase 19 - Atlas OS v1's OS actions, the sibling of actions.ts's Atlas
// (data-mutation) actions under the SAME JarvisActionProposal/
// JarvisActionResult contract, the SAME confirm-card UI, and the SAME
// Phase 16/18 plan engine - kept in its own file only because it's a
// genuinely different domain (native desktop control, not Atlas state),
// not a second action architecture. Exactly one action exists this phase:
// open_application. Future OS actions (focus_application,
// close_application, open_url, open_file, ...) would each get their own
// build*/execute* pair here, reusing this same pattern.
//
// The model NEVER supplies a path, executable, or command - only an
// `applicationId`, which is resolved against the controlled registry
// (_lib/os/application-registry.ts). An unresolvable id builds no
// proposal at all (returns null, exactly like actions.ts's build*
// functions do for an unrecognized Atlas entity) - there is no fallback
// that invents or guesses an application.

export const JARVIS_OS_ACTION_TOOLS: ReadonlyArray<LLMToolDefinition> = [
  {
    name: "propose_open_application",
    description:
      "Propose opening a real, registered desktop application by its id, display name, or a known alias (e.g. 'chrome', 'Google Chrome', 'vscode'). Only works for applications Atlas has registered - call list_supported_applications first if unsure what's supported. Never executes by itself - only creates a proposal the user must explicitly confirm. Desktop-only - requires Atlas Desktop.",
    inputSchema: {
      type: "object",
      properties: { applicationId: { type: "string", description: "The application's registered id, display name, or alias." } },
      required: ["applicationId"],
    },
  },
];

export type OpenApplicationPayload = Readonly<{ applicationId: string }>;

export function buildOpenApplicationProposal(args: Readonly<{ applicationId?: string }>): JarvisActionProposal | null {
  const entry = getApplicationById(args.applicationId ?? "") ?? resolveApplication(args.applicationId);
  if (!entry) return null;

  const preview: JarvisActionPreviewField[] = [
    { label: "Action", before: null, after: "Open application" },
    { label: "Application", before: null, after: entry.name },
  ];

  return {
    id: `action:open_application:${entry.id}`,
    actionType: "open_application",
    summary: `Open ${entry.name}`,
    preview,
    payload: { applicationId: entry.id },
    sourceTool: "propose_open_application",
    sourceArgs: args,
  };
}

// Reuses launchApplication - the exact OS Capability Layer function the
// rest of Atlas would use for this too (there is no second launch path).
// Never reports success unless the native command itself did.
export async function executeOpenApplicationAction(proposal: JarvisActionProposal): Promise<JarvisActionResult> {
  const payload = proposal.payload as OpenApplicationPayload;
  const result = await launchApplication(payload.applicationId);

  if (!result.success) {
    return { ok: false, message: result.message, verified: [] };
  }

  return { ok: true, message: `${result.applicationName} opened.`, verified: [{ label: "Application", before: null, after: result.applicationName }] };
}
