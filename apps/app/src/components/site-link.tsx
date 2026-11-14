import { sitePageUrl } from "@outlayr/shared/i18n";
import type { ComponentProps } from "react";
import { useLocale } from "react-intlayer";

export function SiteLink({
    children,
    hash,
    to,
    ...props
}: Omit<ComponentProps<"a">, "href"> & { hash?: string; to: `/${string}` }) {
    const { locale } = useLocale();
    return (
        <a {...props} href={sitePageUrl(hash ? `${to}#${hash}` : to, locale)}>
            {children}
        </a>
    );
}
