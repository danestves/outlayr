import type { DebtInstallment, DebtVerb, NotificationRead } from "@outlayr/backend/confect/notificationRead.spec";
import { CURRENCY_META, PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { parseCsvAmount } from "@outlayr/money/csv-read";
import { decimalsFor } from "@outlayr/money/currency";

import { detectCurrency, LOCAL_SYMBOLS, SYMBOL_ALIASES } from "./detect-currency";

export interface ParsedNotification {
    amount: number;
    amountText: string;
    currencyHint?: string;
    income: boolean;
    merchant: string | null;
}

export interface ParsedDebt {
    amount: number;
    amountText: string;
    counterparty: string | null;
    installment: DebtInstallment | null;
    verb: DebtVerb;
}

function escape(text: string): string {
    return text.replaceAll(/[.*+?^${}()|[\]\\/]/g, String.raw`\$&`);
}

const SYMBOLS = [
    ...new Set([
        ...Object.values(CURRENCY_META).map((meta) => meta.symbol),
        ...Object.keys(SYMBOL_ALIASES),
        ...LOCAL_SYMBOLS,
    ]),
];

// A capital letter is also a currency (L, P, Q, K, R) and KM is Bosnia's mark, but a sender code or a distance has the
// same shape: a message from "7L" is not seven lempiras, nor is a ride "12KM" away 12 marks. These count only against a
// number written as an amount, with a decimal or grouping separator ("L 1,250.00", "Q150.00", "R 120,00").
const AMBIGUOUS_SYMBOLS = new Set(["K", "KM", "L", "P", "Q", "R"]);

const byLength = (a: string, b: string) => b.length - a.length;
const SYMBOLS_RE = SYMBOLS.filter((symbol) => !AMBIGUOUS_SYMBOLS.has(symbol))
    .sort(byLength)
    .map(escape)
    .join("|");
const AMBIGUOUS_RE = SYMBOLS.filter((symbol) => AMBIGUOUS_SYMBOLS.has(symbol))
    .sort(byLength)
    .map(escape)
    .join("|");
const CODES = String.raw`(?<![A-Za-z])(?:${PICKABLE_CURRENCY_CODES.join("|")})(?![A-Za-z])`;
const UNIT = `(?:${CODES}|${SYMBOLS_RE})`;
const AMBIGUOUS_UNIT = `(?:${AMBIGUOUS_RE})`;
const NUMBER = String.raw`\d+(?:[.,]\d+)*`;
const AMOUNT = String.raw`\d+(?:[.,]\d+)+`;
const MONEY = new RegExp(
    String.raw`${UNIT}\s?${NUMBER}|${UNIT}\.\s?${AMOUNT}|${NUMBER}\s?${UNIT}|${AMBIGUOUS_UNIT}\s?${AMOUNT}|${AMOUNT}\s?${AMBIGUOUS_UNIT}`,
    "u"
);
const DIGITS = new RegExp(NUMBER, "u");
const EVERY_MONEY = new RegExp(MONEY.source, "gu");
const SAME_AMOUNT = 0.005;
const AFTER_NUMBER = /^\d|\s?\d/;

/* oxlint-disable prefer-regex-literals -- LogNotificationIntent reads these sources with ICU, and Babel rewrites a u-flag literal into surrogate classes ICU matches differently */
const DECLINED = String.raw`\b(?:declined|denied|failed|reverted|unsuccessful|insufficient funds|rechazad[ao]|denegad[ao]|fallid[ao]|revertid[ao]|no aprobad[ao]|no realizad[ao]|fondos insuficientes)\b`;
// "Evitas el cargo por atraso de $4" warns about a charge the user has not made. A purchase still says "tu cuota
// vence el 15/12" and a payment "cuota vencida", so due words count only beside a nearby day or as a status.
const REMINDER = String.raw`\b(?:recordatorio\s+de\s+(?:pago|cuota|vencimiento)|(?:payment|bill)\s+reminder|(?:hoy|ma[ñn]ana|pronto)\s+vencen?|vencen?\s+(?:hoy|ma[ñn]ana|pronto)|por\s+vencer|pr[oó]xim[ao]s?\s+a\s+vencer|(?:is|are)\s+(?:overdue|(?:past\s+)?due)|est[aá]n?\s+vencid[ao]s?|due\s+(?:today|tomorrow|soon)|payment\s+due|pay\s+today|pag(?:a|ue)\s+hoy|avoid\s+(?:a\s+|the\s+|any\s+)?(?:late\s+)?(?:fees?|charges?|interest|penalt(?:y|ies))|evita(?:s|r)?\s+(?:el\s+|los\s+|un\s+)?(?:cargos?|recargos?|intereses|multas?|penalidad(?:es)?|penalizaci[oó]n))(?!\p{L})`;
// Payoneer announces a payment "on its way" and pushes again once it is deposited; only the deposit is money in.
const PENDING = String.raw`\b(?:is\s+on\s+its\s+way|est[aá]\s+en\s+camino)\b`;
// A shipped LogNotificationIntent or PurchaseListenerService reads only the pattern keys it was built with, so the
// reminder and pending cues ride on declined, which already drops the whole text there.
const NO_CHARGE = new RegExp(`(?:${DECLINED})|(?:${REMINDER})|(?:${PENDING})`, "iu");
// "JANE SMITH received your $77.50 Zelle payment" is the user paying and the bank confirming it, and an Indian UPI
// debit names the payee "credited": a debit earlier in the text turns every later credit word into the payee's side.
const INCOMING = new RegExp(
    String.raw`^(?:(?!\bdebited\b)[\s\S])*?\b(?:you\s+received|received(?!\s+your\b)|refund(?:ed)?|reversal|credited|deposited|direct\s+deposit|pending\s+credit|credit\s+(?:of|on|from|to)\b|sent\s+you|paid\s+you|depositad[ao]|recibi(?:ste|d[ao])|reembols(?:o|ad[ao])|devoluci[oó]n|abon(?:o|ad[ao])|acreditad[ao])\b|\bte\s+(?:transfer[ií]|pagu[eé]|envi[eé]|mand[eé]|deposit[eé]|pas[eé]|hice)(?!\p{L})`,
    "iu"
);

// "$10 off" and "$1,000 available credit" carry an amount that is not a charge. The cue must sit right against the
// number: a bank appending "Available balance" after a real purchase puts a full stop in between, which these do not
// cross.
const PROMO_AFTER = new RegExp(
    String.raw`^[^\S\n]*(?:de[^\S\n]+)?(?:off|discount|descuento|desconto|rebaja|remise|réduction)\b`,
    "iu"
);
// "Si gastas más de $1,000" and "spend $50, get a $10 reward" name a limit or a reward, not a charge. They stay on the
// amount's line, since a Wallet merchant line like "GAME OVER" sits above it. Java and ICU let "$" match before a
// final newline, so the end is (?![\s\S]).
const THRESHOLD = String.raw`m[aá]s\s+de|more\s+than|over|up\s+to|hasta|desde|a\s+partir\s+de|à\s+partir\s+de|from|minimum|m[ií]nimo|mais\s+de|acima\s+de|até|plus\s+de|dès|at\s+least|al\s+menos|pelo\s+menos|au\s+moins`;
const OFFER = String.raw`spend|gast(?:a|as|e|es|en|ar)|dépensez|get|earn|win|gana|gane|ganá|ganar|ganhe|gagnez|recibe|reciba|receba|recevez|obt[eé]n|obtenga|obtenez|regala|regalamos`;
const PROMO_BEFORE = new RegExp(
    String.raw`(?<![A-Za-z])(?:save|ahorra|ahorrá|économisez|poupa|poupe|discount|descuento|desconto|rebaja|remise|réduction)\s*(?:of|de)?\s*[:=-]?\s*$|(?<![A-Za-z])(?:${THRESHOLD}|${OFFER})(?:[^\S\n]+(?:of|de|a|an|un|una|um|uma))?[^\S\n]*[:=-]?[^\S\n]*(?![\s\S])`,
    "iu"
);
const BALANCE_AFTER = new RegExp(String.raw`^[^\S\n]*(?:available|balance|saldo|solde|dispon[íi]ve(?:is|l))\b`, "iu");
const BALANCE = String.raw`(?<![A-Za-z])(?:available credit|crédito disponible|crédit disponible|crédito disponível|available balance|balance|saldo disponible|saldo disp\.|saldo|solde)(?:\s+en\s+c(?:uen)?ta\.?)?(?:\s+\d{4})?\s*(?:is|es|est|é)?\s*[:=-]?\s*$`;
const EXCHANGE_RATE = String.raw`(?<![A-Za-z])(?:tasa\s+(?:de\s+)?(?:compra|venta|cambio|oficial|bcv)|tasa(?=\s+del\s+d[oó]lar)|tipo\s+de\s+cambio|cotizaci[oó]n|precio\s+del\s+d[oó]lar|exchange\s+rate|(?:buy|sell)(?:ing)?\s+rate|taxa\s+de\s+c[aâ]mbio|taux\s+de\s+change)(?:\s+del\s+d[oó]lar)?(?:\s*(?:est[aá]|es|is|hoy|today|en|at|a|:|=|-))*\s*$`;
// A shipped LogNotificationIntent decodes only the pattern keys it was built with, so the rate cue rides on
// balanceBefore to reach it without a native release.
const BALANCE_BEFORE = new RegExp(`(?:${BALANCE})|(?:${EXCHANGE_RATE})`, "iu");

// A period only ends the name before whitespace or the end, so "AMAZON.COM" survives but "Burger King. Questions"
// stops; a period before a company suffix ("CHARGEPOINT. INC") is part of the name. "for" stops only before a
// function word or a number, so "Transport for London" survives.
const STOP = String.raw`(?=\s+(?:with|using|via|on|con|usando|por|el|la|desde|mediante)\b|\s+for\s+(?:(?:your|the|a|an|this|that|my|our|their|its|each|every|all|any|credit|debit|payment|purchase|more|less|info|details|delivery|shipping|order|merchant|store)\b|[^\p{L}])|\s+(?:was|has\s+been|is|exceeds|view\s+(?:recent|details|in|activity|your))\b|\s+a\s+été(?!\p{L})|\s+(?:balance|saldo|solde)\b|\s+(?:a|en)\s+(?:tu|your)\s+cuenta\b|\s+credited\b|\.?\s*avl\s+bal\b|\s+\d{1,2}:\d{2}|\s+\d{1,2}/\d{1,2}|[,;\n]|\.(?=\s|$)(?!\s+(?:inc|llc|ltd|corp|co|plc|gmbh|s\.?a|spa|ag|bv|a\.?s|oy|ab|pty)\b)|$)`;
// An intro after a sentence end belongs to the bank's boilerplate ("Log in to view details"), not to the charge.
const UNTIL_END = String.raw`(?:(?![!?]|\.(?:\s|$))[\s\S])*?`;
// "Rs.500.00 in CHENNAI at VETRIVEL AGENCIES" names the city with "in" and the store with a later "at".
const CITY = String.raw`\b(?:in|en)\s+(?!(?:(?!\.\s)[^\n])*?\bat\s+(?!\d))`;
const CARD = String.raw`\b(?:with|con)\s+(?!(?:your|card|credit|debit|tu|tarjeta|visa|mastercard|amex|cuenta)\b|[^\n]*?(?<![•*])[•*]{2,}\s?\d{4})`;
const LABEL = String.raw`(?:^|[\s(])(?:at|to|local|merch(?:ant)?|store|payee)\s*:\s*`;
const CREDITED = String.raw`;\s+(?=[^;\n]*\bcredited\b)`;
const COLLECTED = String.raw`\bcollected\s+by\s+`;
// A card's last digits, a time, a date, a phone number, an account or "your card" is not a payee.
const NOT_PAYEE = String.raw`(?:las?\s+\d|fecha\b|operaci[oó]n\b|\d{1,2}:\d{2}|\d{4,}|\d{1,2}/\d{1,2}|(?:la\s+|the\s+|your\s+|tu\s+)?(?:cuenta|account|acct)\b|your\s+(?:card|alerts|settings|statement|balance)\b|tu\s+(?:tarjeta|cuenta)\b)`;
const PAID_TO = new RegExp(
    String.raw`^${UNTIL_END}(?:${CITY}|\b(?:at|to|a|de|chez|em)\s+|@\s+|${CARD}|${LABEL}|${CREDITED}|${COLLECTED})(?!${NOT_PAYEE})(.+?)${STOP}`,
    "iu"
);
const DEPOSITED = String.raw`(?=\s+(?:was|has\s+been|fue|ha\s+sido)\s+deposit)`;
const RECEIVED_FROM = new RegExp(
    String.raw`^${UNTIL_END}(?:\b(?:from|por\s+parte\s+de)\s+|\bde\s+|${LABEL})(?!${NOT_PAYEE})(.+?)(?:${DEPOSITED}|${STOP})`,
    "iu"
);
const SENT_BY = new RegExp(String.raw`\bde\s+(\p{Lu}[\p{Lu} .'-]*\p{Lu})\s+por\s*$`, "u");
const YOUR_CHARGE = new RegExp(
    String.raw`\byour[^\S\n]+([^\n]+?)[^\S\n]+(?:transaction|purchase|payment|charge|order)\b`,
    "iu"
);

const CARD_USED = new RegExp(String.raw`\b(?:with|con)\s+([^\n]*?(?<![•*])[•*]{2,}\s?\d{4})(?!\d)`, "iu");
const CARD_REFERENCE = new RegExp(String.raw`\byour\b.*\bcard\b|\btu\b.*\btarjeta\b|[x*•]{3,}[-\s]?\d{3,4}`, "iu");
const PARENTHESIZED = new RegExp(String.raw`\(([^()]+)\)`, "u");
const CHARGE_WORDS = new RegExp(
    String.raw`\b(?:card|tarjeta|ending|recent|latest|last|online|contactless|debit|credit|pending|scheduled|recurring|international)\b`,
    "iu"
);
// "STRAND BARBER & BEAUTY in SAN FRANCISCO" names the city with a lowercase "in"; "JACK IN THE BOX" keeps its own.
const CITY_AFTER = /\s+in\s+(?=\p{Lu})/u;
const NAME_START = new RegExp(String.raw`^[\p{Lu}\d]`, "u");

const USER_OWES = new RegExp(String.raw`\b(?:me\s+debes|you\s+owe\s+me|te\s+prest[eé]|i\s+lent\s+you)(?!\p{L})`, "iu");
const USER_IS_OWED = new RegExp(
    String.raw`\b(?:te\s+debo|i\s+owe\s+you|me\s+prestaste|you\s+lent\s+me)(?!\p{L})`,
    "iu"
);
const LOAN = new RegExp(String.raw`\b(?:pr[eé]stamo|loan|me\s+prest[oó])(?!\p{L})`, "iu");
const REPAYMENT = new RegExp(
    String.raw`\b(?:pag(?:o|aste|ó|amos|ad[ao])|abon(?:o|aste)|payment|paid|repaid)(?!\p{L})`,
    "iu"
);
const LOAN_TAKEN = new RegExp(
    String.raw`\b(?:me\s+prest[oó]|acreditad[ao]|desembolsad[ao]|depositad[ao]|credited|disbursed|deposited)(?!\p{L})`,
    "iu"
);
const PERSON_NAME = new RegExp(String.raw`^\p{Lu}`, "u");
const PURCHASE = new RegExp(String.raw`\b(?:compra|purchase)(?!\p{L})`, "iu");
const INSTALLMENT = new RegExp(
    String.raw`\b(?:cuota|installment)\s+(?:n(?:ro|o|°|º)?\.?\s*)?(\d{1,3})(?:\s*(?:\/|de|of)\s*(\d{1,3})(?![\d.,]))?(?!\d)`,
    "iu"
);
const BARE_AMOUNT = new RegExp(String.raw`^[^\S\n]+(\d+(?:[.,]\d+)*)(?![\d.,]*\s*%)`, "u");
const NAMED_LINE = new RegExp(String.raw`^\s*(\p{Lu}[\p{L}'.-]*(?:\s+\p{Lu}[\p{L}'.-]*){0,3})\s*:`, "u");
const NAMED_AFTER = new RegExp(
    String.raw`\b(?:a|de|from|to|con|with)\s+(\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+){0,2})(?![\p{L}.])`,
    "u"
);

const POS_PREFIX = new RegExp(
    String.raw`^(?:sumup|sq|sqc|tst|pp|paypal|zettle|izettle|stripe|amzn(?: mktp)?)\s*\*\s*`,
    "iu"
);
/* oxlint-enable prefer-regex-literals */

export const NOTIFICATION_PATTERNS = {
    afterNumber: AFTER_NUMBER,
    balanceAfter: BALANCE_AFTER,
    balanceBefore: BALANCE_BEFORE,
    cardReference: CARD_REFERENCE,
    cardUsed: CARD_USED,
    declined: NO_CHARGE,
    incoming: INCOMING,
    money: MONEY,
    paidTo: PAID_TO,
    parenthesized: PARENTHESIZED,
    posPrefix: POS_PREFIX,
    promoAfter: PROMO_AFTER,
    promoBefore: PROMO_BEFORE,
    receivedFrom: RECEIVED_FROM,
    sentBy: SENT_BY,
};

// "Get $10 off your next order" and "You have $1,000 available credit" are the shapes a purchase never takes, so the
// amount is skipped and the text reads as no charge at all. Later amounts still count, so a push that opens with a
// discount and then reports the real purchase is read from the purchase.
function notACharge(text: string, match: RegExpExecArray): boolean {
    const before = text.slice(0, match.index);
    const after = text.slice(match.index + match[0].length);
    return (
        PROMO_BEFORE.test(before) || PROMO_AFTER.test(after) || BALANCE_BEFORE.test(before) || BALANCE_AFTER.test(after)
    );
}

function chargeMoney(text: string): RegExpExecArray | null {
    const every = new RegExp(MONEY.source, "gu");
    for (let match = every.exec(text); match !== null; match = every.exec(text)) {
        if (!notACharge(text, match)) {
            return match;
        }
    }
    return null;
}

function chargeFigures(text: string): string[] {
    return [...text.matchAll(EVERY_MONEY)].filter((match) => !notACharge(text, match)).map(([figure]) => figure);
}

/** The gate the AI read is behind, so a promo or a reminder never leaves the device and never lends its amount. */
export function hasChargeAmount(text: string): boolean {
    return !NO_CHARGE.test(text) && chargeMoney(text) !== null;
}

// One kind of separator that repeats, or that leaves three digits, is grouping: "$25.000" is 25000 and "$1.250.000"
// parses, as LogWalletTransactionIntent.parseAmount reads them for the push. A three-decimal dinar keeps its decimals.
function amountOf(token: string): number | null {
    const digits = DIGITS.exec(token)?.[0] ?? token;
    const code = detectCurrency(token);
    const dot = digits.includes(".");
    const threeDecimals = code !== null && decimalsFor(code) === 3;
    if (dot !== digits.includes(",") && !threeDecimals) {
        const only = dot ? "." : ",";
        const groups = digits.split(only);
        if (groups.length > 2 || groups.at(-1)?.length === 3) {
            return parseCsvAmount(digits.replaceAll(only, ""));
        }
    }
    return parseCsvAmount(digits, digits.lastIndexOf(",") > digits.lastIndexOf(".") ? "," : ".");
}

// Null without a money token (how "your statement is ready" is skipped), when the charge did not go through, or when
// the text only reminds the user of one.
export function parseNotification(text: string): ParsedNotification | null {
    const match = chargeMoney(text);
    if (!match || NO_CHARGE.test(text)) {
        return null;
    }
    const amountText = match[0].trim();
    const amount = amountOf(amountText);
    if (amount == null || amount <= 0) {
        return null;
    }
    const income = INCOMING.test(text);
    const head = text.slice(0, match.index);
    const tail = text.slice(match.index + match[0].length);
    const sender = income ? SENT_BY.exec(head)?.[1] : undefined;
    const named = sender ?? (income ? RECEIVED_FROM : PAID_TO).exec(tail)?.[1]?.trim();
    const merchant = cleanMerchant(named ? payee(named, tail) : (chargeNamed(head) ?? lineBefore(text, match.index)));
    return { amount, amountText, income, merchant };
}

// "Your SiteGround transaction in the amount of USD 22.99": the name sits before the money. A lowercase word
// ("Your recent transaction", "Your debit card purchase") is the bank describing the charge, not naming a payee.
function chargeNamed(head: string): string | null {
    const named = YOUR_CHARGE.exec(head)?.[1];
    return named && NAME_START.test(named) && !CHARGE_WORDS.test(named) && !CARD_REFERENCE.test(named) ? named : null;
}

function payee(named: string, tail: string): string | null {
    return CARD_REFERENCE.test(named) ? (PARENTHESIZED.exec(tail)?.[1] ?? null) : named;
}

function debtVerb(text: string, installment: DebtInstallment | null): DebtVerb | null {
    if (USER_OWES.test(text)) {
        return "borrowed";
    }
    if (USER_IS_OWED.test(text)) {
        return "lent";
    }
    const loan = LOAN.test(text);
    const repaid = REPAYMENT.exec(text);
    const bought = PURCHASE.exec(text);
    if ((installment !== null || loan) && repaid !== null && (bought === null || bought.index > repaid.index)) {
        return INCOMING.test(text) ? "gotPaidBack" : "paidBack";
    }
    return loan && installment === null && LOAN_TAKEN.test(text) ? "borrowed" : null;
}

function debtAmount(text: string, installment: DebtInstallment | null): { amount: number; amountText: string } | null {
    const money = chargeMoney(text);
    if (money) {
        const amount = amountOf(money[0].trim());
        return amount !== null && amount > 0 ? { amount, amountText: money[0].trim() } : null;
    }
    const phrase = installment === null ? (USER_OWES.exec(text) ?? USER_IS_OWED.exec(text) ?? LOAN.exec(text)) : null;
    const bare = phrase ? BARE_AMOUNT.exec(text.slice(phrase.index + phrase[0].length))?.[1] : undefined;
    const amount = bare === undefined ? null : amountOf(bare);
    return bare !== undefined && amount !== null && amount > 0 ? { amount, amountText: bare } : null;
}

function counterpartyOf(raw: string): string | null {
    const text = raw.replace(INSTALLMENT, "");
    for (const line of text.split("\n")) {
        const named = NAMED_LINE.exec(line)?.[1];
        if (named && detectCurrency(named) === null) {
            return named;
        }
    }
    const income = INCOMING.test(text);
    const found = income ? (SENT_BY.exec(text)?.[1] ?? RECEIVED_FROM.exec(text)?.[1]) : undefined;
    const sender = found && PERSON_NAME.test(found) ? found : undefined;
    const after = NAMED_AFTER.exec(text)?.[1];
    return cleanMerchant(sender ?? (after && detectCurrency(after) === null ? after : null));
}

export function parseDebt(text: string): ParsedDebt | null {
    if (NO_CHARGE.test(text)) {
        return null;
    }
    const counted = INSTALLMENT.exec(text);
    const number = counted ? Number(counted[1]) : 0;
    const of = counted?.[2] === undefined ? null : Number(counted[2]);
    const installment = number > 0 ? { number, of: of !== null && of >= number ? of : null } : null;
    const verb = debtVerb(text, installment);
    const money = verb === null ? null : debtAmount(text, installment);
    if (verb === null || money === null) {
        return null;
    }
    return { ...money, counterparty: counterpartyOf(text), installment, verb };
}

export function mergeDebtRead(
    text: string,
    parsed: ParsedDebt | null,
    read: NotificationRead | null
): ParsedDebt | null {
    if (read?.kind === "declined") {
        return null;
    }
    if (read?.kind !== "debt" || read.debt === null) {
        return parsed;
    }
    const local = parsed ?? debtAmount(text, read.debt.installment);
    const amount = read.amount ?? local?.amount;
    if (amount === undefined) {
        return null;
    }
    return {
        amount,
        amountText: readCurrency(text, read.currency, amount) ?? sameAmountText(local, amount),
        counterparty: cleanMerchant(read.merchant) ?? parsed?.counterparty ?? null,
        installment: read.debt.installment ?? parsed?.installment ?? null,
        verb: read.debt.verb,
    };
}

// The AI read wins where it answered and the on-device parse fills what it left null; only a decline drops the push.
export function mergeNotificationRead(
    text: string,
    parsed: ParsedNotification | null,
    read: NotificationRead | null
): ParsedNotification | null {
    if (read === null) {
        return parsed;
    }
    if (read.kind === "declined" || read.kind === "debt") {
        return null;
    }
    // A missing purchase is worse than a statement logged by mistake, so "other" only defers to the parser.
    if (read.kind === "other") {
        return parsed;
    }
    const amount = read.amount ?? parsed?.amount;
    if (amount === undefined) {
        return null;
    }
    return {
        amount,
        ...(shownAmount(text, parsed, read.currency, amount) ?? { amountText: sameAmountText(parsed, amount) }),
        income: read.kind === "income",
        merchant: cleanMerchant(read.merchant) ?? parsed?.merchant ?? null,
    };
}

// The parser's currency describes its own amount; when the AI read a different one (a push with two amounts), the
// card's account settles the currency instead.
function sameAmountText(parsed: { amount: number; amountText: string } | null, amount: number): string {
    return parsed !== null && parsed.amount === amount ? parsed.amountText : String(amount);
}

// The model's currency counts only when the figure it read shows that currency in the text: a bare "$" belongs to
// 22 currencies and the card's account settles it, and a push with two amounts must not lend one's code to the other.
function readCurrency(text: string, code: string | null, amount: number): string | null {
    if (code === null) {
        return null;
    }
    const shown = (text.match(EVERY_MONEY) ?? []).some((token) => {
        const value = amountOf(token);
        return value !== null && Math.abs(value - amount) < SAME_AMOUNT && detectCurrency(token) === code;
    });
    return shown ? `${code} ${amount}` : null;
}

function shownAmount(
    text: string,
    parsed: ParsedNotification | null,
    code: string | null,
    amount: number
): Pick<ParsedNotification, "amountText" | "currencyHint"> | null {
    if (code === null) {
        return null;
    }
    const shown = parsed?.amount === amount ? [parsed.amountText] : chargeFigures(text);
    const figures = shown.filter((token) => {
        const value = amountOf(token);
        return value !== null && Math.abs(value - amount) < SAME_AMOUNT;
    });
    if (figures.some((token) => detectCurrency(token) === code)) {
        return { amountText: `${code} ${amount}` };
    }
    const shared = figures.find((token) => detectCurrency(token, [code]) === code);
    return shared ? { amountText: shared.trim(), currencyHint: code } : null;
}

export function cleanMerchant(raw: string | null): string | null {
    const cleaned = raw?.split(",", 1)[0]?.split(CITY_AFTER, 1)[0]?.replace(POS_PREFIX, "").trim();
    return cleaned || null;
}

// ponytail: the line above the money is the merchant only when the money sits
// on its own line, which is Wallet's own layout (card, merchant, amount); a
// bank's "Purchase alert" title leaks through. An AI pass on misses is the upgrade.
function lineBefore(text: string, moneyAt: number): string | null {
    const above = text.slice(0, moneyAt).split("\n");
    if (above.length < 2 || above.at(-1)?.trim()) {
        return null;
    }
    // Revolut titles an account push "<account> · <merchant>", so only the part after the separator names the store.
    const line = (above.at(-2)?.split("·").at(-1) ?? "").trim();
    return !line || AFTER_NUMBER.test(line) ? null : line;
}
