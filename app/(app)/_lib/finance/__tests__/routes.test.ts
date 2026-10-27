// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeClient, createFakeDatabase } from "./fixtures/fake-supabase";

// The HTTP layer: authentication is enforced on every finance route, and
// ids in the URL are validated before anything is queried.

const session = vi.hoisted(() => ({ userId: null as string | null }));

vi.mock("../../supabase/server", () => ({
  getSupabaseServerClient: async () => createFakeClient(createFakeDatabase(), session.userId),
}));

const { POST: uploadRoute } = await import("../../../../api/finance/imports/route");
const { DELETE: deleteRoute } = await import("../../../../api/finance/imports/[importId]/route");
const { POST: commitRoute } = await import("../../../../api/finance/imports/[importId]/commit/route");

const params = (importId: string) => ({ params: Promise.resolve({ importId }) });

describe("finance routes", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdefghijklmnop.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_publishable_0123456789abcdefghijklmnop");
    session.userId = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reject requests without a session", async () => {
    const form = new FormData();
    form.set("file", new File([new Uint8Array([37, 80, 68, 70, 45])], "a.pdf", { type: "application/pdf" }));

    const upload = await uploadRoute(new NextRequest("http://localhost/api/finance/imports", { method: "POST", body: form }));
    const remove = await deleteRoute(new NextRequest("http://localhost/api/finance/imports/x", { method: "DELETE" }), params("00000000-0000-4000-8000-000000000001"));
    const commit = await commitRoute(
      new NextRequest("http://localhost/api/finance/imports/x/commit", { method: "POST", body: "{}" }),
      params("00000000-0000-4000-8000-000000000001"),
    );

    for (const response of [upload, remove, commit]) {
      expect(response.status).toBe(401);
    }
  });

  it("report Finance as unavailable when Supabase is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://your-project-ref.supabase.co");
    session.userId = "user-1";
    const response = await deleteRoute(new NextRequest("http://localhost/api/finance/imports/x", { method: "DELETE" }), params("00000000-0000-4000-8000-000000000001"));
    expect(response.status).toBe(503);
  });

  it("treat a malformed id as not found without querying", async () => {
    session.userId = "user-1";
    const response = await deleteRoute(new NextRequest("http://localhost/api/finance/imports/x", { method: "DELETE" }), params("../../etc/passwd"));
    expect(response.status).toBe(404);
  });

  it("reject an upload with no file, and a non-PDF file, with a readable message", async () => {
    session.userId = "user-1";

    const empty = await uploadRoute(new NextRequest("http://localhost/api/finance/imports", { method: "POST", body: new FormData() }));
    expect(empty.status).toBe(400);

    const form = new FormData();
    form.set("file", new File(["not a pdf"], "statement.pdf", { type: "application/pdf" }));
    const response = await uploadRoute(new NextRequest("http://localhost/api/finance/imports", { method: "POST", body: form }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "invalid_file", message: "The file is named .pdf but its contents are not a PDF." } });
  });

  it("reject a malformed commit body", async () => {
    session.userId = "user-1";
    const response = await commitRoute(
      new NextRequest("http://localhost/api/finance/imports/x/commit", { method: "POST", body: JSON.stringify({ sections: "all" }) }),
      params("00000000-0000-4000-8000-000000000001"),
    );
    expect(response.status).toBe(400);
  });
});
