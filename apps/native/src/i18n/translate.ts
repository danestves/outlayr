export type Catalog = Readonly<Record<string, string>>;

export type TranslationParams = Readonly<Record<string, string | number | null | undefined>> & {
    /** A catalog with no `_one`/`_other` pair for the key still renders it as a plain placeholder. */
    readonly count?: number;
};

interface TranslateOptions {
    catalog: Catalog;
    fallback: Catalog;
    params?: TranslationParams;
}

const PLACEHOLDER = /\{(\w+)\}/g;

export function interpolate(template: string, params: TranslationParams | undefined): string {
    if (!params) {
        return template;
    }
    // `null` renders empty; `undefined` keeps the placeholder visible so a wiring mistake shows.
    return template.replace(PLACEHOLDER, (match, name: string) => {
        const value = params[name];
        if (value === undefined) {
            return match;
        }
        return value === null ? "" : String(value);
    });
}

/** Chosen by hand, not through `Intl.PluralRules`: Hermes ships no ICU plural data. */
function pluralSuffix(count: number): "_one" | "_other" {
    return count === 1 ? "_one" : "_other";
}

function lookup(key: string, catalog: Catalog, fallback: Catalog) {
    return catalog[key] ?? fallback[key];
}

export function translate(key: string, { catalog, fallback, params }: TranslateOptions): string {
    const count = params?.count;
    if (count !== undefined) {
        const pluralised = `${key}${pluralSuffix(count)}`;
        const form = lookup(pluralised, catalog, fallback);
        if (form !== undefined) {
            return interpolate(form, params);
        }
    }
    const template = lookup(key, catalog, fallback);
    return template === undefined ? key : interpolate(template, params);
}
