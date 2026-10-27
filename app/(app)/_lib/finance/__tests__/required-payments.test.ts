import { describe, expect, it } from "vitest";
import { dueDateFor, resolveAllRequiredPayments, resolveRequiredPaymentStatus } from "../required-payments";
import type { RequiredPayment, RequiredPaymentCheck } from "../types";
import { transaction } from "./helpers";

const payment = (overrides: Partial<RequiredPayment> = {}): RequiredPayment => ({
  id: "pay-rent",
  name: "Rent",
  dueDay: 5,
  matchPattern: "Example Landlord",
  expectedAmountMinor: null,
  currency: null,
  amountTolerancePct: 5,
  accountId: null,
  isActive: true,
  sortOrder: 0,
  ...overrides,
});

const check = (status: "paid" | "unpaid", periodMonth = "2026-10-01"): RequiredPaymentCheck => ({ id: "c1", requiredPaymentId: "pay-rent", periodMonth, status, checkedAt: "2026-10-02T00:00:00Z" });

const rentPaid = transaction({ bookedOn: "2026-10-03", amountMinor: -60000, merchant: "Example Landlord", descriptionOriginal: "To Example Landlord" });

describe("required payments", () => {
  it("clamps the due day to the month's length", () => {
    expect(dueDateFor({ dueDay: 31 }, "2026-02")).toBe("2026-02-28");
    expect(dueDateFor({ dueDay: 31 }, "2024-02")).toBe("2024-02-29");
    expect(dueDateFor({ dueDay: 31 }, "2026-04")).toBe("2026-04-30");
  });

  it("ticks itself off when an imported statement shows the payment that month", () => {
    const status = resolveRequiredPaymentStatus(payment(), "2026-10", [rentPaid], [], "2026-10-10");
    expect(status).toMatchObject({ isPaid: true, source: "statement", urgency: "paid" });
    expect(status.matchedTransaction?.id).toBe(rentPaid.id);
  });

  it("ignores matches from other months and incoming money", () => {
    const lastMonth = { ...rentPaid, bookedOn: "2026-09-30" };
    const refund = { ...rentPaid, amountMinor: 60000 };
    expect(resolveRequiredPaymentStatus(payment(), "2026-10", [lastMonth, refund], [], "2026-10-03").isPaid).toBe(false);
  });

  it("requires the amount to be within tolerance when one is set", () => {
    expect(resolveRequiredPaymentStatus(payment({ expectedAmountMinor: 60000, currency: "EUR" }), "2026-10", [rentPaid], [], "2026-10-10").isPaid).toBe(true);
    expect(resolveRequiredPaymentStatus(payment({ expectedAmountMinor: 80000, currency: "EUR" }), "2026-10", [rentPaid], [], "2026-10-10").isPaid).toBe(false);
  });

  it("lets a manual check override the statements both ways", () => {
    expect(resolveRequiredPaymentStatus(payment(), "2026-10", [], [check("paid")], "2026-10-10")).toMatchObject({ isPaid: true, source: "manual" });
    const rejected = resolveRequiredPaymentStatus(payment(), "2026-10", [rentPaid], [check("unpaid")], "2026-10-10");
    expect(rejected).toMatchObject({ isPaid: false, source: "manual", matchedTransaction: null });
    expect(rejected.rejectedMatch?.id).toBe(rentPaid.id);
  });

  it("works with manual checks only when no match text is set", () => {
    expect(resolveRequiredPaymentStatus(payment({ matchPattern: null }), "2026-10", [rentPaid], [], "2026-10-10").isPaid).toBe(false);
  });

  it("reports urgency against the deadline", () => {
    const at = (today: string) => resolveRequiredPaymentStatus(payment(), "2026-10", [], [], today).urgency;
    expect(at("2026-10-01")).toBe("upcoming");
    expect(at("2026-10-03")).toBe("due-soon");
    expect(at("2026-10-05")).toBe("due-today");
    expect(at("2026-10-06")).toBe("overdue");
  });

  it("orders overdue first and hides inactive payments", () => {
    const statuses = resolveAllRequiredPayments(
      [payment({ id: "a", name: "Phone", dueDay: 20 }), payment({ id: "b", name: "Rent", dueDay: 1 }), payment({ id: "c", name: "Old", isActive: false })],
      "2026-10",
      [],
      [],
      "2026-10-10",
    );
    expect(statuses.map((status) => status.payment.name)).toEqual(["Rent", "Phone"]);
  });
});
