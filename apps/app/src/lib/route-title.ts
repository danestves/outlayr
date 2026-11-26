import type { Locale } from "@outlayr/shared/i18n";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { defaultLocale, getIntlayer, isDeclaredLocale } from "intlayer";

import { readDashboardLocale } from "./dashboard-locale";

interface MatchLike {
    loaderData?: unknown;
}

type RouteTitleKey = keyof ReturnType<typeof getIntlayer<"route-titles">>;

const decodeRootData = Schema.decodeUnknownOption(Schema.Struct({ locale: Schema.String }));

export const localeOf = (matches: readonly MatchLike[]): Locale => {
    const root = Option.getOrUndefined(decodeRootData(matches[0]?.loaderData));
    return readDashboardLocale(root !== undefined && isDeclaredLocale(root.locale) ? root.locale : defaultLocale);
};

export function pageHead(key: RouteTitleKey) {
    return ({ matches }: { matches: readonly MatchLike[] }) => {
        const title = getIntlayer("route-titles", localeOf(matches))[key];
        return { meta: [{ title: `${String(title)} · Outlayr` }] };
    };
}

export function localizedText(key: RouteTitleKey, matches: readonly MatchLike[]): string {
    return String(getIntlayer("route-titles", localeOf(matches))[key]);
}
