import type { Locale } from "@outlayr/shared/i18n";
import { getIntlayer } from "intlayer";

type Native = ReturnType<typeof getIntlayer<"appUi">>["native"];
type Plural<Key> = Key extends `${infer Base}_one` | `${infer Base}_other` ? Base : never;
export type AppKey = keyof Native | Plural<keyof Native>;
type Params = Readonly<Record<string, string | number>> & { readonly count?: number };

const PLACEHOLDER = /\{(\w+)\}/g;

export function interpolate(template: string, params: Params | undefined): string {
    return params ? template.replaceAll(PLACEHOLDER, (match, name: string) => String(params[name] ?? match)) : template;
}

const isKey = (catalog: Native, key: string): key is keyof Native => key in catalog;

export function appTranslator(locale: Locale) {
    const catalog = getIntlayer("appUi", locale).native;
    return (key: AppKey, params?: Params): string => {
        const plural = params?.count === undefined ? key : `${key}${params.count === 1 ? "_one" : "_other"}`;
        const found = isKey(catalog, plural) ? plural : key;
        return isKey(catalog, found) ? interpolate(String(catalog[found]), params) : key;
    };
}

export type AppT = ReturnType<typeof appTranslator>;
