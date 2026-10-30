import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { CONTAINER } from "@/lib/layout";
import { COMPANY, COMPANY_URL, SOURCE_URL, SUPPORT_EMAIL } from "@/lib/site";

import { ConsentSwitch } from "./consent-switch";
import { LanguageSwitch } from "./language-switch";
import { LocalizedLink } from "./localized-link";
import type { LocalizedTo } from "./localized-link";
import { LogoMark } from "./logo-mark";
import { ThemeSwitch } from "./theme-switch";

const YEAR = new Date().getUTCFullYear();

const LINK = "fluid text-muted hover:text-foreground -my-1.5 inline-block py-1.5";

function Column({ children, title }: { children: ReactNode; title: ReactNode }) {
    return (
        <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <ul className="mt-4 flex flex-col gap-3 text-sm">{children}</ul>
        </div>
    );
}

function Item({ children, hash, to }: { children: ReactNode; hash?: string; to: LocalizedTo }) {
    return (
        <li>
            <LocalizedLink className={LINK} hash={hash} to={to}>
                {children}
            </LocalizedLink>
        </li>
    );
}

export function SiteFooter() {
    const { footer, home, nav } = useIntlayer("site");
    return (
        <footer className="print:hidden">
            <div className={`${CONTAINER} pt-24 pb-12`}>
                <div className="border-border flex flex-col gap-12 border-t pt-12 lg:flex-row lg:justify-between">
                    <div className="max-w-xs">
                        <LocalizedLink
                            aria-label={home.value}
                            className="flex items-center gap-2 text-base font-semibold tracking-tight"
                            to="/"
                        >
                            <LogoMark className="size-6" />
                            Outlayr
                        </LocalizedLink>
                        <p className="text-muted mt-4 text-sm">{footer.tagline}</p>
                        <div className="mt-6 flex flex-col items-start gap-3">
                            <a href="https://peerpush.com/p/outlayr">
                                <img
                                    alt="Outlayr on PeerPush"
                                    className="h-auto w-[230px]"
                                    height="65"
                                    loading="lazy"
                                    src="https://peerpush.com/p/outlayr/badge.png"
                                    width="230"
                                />
                            </a>
                            <a href="https://alternativeto.net/software/outlayr/about/?utm_source=badge&utm_medium=referral">
                                <img
                                    alt="Outlayr | AlternativeTo"
                                    className="h-auto w-[244px]"
                                    height="79"
                                    loading="lazy"
                                    src="https://alternativeto.net/static/badges/badge-compact-color.svg"
                                    width="244"
                                />
                            </a>
                        </div>
                    </div>
                    <nav aria-label={footer.nav.value} className="grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-3">
                        <Column title={footer.product}>
                            <Item hash="how" to="/">
                                {nav.how}
                            </Item>
                            <Item hash="features" to="/">
                                {nav.features}
                            </Item>
                            <Item hash="pricing" to="/">
                                {nav.pricing}
                            </Item>
                        </Column>
                        <Column title={footer.resources}>
                            <Item to="/guides">{footer.guides}</Item>
                            <Item to="/compare">{footer.compare}</Item>
                            <Item to="/tools">{footer.tools}</Item>
                            <Item to="/support">{footer.support}</Item>
                            <li>
                                <a className={LINK} href={SOURCE_URL}>
                                    {footer.source}
                                </a>
                            </li>
                        </Column>
                        <Column title={footer.company}>
                            <Item to="/about">{footer.about}</Item>
                            <Item to="/privacy">{footer.privacy}</Item>
                            <Item to="/terms">{footer.terms}</Item>
                            <li>
                                <a className={LINK} href={`mailto:${SUPPORT_EMAIL}`}>
                                    {footer.email}
                                </a>
                            </li>
                        </Column>
                    </nav>
                </div>
                <div className="border-border mt-12 flex flex-col gap-6 border-t pt-8 md:flex-row md:items-center md:justify-between">
                    <p className="text-muted text-xs">
                        © {YEAR}{" "}
                        <a className="fluid hover:text-foreground" href={COMPANY_URL}>
                            {COMPANY}
                        </a>
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <LanguageSwitch />
                        <ThemeSwitch />
                        <ConsentSwitch />
                    </div>
                </div>
                <p className="text-muted mt-6 text-xs">{footer.trademarks}</p>
            </div>
        </footer>
    );
}
