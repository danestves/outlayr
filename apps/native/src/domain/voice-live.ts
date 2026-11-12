import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import type { RecurringType } from "@outlayr/money/recurrence";

import type { Language } from "@/i18n/languages";

import { roundToMinorUnits } from "./money";
import { localIsoDate, spokenDateToLocal } from "./voice-entry";
import type { AccountCandidate, CategoryCandidate, ResolvedRecurrence } from "./voice-entry";

/** `[start, end)` is a char span of the text that was parsed. */
export interface Found<T> {
    end: number;
    start: number;
    value: T;
}

export interface LiveDraft {
    accountId: Found<string> | null;
    amount: Found<number> | null;
    categoryId: Found<string> | null;
    currency: Found<string> | null;
    date: Found<Date> | null;
    fromAccountId: Found<string> | null;
    income: Found<boolean> | null;
    kind: Found<"entry" | "transfer"> | null;
    recurrence: Found<ResolvedRecurrence> | null;
    toAccountId: Found<string> | null;
}

export interface LiveContext {
    accounts: readonly AccountCandidate[];
    categories: readonly CategoryCandidate[];
    /** Rounds an amount whose currency was not spoken. */
    currency: string;
    language: Language;
    now: Date;
}

export interface LiveParseOptions {
    /** The transcript is complete, so a trailing number, name or cue no longer waits for the next word. */
    final?: boolean;
}

type DecimalMark = "." | ",";

interface Lexicon {
    cadences: readonly { re: RegExp; type: RecurringType }[];
    days: readonly { ago: number; re: RegExp }[];
    decimal: DecimalMark;
    every: RegExp;
    expense: RegExp;
    from: ReadonlySet<string>;
    future: { after: RegExp; before: RegExp };
    income: RegExp;
    skip: ReadonlySet<string>;
    to: ReadonlySet<string>;
    transferStrong: RegExp;
    transferWeak: RegExp;
    /** Sunday first, like `Date#getDay`. */
    weekdays: readonly RegExp[];
}

// Cues are matched on folded text, so they carry no accents; a space stands for any run of spaces.
const phrase = (...alternatives: string[]) =>
    new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join("|").replaceAll(" ", "\\s+")})(?![\\p{L}\\p{N}])`, "u");

const NEVER = /(?!)/u;

const EN = {
    cadences: [
        { re: phrase("daily", "per day", "(?<!for )a day(?! ago)"), type: RECURRING_TYPE.daily },
        { re: phrase("weekly", "per week", "(?<!for )a week(?! ago)"), type: RECURRING_TYPE.weekly },
        { re: phrase("monthly", "per month", "(?<!for )a month(?! ago)"), type: RECURRING_TYPE.monthly },
        { re: phrase("yearly", "annually", "per year", "(?<!for )a year(?! ago)"), type: RECURRING_TYPE.yearly },
    ],
    days: [
        { ago: 0, re: phrase("today") },
        { ago: 1, re: phrase("yesterday") },
        { ago: 2, re: phrase("day before yesterday") },
    ],
    decimal: ".",
    every: phrase("(?:every|each) (?:(\\d+|other) )?(day|week|month|year)s?"),
    expense: phrase("paid(?! me)", "spent", "bought", "purchased"),
    from: new Set(["from"]),
    future: { after: NEVER, before: /(?:next|this\s+coming)\s*$/u },
    income: phrase(
        "got paid",
        "get paid",
        "was paid",
        "been paid",
        "paid me",
        "received?",
        "salary",
        "paycheck",
        "earned",
        "income",
        "refund(?:ed)?",
        "reimbursed",
        "reimbursement",
        "bonus",
        "sold"
    ),
    skip: new Set(["my", "the", "account", "card", "wallet"]),
    to: new Set(["to", "into"]),
    transferStrong: phrase("mov(?:e|ed|ing)", "transfer(?:red|ring)?"),
    transferWeak: phrase("sent", "send(?:ing)?"),
    weekdays: ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => phrase(day)),
} as const satisfies Lexicon;

const ES = {
    cadences: [
        { re: phrase("diario", "diaria", "diariamente"), type: RECURRING_TYPE.daily },
        { re: phrase("semanal(?:es|mente)?", "a la semana", "por semana"), type: RECURRING_TYPE.weekly },
        { re: phrase("mensual(?:es|mente)?", "al mes", "por mes"), type: RECURRING_TYPE.monthly },
        { re: phrase("anual(?:es|mente)?", "al ano", "por ano"), type: RECURRING_TYPE.yearly },
    ],
    days: [
        { ago: 0, re: phrase("hoy") },
        { ago: 1, re: phrase("ayer", "anoche") },
        { ago: 2, re: phrase("anteayer", "antier", "antes de ayer") },
    ],
    decimal: ",",
    every: phrase("(?:cada|todos los|todas las) (?:(\\d+) )?(dia|semana|mes|ano)(?:s|es)?"),
    expense: phrase("gaste", "gastamos", "pague", "pagamos", "compre", "compramos", "me cobraron"),
    from: new Set(["de", "del", "desde"]),
    future: { after: /^\s*(?:que\s+viene|proximo|siguiente)/u, before: /(?:proximo|proxima)\s*$/u },
    income: phrase(
        "me pag(?:aron|o|an|aban)",
        "recibi",
        "recibimos",
        "cobre",
        "cobramos",
        "me depositaron",
        "me ingresaron",
        "me transfirieron",
        "me mandaron",
        "me enviaron",
        "me abonaron",
        "me devolvieron",
        "sueldo",
        "salario",
        "nomina",
        "ingresos?",
        "reembolso",
        "vendi",
        "gane"
    ),
    skip: new Set(["mi", "la", "el", "cuenta", "tarjeta", "billetera", "cartera"]),
    to: new Set(["a", "al", "para", "hacia"]),
    transferStrong: phrase(
        "transferi",
        "transferir",
        "transferimos",
        "movi",
        "mover",
        "movimos",
        "traslade",
        "trasladar"
    ),
    transferWeak: phrase("pase", "pasar", "pasamos", "mande", "mandar", "envie", "enviar", "enviamos"),
    weekdays: ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"].map((day) => phrase(day)),
} as const satisfies Lexicon;

const PT = {
    cadences: [
        { re: phrase("diario", "diaria", "diariamente", "por dia"), type: RECURRING_TYPE.daily },
        { re: phrase("semanal", "semanais", "semanalmente", "por semana"), type: RECURRING_TYPE.weekly },
        { re: phrase("mensal", "mensais", "mensalmente", "por mes", "ao mes"), type: RECURRING_TYPE.monthly },
        { re: phrase("anual", "anuais", "anualmente", "por ano", "ao ano"), type: RECURRING_TYPE.yearly },
    ],
    days: [
        { ago: 0, re: phrase("hoje") },
        { ago: 1, re: phrase("ontem") },
        { ago: 2, re: phrase("anteontem", "antes de ontem") },
    ],
    decimal: ",",
    every: phrase("(?:cada|todo|toda|todos os|todas as) (?:(\\d+) )?(dia|semana|mes|ano)(?:s|es)?"),
    expense: phrase("gastei", "paguei", "comprei", "gastamos", "pagamos", "compramos", "me cobraram"),
    from: new Set(["de", "da", "do", "das", "dos", "desde"]),
    future: { after: /^\s*(?:que\s+vem|proxima|proximo|seguinte)/u, before: /(?:proximo|proxima)\s*$/u },
    income: phrase(
        "recebi",
        "recebemos",
        "me pagaram",
        "me pagou",
        "me depositaram",
        "me transferiram",
        "me mandaram",
        "me enviaram",
        "me devolveram",
        "salario",
        "ganhei",
        "vendi",
        "reembolso",
        "rendimento"
    ),
    skip: new Set(["minha", "meu", "o", "conta", "cartao", "carteira"]),
    to: new Set(["para", "pra", "a", "ao"]),
    transferStrong: phrase("transferi", "transferir", "transferimos", "movi", "mover", "movemos"),
    transferWeak: phrase("passei", "passar", "mandei", "mandar", "enviei", "enviar"),
    weekdays: [
        "domingo",
        "segunda(?:-feira)?",
        "terca(?:-feira)?",
        "quarta(?:-feira)?",
        "quinta(?:-feira)?",
        "sexta(?:-feira)?",
        "sabado",
    ].map((day) => phrase(day)),
} as const satisfies Lexicon;

const FR = {
    cadences: [
        { re: phrase("quotidien(?:ne)?", "par jour"), type: RECURRING_TYPE.daily },
        { re: phrase("hebdomadaire", "par semaine"), type: RECURRING_TYPE.weekly },
        { re: phrase("mensuel(?:le)?", "mensuellement", "par mois"), type: RECURRING_TYPE.monthly },
        { re: phrase("annuel(?:le)?", "annuellement", "par an"), type: RECURRING_TYPE.yearly },
    ],
    days: [
        { ago: 0, re: phrase("aujourd['’]hui") },
        { ago: 1, re: phrase("hier") },
        { ago: 2, re: phrase("avant(?:-|\\s+)hier") },
    ],
    decimal: ",",
    every: phrase("(?:chaque|tous les|toutes les) (?:(\\d+) )?(jour|semaine|mois|annee|an)s?"),
    expense: phrase("depense", "achete", "paye(?! par)"),
    from: new Set(["de", "du", "des", "depuis"]),
    future: { after: /^\s*(?:prochain|prochaine)/u, before: NEVER },
    income: phrase(
        "j['’]ai recu",
        "(?:on )?m['’](?:a|ont) (?:paye|vire|verse)",
        "salaire",
        "gagne",
        "vendu",
        "rembourse",
        "remboursement",
        "revenus?",
        "recu"
    ),
    skip: new Set(["mon", "ma", "le", "la", "l", "compte", "carte", "portefeuille"]),
    to: new Set(["a", "au", "aux", "vers", "dans", "sur", "pour"]),
    transferStrong: phrase("transfer(?:e|er)", "vire", "virer", "deplace", "deplacer"),
    transferWeak: phrase("envoye", "envoyer"),
    weekdays: ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"].map((day) => phrase(day)),
} as const satisfies Lexicon;

const LEXICONS = {
    en: EN,
    es: ES,
    "es-ES": ES,
    fr: FR,
    pt: PT,
    "pt-PT": PT,
} as const satisfies Record<Language, Lexicon>;

// A symbol or ISO code also reads before the number ("$20", "usd 20"); a word only after it ("20 dolares").
const SYMBOL_CURRENCY: ReadonlyMap<string, string> = new Map([
    ["$", "USD"],
    ["us$", "USD"],
    ["usd", "USD"],
    ["€", "EUR"],
    ["eur", "EUR"],
    ["£", "GBP"],
    ["gbp", "GBP"],
    ["r$", "BRL"],
    ["brl", "BRL"],
    ["bs", "VES"],
    ["ves", "VES"],
    ["mxn", "MXN"],
    ["cad", "CAD"],
]);

const WORD_CURRENCY: ReadonlyMap<string, string> = new Map([
    ["dollar", "USD"],
    ["dollars", "USD"],
    ["bucks", "USD"],
    ["dolar", "USD"],
    ["dolares", "USD"],
    ["euro", "EUR"],
    ["euros", "EUR"],
    ["pound", "GBP"],
    ["pounds", "GBP"],
    ["real", "BRL"],
    ["reais", "BRL"],
    ["bolivar", "VES"],
    ["bolivares", "VES"],
    ["bolivars", "VES"],
]);

const MULTIPLIER: ReadonlyMap<string, number> = new Map([
    ["k", 1000],
    ["mil", 1000],
    ["thousand", 1000],
    ["lucas", 1000],
    ["luca", 1000],
    ["million", 1_000_000],
    ["millions", 1_000_000],
    ["millon", 1_000_000],
    ["millones", 1_000_000],
    ["milhao", 1_000_000],
    ["milhoes", 1_000_000],
]);

// A number followed by one of these is a clock time or a duration, never money.
const NOT_MONEY_AFTER: ReadonlySet<string> = new Set([
    "am",
    "pm",
    "h",
    "hs",
    "hr",
    "hrs",
    "hora",
    "horas",
    "hour",
    "hours",
    "heure",
    "heures",
    "uhr",
    "min",
    "mins",
    "minute",
    "minutes",
    "minuto",
    "minutos",
    "dia",
    "dias",
    "day",
    "days",
    "semana",
    "semanas",
    "week",
    "weeks",
    "mes",
    "meses",
    "month",
    "months",
    "ano",
    "anos",
    "year",
    "years",
    "jour",
    "jours",
    "semaine",
    "semaines",
    "mois",
    "an",
    "ans",
    "annee",
    "annees",
]);

const ORDINAL_SUFFIX: ReadonlySet<string> = new Set(["th", "st", "nd", "rd", "er", "eme", "o", "a"]);

const MONTHS: ReadonlySet<string> = new Set([
    "january",
    "february",
    "march",
    "april",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "setiembre",
    "octubre",
    "noviembre",
    "diciembre",
    "janeiro",
    "fevereiro",
    "maio",
    "junho",
    "julho",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
    "janvier",
    "fevrier",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "aout",
    "septembre",
    "octobre",
    "novembre",
    "decembre",
    "jan",
    "feb",
    "apr",
    "aug",
    "sept",
    "oct",
    "dec",
]);

const OF_WORDS: ReadonlySet<string> = new Set(["de", "del", "of"]);
const DAY_BEFORE: ReadonlySet<string> = new Set(["dia", "day", "at", "las", "as", "el", "le"]);
const YEAR_BEFORE: ReadonlySet<string> = new Set([...OF_WORDS, "in", "year", "ano", "an", "annee"]);

const NUMBER = /\d{1,3}(?:[   ]\d{3}(?!\d))+(?:[.,]\d+)?|\d+(?:[.,]\d+)*/gu;
const GROUP_SPACES = /[   ]/g;
const WORD_CHAR = /[\p{L}\p{N}]/u;
const DIGIT = /\d/;
const ASCII_ONLY = /^\p{ASCII}*$/u;
const COMBINING_MARKS = /\p{M}/gu;
const WORD_AFTER = /([  ]?)(\p{L}+|[$€£])/uy;
const WORD_BEFORE = /(\p{L}+)[  ]?$/u;
const SYMBOL_BEFORE = /(r\$|us\$|[$€£]|\p{L}+)\.?[  ]?$/u;
const WORDS_BEFORE = /(?:\p{L}+\s+){1,3}$/u;
const WHITESPACE = /\s+/;
const GROUP_HEAD = /^\d{1,3}$/;
const GROUP_REST = /^\d{3}$/;

/** Same length as `text`, so spans found in the folded copy index the original. */
function fold(text: string): string {
    if (ASCII_ONLY.test(text)) {
        return text.toLowerCase();
    }
    let folded = "";
    for (const char of text) {
        const lower = char.toLowerCase();
        const plain = lower.normalize("NFD").replaceAll(COMBINING_MARKS, "");
        if (plain.length === char.length) {
            folded += plain;
        } else {
            folded += lower.length === char.length ? lower : char;
        }
    }
    return folded;
}

const isWordChar = (char: string | undefined) => char !== undefined && WORD_CHAR.test(char);

const found = <T>(value: T, start: number, end: number): Found<T> => ({ end, start, value });

function isGrouped(digits: string, mark: string): boolean {
    const [head = "", ...rest] = digits.split(mark);
    return GROUP_HEAD.test(head) && rest.every((part) => GROUP_REST.test(part));
}

/** Both marks: the last is the decimal. One mark: a lone three-digit tail is a group only where that mark groups. */
function parseNumber(literal: string, decimal: DecimalMark): number | null {
    const compact = literal.replaceAll(GROUP_SPACES, "");
    const lastAt = Math.max(compact.lastIndexOf("."), compact.lastIndexOf(","));
    if (lastAt === -1) {
        return Number(compact);
    }
    const mark = compact.charAt(lastAt);
    const other = mark === "." ? "," : ".";
    const head = compact.slice(0, lastAt);
    const tail = compact.slice(lastAt + 1);
    if (compact.includes(other)) {
        return isGrouped(head, other) ? Number(`${head.replaceAll(other, "")}.${tail}`) : null;
    }
    if (head.includes(mark)) {
        return isGrouped(compact, mark) ? Number(compact.replaceAll(mark, "")) : null;
    }
    const groupMark = decimal === "." ? "," : ".";
    const looksGrouped = tail.length === 3 && head.length <= 3 && head !== "0" && mark === groupMark;
    return Number(looksGrouped ? `${head}${tail}` : `${head}.${tail}`);
}

interface AfterWord {
    attached: boolean;
    end: number;
    start: number;
    word: string;
}

function wordAfter(folded: string, at: number): AfterWord | null {
    WORD_AFTER.lastIndex = at;
    const match = WORD_AFTER.exec(folded);
    if (match === null) {
        return null;
    }
    const space = match[1] ?? "";
    const word = match[2] ?? "";
    const start = at + space.length;
    return { attached: space === "", end: start + word.length, start, word };
}

const lastWord = (before: string) => WORD_BEFORE.exec(before)?.[1] ?? "";

interface AmountCandidate {
    currency: Found<string> | null;
    end: number;
    start: number;
    value: number;
}

function currencyAfter(after: AfterWord | null): Found<string> | null {
    if (after === null) {
        return null;
    }
    const code = SYMBOL_CURRENCY.get(after.word) ?? WORD_CURRENCY.get(after.word);
    return code === undefined ? null : found(code, after.start, after.end);
}

function currencyBefore(folded: string, start: number): Found<string> | null {
    const match = SYMBOL_BEFORE.exec(folded.slice(0, start));
    const word = match?.[1];
    const code = word === undefined ? undefined : SYMBOL_CURRENCY.get(word);
    if (match === null || word === undefined || code === undefined) {
        return null;
    }
    return found(code, match.index, match.index + word.length);
}

function looksLikeDate(folded: string, start: number, end: number, value: number, after: AfterWord | null): boolean {
    const nextWord = after === null ? null : wordAfter(folded, after.end);
    if (after !== null && MONTHS.has(after.word)) {
        return true;
    }
    if (after !== null && OF_WORDS.has(after.word) && nextWord !== null && MONTHS.has(nextWord.word)) {
        return true;
    }
    const previous = lastWord(folded.slice(0, start));
    if (MONTHS.has(previous)) {
        return true;
    }
    if (!Number.isInteger(value) || end - start > 4) {
        return false;
    }
    return value <= 31 ? DAY_BEFORE.has(previous) : value >= 1900 && value <= 2100 && YEAR_BEFORE.has(previous);
}

function amountCandidates(folded: string, decimal: DecimalMark, final: boolean): AmountCandidate[] {
    const candidates: AmountCandidate[] = [];
    for (const match of folded.matchAll(NUMBER)) {
        const [literal] = match;
        const start = match.index;
        let end = start + literal.length;
        const before = folded[start - 1];
        const next = folded[end];
        if (isWordChar(before) || before === ":" || before === "/" || next === "/" || next === "%") {
            continue;
        }
        if (next === ":" && DIGIT.test(folded[end + 1] ?? "")) {
            continue;
        }
        const dangling = (next === "." || next === ",") && end + 1 === folded.length;
        if (dangling && !final) {
            continue;
        }
        let value = parseNumber(literal, decimal);
        if (value === null || !(value > 0)) {
            continue;
        }
        let after = wordAfter(folded, end);
        if (after !== null && (NOT_MONEY_AFTER.has(after.word) || (after.attached && ORDINAL_SUFFIX.has(after.word)))) {
            continue;
        }
        const multiplier = after === null ? undefined : MULTIPLIER.get(after.word);
        if (after !== null && multiplier !== undefined) {
            value *= multiplier;
            ({ end } = after);
            after = wordAfter(folded, end);
        }
        const currency = currencyAfter(after) ?? currencyBefore(folded, start);
        const bare = multiplier === undefined && currency === null;
        // A bare tail may still become "20 mil" or "1.500", so it waits for the next word.
        if (bare && !final && folded.slice(end).trim() === "") {
            continue;
        }
        if (bare && looksLikeDate(folded, start, end, value, after)) {
            continue;
        }
        candidates.push({ currency, end, start, value });
    }
    return candidates;
}

interface NameEntry {
    /** Another name continues this one ("Banesco" and "Banesco USD"), so a match at the tail may still grow. */
    extended: boolean;
    id: string;
    name: string;
}

interface Mention {
    end: number;
    id: string;
    start: number;
}

const foldName = (name: string) => fold(name).trim().split(WHITESPACE).join(" ");

// Spanish says b and v alike, so the transcriber writes "Vanesco" for an account named Banesco.
const betacism = (folded: string) => folded.replaceAll("v", "b");

const MIN_NAME_LENGTH = 2;

// Duplicate names are no match, like `uniqueMatch`: a draft that could land on either is not filled unasked.
function prepareNames(
    rows: readonly { id: string; name: string | null }[],
    spoken: (folded: string) => string
): NameEntry[] {
    const named = rows.flatMap((row) => {
        const name = row.name === null ? "" : spoken(foldName(row.name));
        return name.length >= MIN_NAME_LENGTH ? [{ id: row.id, name }] : [];
    });
    return named
        .filter((row) => named.filter((other) => other.name === row.name).length === 1)
        .map((row) => ({ ...row, extended: named.some((other) => other.name.startsWith(`${row.name} `)) }))
        .sort((a, b) => b.name.length - a.name.length);
}

const overlaps = (a: { end: number; start: number }, b: { end: number; start: number }) =>
    a.start < b.end && b.start < a.end;

function findMentions(
    folded: string,
    entries: readonly NameEntry[],
    final: boolean,
    blocked: readonly { end: number; start: number }[] = []
): Mention[] {
    const kept: Mention[] = [];
    for (const entry of entries) {
        for (let at = folded.indexOf(entry.name); at !== -1; at = folded.indexOf(entry.name, at + 1)) {
            const end = at + entry.name.length;
            const mention = { end, id: entry.id, start: at };
            const wholeWord = !isWordChar(folded[at - 1]) && !isWordChar(folded[end]);
            const waiting = !final && entry.extended && end === folded.length;
            const taken = [...kept, ...blocked].some((other) => overlaps(mention, other));
            if (wholeWord && !waiting && !taken) {
                kept.push(mention);
            }
        }
    }
    return [...kept].sort((a, b) => a.start - b.start);
}

const mentionFound = (mention: Mention) => found(mention.id, mention.start, mention.end);

/** One distinct id or nothing: two different accounts in an entry means the text is not settled. */
function onlyMention(mentions: readonly Mention[]): Found<string> | null {
    const [first] = mentions;
    return first !== undefined && mentions.every((mention) => mention.id === first.id) ? mentionFound(first) : null;
}

function roleOf(folded: string, start: number, lexicon: Lexicon): "from" | "to" | null {
    const words = WORDS_BEFORE.exec(folded.slice(0, start))?.[0].trim().split(WHITESPACE) ?? [];
    for (const word of words.toReversed()) {
        if (lexicon.from.has(word)) {
            return "from";
        }
        if (lexicon.to.has(word)) {
            return "to";
        }
        if (!lexicon.skip.has(word)) {
            return null;
        }
    }
    return null;
}

function incomeOf(lexicon: Lexicon, folded: string, final: boolean): Found<boolean> | null {
    const income = lexicon.income.exec(folded);
    if (income !== null) {
        return found(true, income.index, income.index + income[0].length);
    }
    const expense = lexicon.expense.exec(folded);
    if (expense === null) {
        return null;
    }
    const end = expense.index + expense[0].length;
    // "paid" may still become "paid me", so an expense cue at the tail waits.
    return final || end < folded.length ? found(false, expense.index, end) : null;
}

function dateOf(lexicon: Lexicon, folded: string, now: Date, final: boolean): Found<Date> | null {
    const hits: { ago: number; end: number; start: number }[] = [];
    for (const { ago, re } of lexicon.days) {
        const match = re.exec(folded);
        if (match !== null) {
            hits.push({ ago, end: match.index + match[0].length, start: match.index });
        }
    }
    for (const [weekday, re] of lexicon.weekdays.entries()) {
        const match = re.exec(folded);
        if (match === null) {
            continue;
        }
        const end = match.index + match[0].length;
        // "lunes que viene" is ahead of us, so the word waits for what follows it.
        const mayBeFuture =
            (!final && end === folded.length) ||
            lexicon.future.before.test(folded.slice(0, match.index)) ||
            lexicon.future.after.test(folded.slice(end));
        if (!mayBeFuture) {
            hits.push({ ago: (now.getDay() - weekday + 7) % 7 || 7, end, start: match.index });
        }
    }
    const [first] = [...hits].sort((a, b) => a.start - b.start || b.end - a.end);
    if (first === undefined) {
        return null;
    }
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - first.ago);
    return found(spokenDateToLocal(localIsoDate(day), now), first.start, first.end);
}

function typeOfUnit(unit: string): RecurringType {
    switch (unit.charAt(0)) {
        case "d":
        case "j": {
            return RECURRING_TYPE.daily;
        }
        case "w":
        case "s": {
            return RECURRING_TYPE.weekly;
        }
        case "m": {
            return RECURRING_TYPE.monthly;
        }
        default: {
            return RECURRING_TYPE.yearly;
        }
    }
}

function countOf(count: string | undefined): number {
    if (count === undefined) {
        return 1;
    }
    return count === "other" ? 2 : Number(count);
}

function recurrenceOf(lexicon: Lexicon, folded: string): Found<ResolvedRecurrence> | null {
    const hits: Found<ResolvedRecurrence>[] = [];
    const counted = lexicon.every.exec(folded);
    const count = counted?.[1];
    const unit = counted?.[2];
    if (counted !== null && unit !== undefined) {
        const coefficient = countOf(count);
        if (coefficient >= 1) {
            hits.push(found({ coefficient, type: typeOfUnit(unit) }, counted.index, counted.index + counted[0].length));
        }
    }
    for (const { re, type } of lexicon.cadences) {
        const match = re.exec(folded);
        if (match !== null) {
            hits.push(found({ coefficient: 1, type }, match.index, match.index + match[0].length));
        }
    }
    return [...hits].sort((a, b) => a.start - b.start)[0] ?? null;
}

const EMPTY_DRAFT: LiveDraft = {
    accountId: null,
    amount: null,
    categoryId: null,
    currency: null,
    date: null,
    fromAccountId: null,
    income: null,
    kind: null,
    recurrence: null,
    toAccountId: null,
};

const amountIn = (candidate: AmountCandidate | undefined, code: string) =>
    candidate === undefined ? null : found(roundToMinorUnits(candidate.value, code), candidate.start, candidate.end);

function sourceCurrency(accounts: LiveContext["accounts"], from: Mention | null): Found<string> | null {
    if (from === null) {
        return null;
    }
    const source = accounts.find((account) => account.id === from.id);
    return source === undefined ? null : found(source.currency, from.start, from.end);
}

/** Folds the user's names once; the returned function is cheap enough to run on every partial transcript. */
export function createLiveParser(context: LiveContext): (text: string, options?: LiveParseOptions) => LiveDraft {
    const lexicon: Lexicon = LEXICONS[context.language];
    const spoken = context.language.startsWith("es") ? betacism : (folded: string) => folded;
    const accounts = prepareNames(context.accounts, spoken);
    const expenseCategories = prepareNames(
        context.categories.filter((category) => !category.income),
        spoken
    );
    const incomeCategories = prepareNames(
        context.categories.filter((category) => category.income),
        spoken
    );

    return (text, { final = false } = {}) => {
        const folded = fold(text);
        const chosen = amountCandidates(folded, lexicon.decimal, final);
        const candidate = chosen.find((item) => item.currency !== null) ?? chosen[0];
        const currency = candidate?.currency ?? null;
        const amount = amountIn(candidate, currency?.value ?? context.currency);
        const date = dateOf(lexicon, folded, context.now, final);
        const base: LiveDraft = { ...EMPTY_DRAFT, amount, currency, date };

        const strong = lexicon.transferStrong.exec(folded);
        const weak = strong === null ? lexicon.transferWeak.exec(folded) : null;
        const mentions = findMentions(spoken(folded), accounts, final);
        const roles = mentions.map((mention) => roleOf(folded, mention.start, lexicon));
        const settledWeak = weak !== null && (roles.includes("from") || new Set(mentions.map((m) => m.id)).size > 1);
        const cue = strong ?? (settledWeak ? weak : null);

        if (cue !== null) {
            const loose = mentions.filter((_, index) => roles[index] === null);
            const from = mentions.find((_, index) => roles[index] === "from") ?? null;
            const to = mentions.find((_, index) => roles[index] === "to") ?? null;
            const bothLoose = from === null && to === null && loose.length === 2;
            const fromMention = bothLoose ? (loose[0] ?? null) : from;
            const toMention = bothLoose ? (loose[1] ?? null) : to;
            const sameAccount = fromMention !== null && fromMention.id === toMention?.id;
            const moved = currency ?? sourceCurrency(context.accounts, fromMention);
            return {
                ...base,
                amount: amountIn(candidate, moved?.value ?? context.currency),
                currency: moved,
                fromAccountId: fromMention === null ? null : mentionFound(fromMention),
                kind: found("transfer", cue.index, cue.index + cue[0].length),
                toAccountId: toMention === null || sameAccount ? null : mentionFound(toMention),
            };
        }
        if (weak !== null) {
            return base;
        }

        const income = incomeOf(lexicon, folded, final);
        const categories = findMentions(
            spoken(folded),
            income?.value === true ? incomeCategories : expenseCategories,
            final,
            mentions
        );
        const anchor = amount ?? income;
        return {
            ...base,
            accountId: onlyMention(mentions),
            categoryId: onlyMention(categories),
            income,
            kind: anchor === null ? null : found("entry", anchor.start, anchor.end),
            recurrence: recurrenceOf(lexicon, folded),
        };
    };
}

export function parseLiveDraft(text: string, context: LiveContext, options?: LiveParseOptions): LiveDraft {
    return createLiveParser(context)(text, options);
}
