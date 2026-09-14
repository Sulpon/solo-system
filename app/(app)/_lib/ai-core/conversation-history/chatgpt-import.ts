import type { ConversationParticipant, ConversationRecord, ConversationRecordMessage } from "./types";

// Phase 20 Objective H - normalizes a user-provided ChatGPT data export
// (the real, documented `conversations.json` file from ChatGPT's own
// "Export data" feature - Settings -> Data controls -> Export) into Atlas's
// own ConversationRecord shape.
//
// IMPORTANT (Objective H's own explicit constraint): this reads a file the
// USER explicitly exported and provided - it does NOT and CANNOT access
// ChatGPT's live account, servers, or any runtime memory. There is no such
// capability, and none is implied here.
//
// The real export shape (audited against OpenAI's documented format,
// unchanged for years): a JSON array of conversation objects, each with a
// `mapping` - an adjacency-list tree of message nodes (id -> {message,
// parent, children}), rooted at a synthetic node with `message: null`, and
// a `current_node` pointing at the tip of the conversation as last viewed.
// Real exports commonly include branches (edited/regenerated messages) as
// sibling subtrees - this importer deliberately reconstructs only the
// SINGLE active path (root -> current_node, via `parent` links), which is
// the same conversation ChatGPT's own UI shows by default. Reconstructing
// every branch is a real, documented limitation, not a bug - see the
// module comment in candidate-extraction.ts.

type RawMessageNode = Readonly<{
  message?: Readonly<{
    author?: Readonly<{ role?: string }>;
    content?: Readonly<{ content_type?: string; parts?: ReadonlyArray<unknown> }>;
    create_time?: number | null;
  }> | null;
  parent?: string | null;
}>;

type RawConversation = Readonly<{
  title?: string;
  create_time?: number;
  mapping?: Readonly<Record<string, RawMessageNode>>;
  current_node?: string;
  conversation_id?: string;
  id?: string;
}>;

function toIsoOrNull(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function isParticipantRole(role: unknown): role is ConversationParticipant {
  return role === "user" || role === "assistant" || role === "system";
}

function extractText(parts: ReadonlyArray<unknown> | undefined): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((part): part is string => typeof part === "string")
    .join("\n")
    .trim();
}

// Walks parent links from current_node back to the root, then reverses -
// the same linear-history reconstruction ChatGPT's own default view uses.
// Defensive against a cycle or a missing node (both would indicate a
// malformed export, never crash the whole import over one conversation).
function walkActivePath(mapping: Readonly<Record<string, RawMessageNode>>, currentNode: string | undefined): ConversationRecordMessage[] {
  if (!currentNode) return [];
  const messages: ConversationRecordMessage[] = [];
  const visited = new Set<string>();
  let nodeId: string | null = currentNode;

  while (nodeId && mapping[nodeId] && !visited.has(nodeId)) {
    visited.add(nodeId);
    const node: RawMessageNode = mapping[nodeId];
    const role = node.message?.author?.role;
    const text = extractText(node.message?.content?.parts);

    if (isParticipantRole(role) && text.length > 0) {
      messages.push({ role, content: text, timestamp: toIsoOrNull(node.message?.create_time) });
    }

    nodeId = node.parent ?? null;
  }

  return messages.reverse();
}

function normalizeOne(raw: RawConversation, index: number): ConversationRecord | null {
  if (!raw || typeof raw !== "object" || !raw.mapping || typeof raw.mapping !== "object") return null;

  const messages = walkActivePath(raw.mapping, raw.current_node);
  if (messages.length === 0) return null;

  const conversationId = raw.conversation_id ?? raw.id ?? `unknown-${index}`;
  const participants = [...new Set(messages.map((message) => message.role))];

  return {
    id: `chatgpt-import-${conversationId}`,
    source: "chatgpt_export",
    conversationId,
    title: (raw.title ?? "").trim() || "Untitled conversation",
    createdAt: toIsoOrNull(raw.create_time) ?? new Date(0).toISOString(),
    messages,
    participants,
    metadata: { nodeCount: Object.keys(raw.mapping).length },
  };
}

// Never throws - an unrecognized or partially-malformed export normalizes
// to as many valid ConversationRecords as it safely can, skipping entries
// it can't make sense of, rather than failing the whole import.
export function normalizeChatGptExport(raw: unknown): ConversationRecord[] {
  if (!Array.isArray(raw)) return [];

  const records: ConversationRecord[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    try {
      const record = normalizeOne(raw[index] as RawConversation, index);
      if (record) records.push(record);
    } catch {
      // Skip this one entry defensively - one malformed conversation must
      // never fail the entire import.
    }
  }
  return records;
}
