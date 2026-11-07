import { Link } from "@tanstack/react-router";
import type { LinkComponentProps } from "@tanstack/react-router";
import { useLocale } from "react-intlayer";

import { linkPrefix } from "@/lib/i18n";

const LOCALE_SEGMENT = "/{-$locale}";

type StripLocale<T> = T extends typeof LOCALE_SEGMENT
    ? "/"
    : T extends `${typeof LOCALE_SEGMENT}${infer Rest}`
      ? Rest
      : never;

export type LocalizedTo = StripLocale<NonNullable<LinkComponentProps["to"]>>;

export function LocalizedLink({ to, ...props }: Omit<LinkComponentProps, "params" | "to"> & { to: LocalizedTo }) {
    const { locale } = useLocale();
    return (
        <Link
            {...props}
            params={{ locale: linkPrefix(to, locale) }}
            to={to === "/" ? LOCALE_SEGMENT : `${LOCALE_SEGMENT}${to}`}
        />
    );
}
