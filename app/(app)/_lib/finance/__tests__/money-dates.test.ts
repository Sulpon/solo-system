import { describe, expect, it } from "vitest";
import { addDays, daysBetween, endOfMonth, monthsInRange, parseAnyDate, parseEnglishDate, parseNumericDate, parsePeriodSentence, parseRussianDate } from "../dates";
import { formatMoney, minorToMajorString, parseAmount } from "../money";
import { cleanMerchantName, containsKeyword, maskAccountNumber, normalizeMerchant, normalizeText } from "../text";

describe("parseAmount", () => {
  it.each([
    ["€1,500.00", 150000, "EUR"],
    ["€2,256.37", 225637, "EUR"],
    ["1 115,48€", 111548, "EUR"],
    ["0,45€", 45, "EUR"],
    ["15 707.13", 1570713, null],
    ["36 660", 3666000, null],
    ["1.234,56", 123456, null],
    ["1,500", 150000, null],
    ["1.005", 100500, null],
    ["1,234,567.89", 123456789, null],
    ["12.5", 1250, null],
    ["19,85$", 1985, "USD"],
    ["10 287,00 KZT", 1028700, "KZT"],
    ["2 500,00 ₸", 250000, "KZT"],
    ["1 234,00 €", 123400, "EUR"],
  ])("reads %s", (text, minor, currency) => {
    expect(parseAmount(text)).toEqual({ minor, currency });
  });

  it.each([
    ["-12.00", -1200],
    ["−12.00", -1200],
    ["+ 50 000,00 ₸", 5000000],
    ["(12.00)", -1200],
    ["12.00-", -1200],
    ["- 2 500,00 ₸", -250000],
  ])("applies the sign in %s", (text, minor) => {
    expect(parseAmount(text)?.minor).toBe(minor);
  });

  it.each(["", "abc", "12..00", "1.0050", "12,3456", "€", "12,", "Nov 1, 2024"])("refuses %j rather than guessing", (text) => {
    expect(parseAmount(text)).toBeNull();
  });

  it("uses the fallback currency only when the text has none", () => {
    expect(parseAmount("12.00", "KZT")).toEqual({ minor: 1200, currency: "KZT" });
    expect(parseAmount("€12.00", "KZT")).toEqual({ minor: 1200, currency: "EUR" });
  });

  it("respects zero-decimal currencies", () => {
    expect(parseAmount("1,500", "JPY")?.minor).toBe(1500);
  });
});

describe("minor units", () => {
  it("round-trips to a major string without floating point", () => {
    expect(minorToMajorString(1570713, "KZT")).toBe("15707.13");
    expect(minorToMajorString(-45, "EUR")).toBe("-0.45");
    expect(minorToMajorString(5, "EUR")).toBe("0.05");
    expect(minorToMajorString(1500, "JPY")).toBe("1500");
  });

  it("formats with the currency", () => {
    expect(formatMoney(-1250, "EUR")).toBe("-€12.50");
    expect(formatMoney(1250, "EUR", { signed: true })).toBe("+€12.50");
  });
});

describe("dates", () => {
  it.each([
    ["25.07.2023", "2023-07-25"],
    ["01.09.24", "2024-09-01"],
    ["2023-07-25", "2023-07-25"],
    ["25/07/2023", "2023-07-25"],
  ])("reads numeric %s", (text, iso) => {
    expect(parseNumericDate(text)).toBe(iso);
  });

  it("honours the requested numeric order", () => {
    expect(parseNumericDate("07/25/2023", "mdy")).toBe("2023-07-25");
    expect(parseNumericDate("07/25/2023", "dmy")).toBeNull();
  });

  it("rejects impossible dates", () => {
    expect(parseNumericDate("31.02.2024")).toBeNull();
    expect(parseNumericDate("29.02.2023")).toBeNull();
    expect(parseNumericDate("29.02.2024")).toBe("2024-02-29");
  });

  it("reads English and Russian month names", () => {
    expect(parseEnglishDate("Nov 1, 2024")).toBe("2024-11-01");
    expect(parseEnglishDate("December 15, 2024")).toBe("2024-12-15");
    expect(parseEnglishDate("1 Nov 2024")).toBe("2024-11-01");
    expect(parseRussianDate("1 окт. 2026г.")).toBe("2026-10-01");
    expect(parseRussianDate("3 мая 2026г.")).toBe("2026-05-03");
    expect(parseRussianDate("5 июн. 2026г.")).toBe("2026-06-05");
    expect(parseRussianDate("27 октября 2026 г.")).toBe("2026-10-27");
    expect(parseAnyDate("Dec 31, 2024")).toBe("2024-12-31");
  });

  it("reads statement period sentences", () => {
    expect(parsePeriodSentence("Account transactions from November 1, 2024 to November 30, 2024")).toEqual({ start: "2024-11-01", end: "2024-11-30" });
    expect(parsePeriodSentence("Операции по счету с 1 октября 2026г. по 27 октября 2026г.")).toEqual({ start: "2026-10-01", end: "2026-10-27" });
    expect(parsePeriodSentence("Отклоненные операции 1 октября 2026г. – 27 октября 2026г.")).toEqual({ start: "2026-10-01", end: "2026-10-27" });
    expect(parsePeriodSentence("01.01.2023 - 31.12.2023")).toEqual({ start: "2023-01-01", end: "2023-12-31" });
  });

  it("handles month and year boundaries", () => {
    expect(addDays("2024-12-31", 1)).toBe("2025-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
    expect(endOfMonth("2023-02")).toBe("2023-02-28");
    expect(monthsInRange("2024-11-15", "2025-02-01")).toEqual(["2024-11", "2024-12", "2025-01", "2025-02"]);
  });
});

describe("text", () => {
  it("normalises accents, case and punctuation", () => {
    expect(normalizeText("Alí & Alíper")).toBe("ali aliper");
    expect(normalizeText("Перевод, получатель: Ёлка")).toBe("перевод получатель елка");
  });

  it("collapses store numbers so branches are one merchant", () => {
    expect(normalizeMerchant("Delikomat Cz 47493")).toBe(normalizeMerchant("Delikomat Cz 50341"));
    expect(normalizeMerchant("Nyx*brucospolsro")).toBe("brucospolsro");
  });

  it("matches keywords at word starts only", () => {
    expect(containsKeyword("public transport", "sport")).toBe(false);
    expect(containsKeyword("decathlon sport", "sport")).toBe(true);
    expect(containsKeyword("mcdonalds milano", "mcdonald")).toBe(true);
    expect(containsKeyword("sparkasse", "spar")).toBe(false);
    expect(containsKeyword("spar padova", "spar")).toBe(true);
  });

  it("never keeps a full account number", () => {
    expect(maskAccountNumber("LT000000000000001234")).toBe("•••• 1234");
    expect(cleanMerchantName("Перевод собственных средств на счет KZ67998BTB0001400239")).toBe("Перевод собственных средств на счет");
  });
});
