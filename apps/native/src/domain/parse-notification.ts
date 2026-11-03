import type { NotificationRead } from "@outlayr/backend/confect/notificationRead.spec";
import { CURRENCY_META, PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";

import { detectCurrency, SYMBOL_ALIASES } from "./detect-currency";
import { detectDecimalSeparator, parseCsvAmount } from "./transaction-csv";

export interface ParsedNotification {
    amount: number;
    amountText: string;
    income: boolean;
    merchant: string | null;
}

function escape(text: string): string {
    return text.replaceAll(/[.*+?^${}()|[\]\\/]/g, String.raw`\$&`);
}

const SYMBOLS = [
    ...new Set([...Object.values(CURRENCY_META).map((meta) => meta.symbol), ...Object.keys(SYMBOL_ALIASES)]),
]
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join("|");
const CODES = String.raw`(?<![A-Za-z])(?:${PICKABLE_CURRENCY_CODES.join("|")})(?![A-Za-z])`;
const UNIT = `(?:${CODES}|${SYMBOLS})`;
const NUMBER = String.raw`\d+(?:[.,]\d+)*`;
const MONEY = new RegExp(String.raw`${UNIT}\s?${NUMBER}|${NUMBER}\s?${UNIT}`, "u");
const DIGITS = new RegExp(NUMBER, "u");
const EVERY_MONEY = new RegExp(MONEY.source, "gu");
const SAME_AMOUNT = 0.005;
const AFTER_NUMBER = /^\d|\s?\d/;

/* oxlint-disable prefer-regex-literals -- LogNotificationIntent reads these sources with ICU, and Babel rewrites a u-flag literal into surrogate classes ICU matches differently */
const DECLINED = new RegExp(
    String.raw`\b(?:declined|denied|failed|reverted|unsuccessful|insufficient funds|rechazad[ao]|denegad[ao]|fallid[ao]|revertid[ao]|no aprobad[ao]|fondos insuficientes)\b`,
    "iu"
);
const INCOMING = new RegExp(
    String.raw`\b(?:received|refund(?:ed)?|reversal|credited|recibi(?:ste|d[ao])|reembols(?:o|ad[ao])|devoluci[oó]n|abon(?:o|ad[ao])|acreditad[ao])\b`,
    "iu"
);

const STOP = String.raw`(?=\s+(?:with|using|via|on|for|con|usando|por|el|la|desde|mediante)\b|[,.;\n]|$)`;
const PAID_TO = new RegExp(String.raw`\b(?:at|in|en|to|a|de|@)\s+(.+?)${STOP}`, "iu");
const RECEIVED_FROM = new RegExp(String.raw`\b(?:from|de|por parte de)\s+(.+?)${STOP}`, "iu");
const YOUR_CHARGE = new RegExp(
    String.raw`\byour[^\S\n]+([^\n]+?)[^\S\n]+(?:transaction|purchase|payment|charge|order)\b`,
    "iu"
);

const CARD_USED = new RegExp(String.raw`\b(?:with|con)\s+([^\n]*?[•*]{2,}\s?\d{4})(?!\d)`, "iu");
const CARD_REFERENCE = new RegExp(String.raw`\byour\b.*\bcard\b|\btu\b.*\btarjeta\b|[x*•]{3,}[-\s]?\d{3,4}`, "iu");
const PARENTHESIZED = new RegExp(String.raw`\(([^()]+)\)`, "u");
const CHARGE_WORDS = new RegExp(
    String.raw`\b(?:card|tarjeta|ending|recent|latest|last|online|contactless|debit|credit|pending|scheduled|recurring|international)\b`,
    "iu"
);
const NAME_START = new RegExp(String.raw`^[\p{Lu}\d]`, "u");

const POS_PREFIX = new RegExp(
    String.raw`^(?:sumup|sq|sqc|tst|pp|paypal|zettle|izettle|stripe|amzn(?: mktp)?)\s*\*\s*`,
    "iu"
);
/* oxlint-enable prefer-regex-literals */

export const NOTIFICATION_PATTERNS = {
    afterNumber: AFTER_NUMBER,
    cardReference: CARD_REFERENCE,
    cardUsed: CARD_USED,
    declined: DECLINED,
    incoming: INCOMING,
    money: MONEY,
    paidTo: PAID_TO,
    parenthesized: PARENTHESIZED,
    posPrefix: POS_PREFIX,
    receivedFrom: RECEIVED_FROM,
};

// Null without a money token (how "your statement is ready" is skipped), or when the charge did not go through.
export function parseNotification(text: string): ParsedNotification | null {
    const match = MONEY.exec(text);
    if (!match || DECLINED.test(text)) {
        return null;
    }
    const amountText = match[0].trim();
    const digits = DIGITS.exec(amountText)?.[0] ?? amountText;
    const amount = parseCsvAmount(digits, detectDecimalSeparator([digits]));
    if (amount == null || amount <= 0) {
        return null;
    }
    const income = INCOMING.test(text);
    const tail = text.slice(match.index + match[0].length);
    const named = (income ? RECEIVED_FROM : PAID_TO).exec(tail)?.[1]?.trim();
    const merchant = cleanMerchant(
        named ? payee(named, tail) : (chargeNamed(text.slice(0, match.index)) ?? lineBefore(text, match.index))
    );
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

// The AI read wins where it answered and the on-device parse fills what it left null; only a decline drops the push.
export function mergeNotificationRead(
    text: string,
    parsed: ParsedNotification | null,
    read: NotificationRead | null
): ParsedNotification | null {
    if (read === null) {
        return parsed;
    }
    if (read.kind === "declined") {
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
        amountText: readCurrency(text, read.currency, amount) ?? sameAmountText(parsed, amount),
        income: read.kind === "income",
        merchant: cleanMerchant(read.merchant) ?? parsed?.merchant ?? null,
    };
}

// The parser's currency describes its own amount; when the AI read a different one (a push with two amounts), the
// card's account settles the currency instead.
function sameAmountText(parsed: ParsedNotification | null, amount: number): string {
    return parsed !== null && parsed.amount === amount ? parsed.amountText : String(amount);
}

// The model's currency counts only when the figure it read shows that currency in the text: a bare "$" belongs to
// 22 currencies and the card's account settles it, and a push with two amounts must not lend one's code to the other.
function readCurrency(text: string, code: string | null, amount: number): string | null {
    if (code === null) {
        return null;
    }
    const shown = (text.match(EVERY_MONEY) ?? []).some((token) => {
        const digits = DIGITS.exec(token)?.[0] ?? "";
        const value = parseCsvAmount(digits, detectDecimalSeparator([digits]));
        return value !== null && Math.abs(value - amount) < SAME_AMOUNT && detectCurrency(token) === code;
    });
    return shown ? `${code} ${amount}` : null;
}

export function cleanMerchant(raw: string | null): string | null {
    const cleaned = raw?.split(",", 1)[0]?.replace(POS_PREFIX, "").trim();
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
    const line = above.at(-2)?.trim() ?? "";
    return !line || AFTER_NUMBER.test(line) ? null : line;
}
