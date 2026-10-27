import type { Direction } from "../types";

// Built-in categorisation knowledge: well-known merchants and the fixed
// phrases banks print for salaries, fees, cash and transfers.
//
// Deliberately conservative. A rule exists only where the text itself
// says what the money was for ("Starbucks", "Снятие наличных"); anything
// ambiguous ("Payment from <company>", a person's name) is left for the
// user, who can then teach Atlas with their own rule. User rules always
// run before these.
//
// Keywords are written in normalised form (lowercase, no accents, see
// text.ts) and match at the start of a word. Order matters: the first
// matching rule wins, so specific rules ("uber eats") sit above general
// ones ("uber").

export type BuiltinRule = Readonly<{
  id: string;
  categorySlug: string;
  keywords?: ReadonlyArray<string>;
  // Matched against the start of the normalised description.
  startsWith?: ReadonlyArray<string>;
  direction?: Direction;
  // Only for statements from these parsers.
  banks?: ReadonlyArray<string>;
}>;

const CURRENCY_CODES = ["eur", "usd", "gbp", "kzt", "chf", "pln", "czk", "huf", "try", "aed", "rub", "jpy", "cny"];

export const BUILTIN_RULES: ReadonlyArray<BuiltinRule> = [
  // --- Movements that are not income or spending -----------------------
  { id: "exchange", categorySlug: "currency-exchange", keywords: ["exchanged to", "exchanged from", "exchange to", "обмен валют", "конвертац", "конверсия"] },
  { id: "own-transfer-phrases", categorySlug: "own-transfers", keywords: ["перевод собственных средств", "между своими счетами", "между собственными счетами", "to own account", "transfer between own"] },
  // Revolut names vault and pocket movements "To EUR <vault>" / "From EUR <vault>".
  {
    id: "revolut-vault",
    categorySlug: "own-transfers",
    startsWith: CURRENCY_CODES.flatMap((code) => [`to ${code} `, `from ${code} `]),
    banks: ["revolut"],
  },

  // --- Bank-printed phrases -------------------------------------------
  { id: "cash", categorySlug: "cash", keywords: ["снятие наличных", "cash withdrawal", "atm withdrawal", "банкомат"], direction: "out" },
  { id: "cash-operation", categorySlug: "cash", startsWith: ["снятие "], direction: "out" },
  { id: "fees", categorySlug: "bank-fees", keywords: ["комиссия за", "bank fee", "plan fee", "monthly fee", "service charge", "account fee", "overdraft fee"], direction: "out" },
  { id: "fee-operation", categorySlug: "bank-fees", startsWith: ["комиссия "], direction: "out" },
  { id: "salary", categorySlug: "salary", keywords: ["зачисление зарплаты", "заработн", "зарплат", "salary", "payroll"], direction: "in" },
  { id: "refunds", categorySlug: "refunds", keywords: ["refund", "возврат", "chargeback"], direction: "in" },
  { id: "card-repayment", categorySlug: "card-repayment", keywords: ["credit card repayment", "погашение кредитной карты"], direction: "out" },
  { id: "loans", categorySlug: "debt-payments", keywords: ["погашение кредит", "погашение займа", "loan repayment", "рассрочк", "installment payment"], direction: "out" },

  // --- Person-to-person transfers (Revolut wording) -------------------
  { id: "p2p-out-en", categorySlug: "transfers-sent", startsWith: ["to "], direction: "out", banks: ["revolut"] },
  { id: "p2p-out-ru", categorySlug: "transfers-sent", startsWith: ["перевод получатель", "revolut bank uab"], direction: "out", banks: ["revolut"] },
  { id: "p2p-in-en", categorySlug: "transfers-received", startsWith: ["from "], direction: "in", banks: ["revolut"] },
  { id: "p2p-in-ru", categorySlug: "transfers-received", startsWith: ["revolut bank uab", "перевод отправитель"], direction: "in", banks: ["revolut"] },
  { id: "p2p-phone", categorySlug: "transfers-sent", keywords: ["перевод клиенту", "по номеру телефона"], direction: "out" },

  // --- Merchants -------------------------------------------------------
  { id: "food-delivery", categorySlug: "restaurants", keywords: ["uber eats", "bolt food", "glovo", "wolt", "deliveroo", "just eat", "justeat", "яндекс еда", "chocofood", "foodpanda"] },
  {
    id: "coffee",
    categorySlug: "coffee",
    keywords: ["starbucks", "costa coffee", "coffee", "кофе", "кофейн", "caffe", "cafe", "espresso", "selecta", "tim hortons", "dunkin"],
  },
  {
    id: "groceries",
    categorySlug: "groceries",
    keywords: [
      "supermarket", "supermercat", "supermarche", "grocery", "продукты", "супермаркет",
      "spar", "despar", "eurospar", "interspar", "lidl", "aldi", "esselunga", "conad", "coop", "carrefour", "pam panorama", "pam",
      "in s mercato", "aliper", "famila", "tesco", "billa", "albert", "penny", "kaufland", "auchan", "ашан", "rewe", "edeka", "netto",
      "mercadona", "monoprix", "franprix", "magnum", "магнум", "galmart", "small market", "frutta",
    ],
  },
  {
    id: "restaurants",
    categorySlug: "restaurants",
    keywords: [
      "restaurant", "ristorante", "restaurace", "ресторан", "pizzeria", "pizza", "trattoria", "osteria", "sushi", "burger", "mcdonald",
      "kfc", "doner", "kebab", "bistro", "takeaway", "dodo pizza", "пицц",
    ],
  },
  {
    id: "transport",
    categorySlug: "transport",
    keywords: [
      "atac", "mycicero", "ridemovi", "dpmb", "dopravni podnik", "trenitalia", "busitalia", "tper", "uber", "bolt", "yandex go", "яндекс go",
      "яндекс такси", "taxi", "такси", "lime", "dott", "metropolitana", "onay", "parking", "parcheggio", "autostrade", "telepass", "eni station", "q8",
    ],
  },
  {
    id: "travel",
    categorySlug: "travel",
    keywords: [
      "booking com", "airbnb", "hotel", "hostel", "ryanair", "wizz air", "wizzair", "easyjet", "air astana", "flyarystan", "lufthansa",
      "turkish airlines", "flixbus", "italo", "trainline", "omio", "expedia", "agoda", "skyscanner",
    ],
  },
  { id: "housing", categorySlug: "housing", keywords: ["rent", "аренда", "affitto", "landlord", "квартплат"], direction: "out" },
  {
    id: "utilities",
    categorySlug: "utilities",
    keywords: [
      "iliad", "vodafone", "tim", "windtre", "wind tre", "fastweb", "kcell", "beeline", "tele2", "altel", "activ", "kazakhtelecom",
      "enel", "hera", "a2a", "iren", "коммунал", "электроэнерг", "водоканал", "алсеко", "electricity",
    ],
  },
  {
    id: "subscriptions",
    categorySlug: "subscriptions",
    keywords: [
      "netflix", "spotify", "apple com bill", "itunes", "youtube", "openai", "chatgpt", "anthropic", "claude ai", "github", "notion",
      "adobe", "microsoft", "dropbox", "icloud", "tradingview", "canva", "figma", "jetbrains", "1password", "patreon", "tribute",
      "telegram premium", "yandex plus", "яндекс плюс", "disney plus", "hbo max",
    ],
  },
  { id: "education", categorySlug: "education", keywords: ["udemy", "coursera", "duolingo", "skillshare", "tuition", "universita", "university", "университет"] },
  {
    id: "health",
    categorySlug: "health",
    keywords: ["pharmacy", "farmacia", "аптека", "lekarna", "apotheke", "dentist", "стоматолог", "clinic", "клиника", "hospital", "ospedale", "barber", "барбершоп", "parrucchiere"],
  },
  { id: "fitness", categorySlug: "fitness", keywords: ["gym", "palestra", "fitness", "фитнес", "decathlon", "sport", "спортзал"] },
  {
    id: "entertainment",
    categorySlug: "entertainment",
    keywords: ["cinema", "kino", "кинотеатр", "steam", "playstation", "xbox", "nintendo", "kinguin", "ticketmaster", "museum", "museo", "theatre", "teatro", "concert"],
  },
  {
    id: "shopping",
    categorySlug: "shopping",
    keywords: [
      "zara", "h m", "uniqlo", "primark", "moda", "amazon", "aliexpress", "wildberries", "ozon", "ikea", "mediaworld", "mediamarkt", "ovs",
      "bershka", "pull bear", "mango", "lc waikiki", "shein", "temu", "zalando", "nike", "adidas",
    ],
  },
];
