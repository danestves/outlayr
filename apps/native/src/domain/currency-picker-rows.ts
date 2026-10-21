import { CURRENCY_META, PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";

import { isFavourite } from "./favourite-currencies";

export type CurrencyCode = (typeof PICKABLE_CURRENCY_CODES)[number];

export type CurrencyPickerRow =
    | { kind: "header"; key: string; section: "favourites" | "all" }
    | { kind: "hint"; key: string }
    | {
          kind: "currency";
          key: string;
          code: CurrencyCode;
          favourite: boolean;
          /**
           * The row draws its own separator, so the last in a section must skip it or it stacks a hairline against the
           * next header.
           */
          last: boolean;
      };

const BY_CODE: ReadonlyMap<string, CurrencyCode> = new Map(
    PICKABLE_CURRENCY_CODES.map((code): [string, CurrencyCode] => [code, code])
);

function currencyRow(code: CurrencyCode, favourite: boolean): CurrencyPickerRow {
    return { code, favourite, key: code, kind: "currency", last: false };
}

function closeSections(rows: CurrencyPickerRow[]): CurrencyPickerRow[] {
    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        if (row.kind !== "currency") {
            continue;
        }
        const next = rows[index + 1];
        row.last = next === undefined || next.kind === "header";
    }
    return rows;
}

/**
 * A favourite appears only in the cluster: the catalogue pins its suggested codes too, and repeats would stack
 * identical rows. A search returns flat so the match stays above the fold; an empty cluster keeps a hint row,
 * since nothing advertises the long press.
 */
export function currencyPickerRows(favourites: readonly string[], query: string): CurrencyPickerRow[] {
    const needle = query.trim().toLowerCase();
    const matches =
        needle === ""
            ? PICKABLE_CURRENCY_CODES
            : PICKABLE_CURRENCY_CODES.filter(
                  (code) =>
                      code.toLowerCase().includes(needle) || CURRENCY_META[code].name.toLowerCase().includes(needle)
              );

    if (needle !== "") {
        return closeSections(matches.map((code) => currencyRow(code, isFavourite(favourites, code))));
    }

    const cluster = favourites.flatMap((favourite) => {
        const code = BY_CODE.get(favourite);
        return code === undefined ? [] : [currencyRow(code, true)];
    });
    if (cluster.length === 0) {
        return closeSections([
            { key: "header:favourites", kind: "header", section: "favourites" },
            { key: "hint:favourites", kind: "hint" },
            { key: "header:all", kind: "header", section: "all" },
            ...matches.map((code) => currencyRow(code, false)),
        ]);
    }

    const rest = matches.filter((code) => !isFavourite(favourites, code)).map((code) => currencyRow(code, false));

    return closeSections([
        { key: "header:favourites", kind: "header", section: "favourites" },
        ...cluster,
        { key: "header:all", kind: "header", section: "all" },
        ...rest,
    ]);
}
