// Sanitised statement fixtures.
//
// Each reproduces the exact LAYOUT of a real statement the parsers were
// verified against - column x positions, section order, page breaks,
// footer text, detail lines - with every name, IBAN, card number and
// amount replaced by invented values. Format: "[x]text" items per line,
// "=== PAGE n" between pages (see pdf/lines.ts documentFromMarkup).

const REVOLUT_EN_FOOTER = `[76]Report lost or stolen card [179]Revolut Bank UAB is a credit institution licensed in the Republic of Lithuania with company number 000000000 and authorization code
[179]LB000000, and whose registered office is at Example ave. 1, Vilnius, the Republic of Lithuania. We are licensed and
[76]+370 0 000 0000 [179]regulated by the Bank of Lithuania and the European Central Bank.
[76]Get help directly In app
[76]Scan the QR code [179]www.example.lt [232]. If you have any questions, please reach out to us via the in-app chat in the Revolut app.`;

// Opening €100.00, out €101.31, in €50.00, closing €48.69. Includes a
// pending and a reverted section (both must be ignored), a fee line, a
// foreign-currency card payment, two identical vending purchases, a
// vault top-up and a page break with repeated header and legal footer.
export const REVOLUT_EN = `=== PAGE 1
[418]EUR Statement
[455]Generated on Dec 15, 2024
[490]Revolut Bank UAB
[40]ALEX EXAMPLE
[40]Example Street 1 [353]IBAN [376]LT000000000000001234
[40]00000 [353]BIC [376]REVOLT21
[40]Balance summary
[526]Closing
[43]Product [253]Opening balance [335]Money out [417]Money in
[527]balance
[43]Account (Current Account) [253]€100.00 [335]€101.31 [417]€50.00 [526]€48.69
[43]Personal and Group Vaults [253]€0.00 [335]€0.00 [417]€50.00 [526]€50.00
[43]Total [253]€100.00 [335]€101.31 [417]€100.00 [526]€98.69
[40]The balance on your statement might differ from the balance shown in your app, which accounts for pending transactions.
[40]Pending from November 1, 2024 to November 30, 2024
[43]Start date [125]Description [335]Money out [417]Money in
[43]Nov 30, 2024 [125]Pending Shop [335]€99.00
[125]To: Pending Shop, Padova
[40]Account transactions from November 1, 2024 to November 30, 2024
[43]Date [125]Description [335]Money out [417]Money in [526]Balance
[43]Nov 1, 2024 [125]To JOHN EXAMPLE [335]€7.00 [535]€93.00
[125]To: JOHN EXAMPLE
[43]Nov 1, 2024 [125]Jane Example [417]€50.00 [526]€143.00
[125]From: Jane Example, Almaty
[125]Card: 400000******1234
[43]Nov 2, 2024 [125]Spar [335]€12.50 [526]€130.50
[125]To: Despar, Padova
[125]Card: 400000******1234
[43]Nov 2, 2024 [125]Selecta [335]€0.40 [526]€130.10
[125]To: Example Vending S.p.a., Reggio Emilia
[43]Nov 2, 2024 [125]Selecta [335]€0.40 [526]€129.70
[125]To: Example Vending S.p.a., Reggio Emilia
${REVOLUT_EN_FOOTER}
[40]© 2024 Revolut Bank UAB [495]Page [516]1 [523]of [532]2
=== PAGE 2
[418]EUR Statement
[455]Generated on Dec 15, 2024
[490]Revolut Bank UAB
[43]Date [125]Description [335]Money out [417]Money in [526]Balance
[43]Nov 3, 2024 [125]Cash withdrawal at Example ATM [335]€21.00 [526]€108.70
[125]Fee: €1.00 [335]€20.00
[125]To: Example ATM, Padova
[43]Nov 4, 2024 [125]Pizzeria Example [335]€10.01 [535]€98.69
[125]Revolut Rate €1.00 = 24.24 CZK (ECB rate €1.00 = 24.34 CZK) [335]240.00 CZK
[125]To: Pizzeria Example, Brno
[43]Nov 5, 2024 [125]To EUR Rent [335]€50.00 [535]€48.69
[40]Reverted from November 1, 2024 to November 30, 2024
[43]Start date [125]Description [335]Money out [417]Money in
[43]Nov 18, 2024 [125]Selecta [335]€0.40
[125]To: Example Vending S.p.a., Reggio Emilia
[40]Personal and Group Vaults transactions from November 1, 2024 to November 30, 2024
[43]Date [125]Description [335]Money out [417]Money in [526]Balance
[43]Nov 5, 2024 [125]To EUR Rent [417]€50.00 [526]€50.00
${REVOLUT_EN_FOOTER}
[40]© 2024 Revolut Bank UAB [495]Page [516]2 [523]of [532]2`;

// Russian export: comma decimals, space thousands, symbol after the
// number, "Остаток средств" split over two header lines, pending and
// declined sections. Opening 10,00€, out 58,00€, in 1 262,00€, closing
// 1 214,00€.
export const REVOLUT_RU = `=== PAGE 1
[386]Выписка для EUR
[441]Дата выписки: 27 окт. 2026г.
[490]Revolut Bank UAB
[40]ALEX EXAMPLE
[40]Example Street 1 [353]IBAN [387]LT000000000000005678
[40]Сведения о балансе
[514]Конечный
[43]Продукт [253]Начальный баланс [335]Списания [417]Пополнения
[528]баланс
[43]Счет (текущий счет) [253]10,00€ [335]58,00€ [417]1 262,00€ [531]1 214,00€
[43]Итого [253]10,00€ [335]58,00€ [417]1 262,00€ [531]1 214,00€
[40]Остаток средств в выписке может отличаться от остатка в приложении, учитывающий
[40]операции в статусе ожидания.
[40]В статусе ожидания с 1 октября 2026г. по 27 октября 2026г.
[43]Дата начала [125]Описание [335]Списания [417]Пополнения
[43]26 окт. 2026г. [125]cafe+co [335]1,04€
[125]Курс Revolut 1,00€ = 24,24 CZK (курс ECB * 1,00€ = 24,32 CZK) [335]25,00 CZK
[40]Операции по счету с 1 октября 2026г. по 27 октября 2026г.
[522]Остаток
[43]Дата [125]Описание [335]Списания [417]Пополнения
[524]средств
[43]1 окт. 2026г. [125]Atac [335]3,00€ [526]7,00€
[125]Получатель: Atac Tap&go, Roma
[125]Карта: 400000******5678
[43]2 окт. 2026г. [125]Платеж от EXAMPLE CORP [417]1 262,00€ [526]1 269,00€
[125]Реквизиты: EXAMPLE PAYOUTS
[125]Отправитель: EXAMPLE CORP, IE00TEST00000000000000
[43]3 окт. 2026г. [125]Перевод, получатель: JOHN EXAMPLE [335]55,00€ [526]1 214,00€
[125]Реквизиты: To John E
[125]Получатель: JOHN EXAMPLE
[40]Отклоненные операции 1 октября 2026г. – 27 октября 2026г.
[43]Дата начала [125]Описание [335]Списания [417]Пополнения
[43]27 окт. 2026г. [125]Tradingview [335]15,58€
[40]© 2026 Revolut Bank UAB [489]Страница [529]1 [535]из [546]1`;

// Alatau City Bank multi-currency card statement. KZT: opening 1 000,
// in 50 000, out 20 000 + 15 707.13 + 150, closing 15 142.87; lines
// newest first; a transfer and its fee share one reference; a EUR card
// purchase debited in KZT. USD: empty. EUR: a purchase and its reversal,
// with the bank's own summary counting both as purchases.
export const ALATAU = `=== PAGE 1
[422]АО "Alatau City Bank"
[422]БИК: TSESKZKA Сайт: alataucitybank.kz
[37]Дата: [63]22.08.2025 10:28
[37]Выписка: [82]Карта
[37]За период: [88]01.04.2023 - 31.05.2023
[37]ФИО: [63]EXAMPLE ALEX
[37]Номер карточки: [114]400000******0000
[38]KZ00000PB00000001111 [225]KZT
[38]Остаток на [89]01.04.2023
[226]1 000
[38](дата начала выписки)
[38]Пополнения [226]50 000
[38]Переводы [226]20 000
[38]Покупки [226]15 707.13
[38]Снятия [226]0
[38]Комиссия [226]150
[38]Прочие [226]0
[38]Остаток на [89]31.05.2023
[226]15 142.87
[38](дата формирования выписки)
[38]Сумма в обработке на [140]22.08.2025 [226]0
=== PAGE 2
[38](дата формирования выписки)
[38]Общий остаток на [122]22.08.2025
[226]99.99
[36]Транзакции по счету: KZ00000PB00000001111 KZT
[592]Валюта [640]Приход в валюте [725]Расход в валюте
[64]Дата [130]Операция [328]Детали [525]Сумма
[588]операции [666]счета [751]счета
[50]23.05.2023 [130]Комиссия [194]Комиссия за перевод [533]150 [601]KZT [676]0 [756]150
[194]Референс: REF0001
[194]Код авторизации: 000001
[50]23.05.2023 [132]Перевод [194]MOBILE BANK [525]20 000 [601]KZT [676]0 [748]20 000
[194]Референс: REF0001
[194]Код авторизации: 000001
[50]28.04.2023 [133]Покупка [194]PUBBLICA AMMINISTRAZIONE [528]30.95 [601]EUR [676]0 [743]15 707.13
[194]Код авторизации: 000002
[50]20.04.2023 [124]Пополнение [194]Зачисление зарплаты: popolnenie(1234567890123456) [525]50 000 [601]KZT [663]50 000 [760]0
=== PAGE 3
[38]KZ00000PB00000002222 [225]USD
[38]Остаток на [89]01.04.2023
[226]0
[38]Пополнения [226]0
[38]Остаток на [89]31.05.2023
[226]0
[38]Сумма в обработке на [140]22.08.2025
[226]0
[36]Транзакции по счету: KZ00000PB00000002222 USD
[64]Дата [130]Операция [328]Детали [525]Сумма
=== PAGE 4
[38]KZ00000PB00000003333 [225]EUR
[38]Остаток на [89]01.04.2023
[226]0
[38]Пополнения [226]0
[38]Покупки [226]61.9
[38]Остаток на [89]31.05.2023
[226]0
[36]Транзакции по счету: KZ00000PB00000003333 EUR
[64]Дата [130]Операция [328]Детали [525]Сумма
[50]28.04.2023 [133]Покупка [194]PUBBLICA AMMINISTRAZIONE [528]30.95 [601]EUR [666]30.95 [760]0
[50]28.04.2023 [133]Покупка [194]PUBBLICA AMMINISTRAZIONE [528]30.95 [601]EUR [676]0 [751]30.95`;

export const KASPI_HEADER = `=== PAGE 1
[40]АО «Kaspi Bank», БИК CASPKZKA, www.kaspi.kz
[40]ВЫПИСКА по Kaspi Gold за период с 01.09.24 по 30.09.24
[40]Номер карты: *0000`;

export const UNKNOWN_DOCUMENT = `=== PAGE 1
[40]Quarterly newsletter
[40]Nothing here is a bank statement.`;
