import { CURRENCY_META, PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";

import { SYMBOL_ALIASES } from "./detect-currency";
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

const CARD_USED = new RegExp(String.raw`\b(?:with|con)\s+([^\n]*?[•*]{2,}\s?\d{4})(?!\d)`, "iu");
const CARD_REFERENCE = new RegExp(String.raw`\byour\b.*\bcard\b|\btu\b.*\btarjeta\b|[x*•]{3,}[-\s]?\d{3,4}`, "iu");
const PARENTHESIZED = new RegExp(String.raw`\(([^()]+)\)`, "u");

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
    const merchant = cleanMerchant(named ? payee(named, tail) : lineBefore(text, match.index));
    return { amount, amountText, income, merchant };
}

function payee(named: string, tail: string): string | null {
    return CARD_REFERENCE.test(named) ? (PARENTHESIZED.exec(tail)?.[1] ?? null) : named;
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
