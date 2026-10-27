import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FinanceSnapshot } from "../../../_lib/finance/repository/finance-repository";
import { CATEGORIES, account, categoryId, transaction } from "../../../_lib/finance/__tests__/helpers";

// Mounts the real Finance page against a fixed snapshot and walks every
// tab, so a wiring or render error anywhere in the module fails here.

const cloud = vi.hoisted(() => ({ user: { id: "user-1" } as { id: string } | null }));
const snapshotRef = vi.hoisted(() => ({ value: null as unknown }));

vi.mock("../../../_lib/hooks/useCloudSync", () => ({
  useCloudSync: () => ({ isCloudSyncAvailable: true, isAuthLoading: false, user: cloud.user, signInWithGoogle: vi.fn() }),
}));

vi.mock("../../../_lib/supabase/client", () => ({ getSupabaseBrowserClient: () => ({}) }));

vi.mock("../../../_lib/finance/repository/finance-repository", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../_lib/finance/repository/finance-repository")>();
  return {
    ...original,
    ensureDefaultCategories: vi.fn(async () => false),
    loadFinanceSnapshot: vi.fn(async () => snapshotRef.value),
  };
});

const { default: FinancePageClient } = await import("../FinancePageClient");

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function buildSnapshot(): FinanceSnapshot {
  const date = today();
  return {
    accounts: [account({ id: "acc-1", name: "Revolut EUR" }), account({ id: "acc-2", name: "Alatau KZT", bank: "alatau", currency: "KZT", accountIdentifier: "•••• 1111" })],
    categories: CATEGORIES,
    rules: [],
    transactions: [
      transaction({ id: "t1", bookedOn: date, merchant: "Spar", descriptionOriginal: "Spar · To: Despar, Padova", amountMinor: -1250, categoryId: categoryId("groceries"), reviewStatus: "confirmed" }),
      transaction({ id: "t2", bookedOn: date, merchant: "EXAMPLE CORP", descriptionOriginal: "Платеж от EXAMPLE CORP", amountMinor: 126200 }),
      transaction({ id: "t3", bookedOn: date, merchant: "iliad", descriptionOriginal: "iliad · To: Iliad Italia", amountMinor: -999, categoryId: categoryId("utilities"), reviewStatus: "confirmed" }),
      transaction({ id: "t4", bookedOn: date, accountId: "acc-2", currency: "KZT", merchant: "MOBILE BANK", descriptionOriginal: "Перевод · MOBILE BANK", amountMinor: -2000000 }),
    ],
    links: [],
    budgets: [{ id: "b1", categoryId: categoryId("groceries"), currency: "EUR", monthlyAmountMinor: 30000 }],
    imports: [
      { id: "i1", fileName: "account-statement.pdf", fileSize: 40000, fileType: "pdf", bank: "revolut", status: "committed", errorCode: null, errorMessage: null, committedAt: date, createdAt: date },
      { id: "i2", fileName: "kaspi.pdf", fileSize: 30000, fileType: "pdf", bank: null, status: "failed", errorCode: "unsupported_bank", errorMessage: "Kaspi Bank statements are not supported yet.", committedAt: null, createdAt: date },
    ],
    statements: [],
    requiredPayments: [
      { id: "p1", name: "Phone", dueDay: 28, matchPattern: "iliad", expectedAmountMinor: null, currency: null, amountTolerancePct: 5, accountId: null, isActive: true, sortOrder: 0 },
      { id: "p2", name: "Gym", dueDay: 1, matchPattern: null, expectedAmountMinor: 3500, currency: "EUR", amountTolerancePct: 5, accountId: null, isActive: true, sortOrder: 1 },
    ],
    requiredPaymentChecks: [],
  };
}

describe("Finance page", () => {
  beforeEach(() => {
    cloud.user = { id: "user-1" };
    snapshotRef.value = buildSnapshot();
  });

  it("asks for sign-in when there is no session", () => {
    cloud.user = null;
    render(<FinancePageClient />);
    expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeInTheDocument();
  });

  it("shows per-currency totals without mixing currencies", async () => {
    render(<FinancePageClient />);
    expect(await screen.findByText("Income · EUR")).toBeInTheDocument();
    expect(screen.getByText("Spending · KZT")).toBeInTheDocument();
    expect(screen.getAllByText("€1,262.00").length).toBeGreaterThan(0);
  });

  it("ticks off a required payment seen in a statement, and leaves the other open", async () => {
    render(<FinancePageClient />);
    const rail = (await screen.findByText("Required payments")).closest("section") as HTMLElement;
    expect(within(rail).getByText("Paid · seen in statement")).toBeInTheDocument();
    expect(within(rail).getByText("1 of 2 paid")).toBeInTheDocument();
    expect(within(rail).getByRole("checkbox", { name: /Phone paid/ })).toBeChecked();
    expect(within(rail).getByRole("checkbox", { name: /Gym paid/ })).not.toBeChecked();
  });

  it("renders every tab", async () => {
    const user = userEvent.setup();
    render(<FinancePageClient />);
    await screen.findByText("Income · EUR");

    await user.click(screen.getByRole("tab", { name: "Transactions" }));
    expect(await screen.findByRole("button", { name: "Export CSV" })).toBeInTheDocument();
    expect(screen.getByText("4 transactions")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Review/ }));
    expect(await screen.findByRole("heading", { name: "Needs review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Possible duplicates" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Import/ }));
    expect(await screen.findByText("Drop PDF or CSV statements here")).toBeInTheDocument();
    expect(screen.getByText("Kaspi Bank statements are not supported yet.")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Budgets" }));
    expect(await screen.findByRole("heading", { name: "Budget vs actual" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Categories & rules" }));
    expect(await screen.findByRole("heading", { name: "Rules" })).toBeInTheDocument();
  });

  it("explains how to finish setup when the tables do not exist", async () => {
    const repository = await import("../../../_lib/finance/repository/finance-repository");
    vi.mocked(repository.loadFinanceSnapshot).mockRejectedValueOnce(new repository.FinanceRepositoryError("Could not load accounts.", { code: "PGRST205" }));
    render(<FinancePageClient />);
    expect(await screen.findByText("Finance tables are not set up yet")).toBeInTheDocument();
  });
});
