/**
 * Any field may be unresolved, where `ColumnMapping` requires the three the importer
 * cannot run without.
 */
export interface ColumnMappingGuess {
    amount: number | null;
    category: number | null;
    currency: number | null;
    date: number | null;
    exchangeRate: number | null;
    exchangeRateType: number | null;
    note: number | null;
    type: number | null;
}

/** Which CSV column feeds each field. `null` means the file carries none. */
export interface ColumnMapping {
    amount: number;
    category: number;
    currency: number | null;
    date: number;
    exchangeRate: number | null;
    exchangeRateType: number | null;
    /** Optional: an unmapped note falls back to the category's name on write. */
    note: number | null;
    type: number | null;
}

const HEADER_HINTS = {
    amount: [
        "amount",
        "value",
        "total",
        "sum",
        "debit",
        "price",
        "cost",
        "monto",
        "importe",
        "valor",
        "precio",
        "betrag",
    ],
    category: ["category", "categories", "tag", "categoria", "etiqueta", "kategorie"],
    currency: ["currency", "wahrung", "waehrung", "code", "ccy", "moneda", "moeda", "divisa"],
    date: ["date", "time", "posted", "when", "fecha", "data", "buchungstag", "buchungsdatum", "datum"],
    exchangeRate: ["exchange rate", "rate"],
    exchangeRateType: ["exchange rate type", "rate type"],
    note: [
        "note",
        "description",
        "memo",
        "payee",
        "merchant",
        "name",
        "nombre",
        "nome",
        "details",
        "source",
        "concepto",
        "descripcion",
        "descricao",
        "detalle",
        "comercio",
        "notiz",
        "beguenstigter",
        "zahlungsbeteiligter",
        "empfanger",
        "verwendungszweck",
    ],
    type: ["type", "direction", "kind", "tipo", "typ"],
} satisfies Record<keyof ColumnMapping, readonly string[]>;

const COMBINING_MARKS = /\p{M}/gu;

const LETTER = /\p{L}/u;
const startsWord = (cell: string, hint: string) => {
    for (let at = cell.indexOf(hint); at !== -1; at = cell.indexOf(hint, at + 1)) {
        if (at === 0 || !LETTER.test(cell[at - 1] ?? "")) {
            return true;
        }
    }
    return false;
};

// Match specific overlapping labels before their general substring forms;
// unlike object keys, this order is not changed by property-sorting formatters.
const HEADER_MATCH_ORDER: readonly (keyof ColumnMapping)[] = [
    "exchangeRateType",
    "exchangeRate",
    "amount",
    "category",
    "currency",
    "date",
    "note",
    "type",
];

/**
 * A file this app exported maps itself. Fields it cannot place stay `null` for the user
 * to assign, which is why `date` and `amount` widen here but not in {@link ColumnMapping}.
 */
export function guessMapping(header: readonly string[]): ColumnMappingGuess {
    const normalized = header.map((cell) => cell.trim().normalize("NFD").replaceAll(COMBINING_MARKS, "").toLowerCase());
    const taken = new Set<number>();
    const guess: ColumnMappingGuess = {
        amount: null,
        category: null,
        currency: null,
        date: null,
        exchangeRate: null,
        exchangeRateType: null,
        note: null,
        type: null,
    };

    for (const field of HEADER_MATCH_ORDER) {
        for (const hint of HEADER_HINTS[field]) {
            const index = normalized.findIndex((cell, at) => !taken.has(at) && startsWord(cell, hint));
            if (index !== -1) {
                guess[field] = index;
                taken.add(index);
                break;
            }
        }
    }
    return guess;
}

const ANY_DIGIT = /\d/;

/**
 * A first line with no digit in it is a header, because a data row always carries at
 * least a date or an amount.
 */
export interface HeaderAndRows {
    /** Null when the first line was data, not a header. */
    header: string[] | null;
    rows: string[][];
}

export function splitHeaderAndRows(lines: string[][]): HeaderAndRows {
    const first = lines[0] ?? [];
    const looksLikeHeader = !ANY_DIGIT.test(first.join(""));
    const rows = looksLikeHeader ? lines.slice(1) : lines;
    return { header: looksLikeHeader ? first : null, rows };
}
