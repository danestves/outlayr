import InstagramIcon from "@hugeicons/core-free-icons/InstagramIcon";
import Linkedin01Icon from "@hugeicons/core-free-icons/Linkedin01Icon";
import NewTwitterIcon from "@hugeicons/core-free-icons/NewTwitterIcon";
import TiktokIcon from "@hugeicons/core-free-icons/TiktokIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { SUPPORT_EMAIL } from "@outlayr/shared/urls";
import { useLocation } from "@tanstack/react-router";
import { getPathWithoutLocale } from "intlayer";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { CONTAINER } from "@/lib/layout";
import { COMPANY, COMPANY_URL, INSTAGRAM_URL, LINKEDIN_URL, SOURCE_URL, TIKTOK_URL, X_URL } from "@/lib/site";

import { ConsentSwitch } from "./consent-switch";
import { LanguageSwitch } from "./language-switch";
import { LocalizedLink } from "./localized-link";
import type { LocalizedTo } from "./localized-link";
import { LogoMark } from "./logo-mark";
import { ThemeSwitch } from "./theme-switch";

const YEAR = new Date().getUTCFullYear();

const LINK = "fluid text-muted hover:text-foreground -my-1.5 inline-block py-1.5";

const LISTINGS = [
    { href: "https://peerpush.com/p/outlayr", key: "peerPush" },
    { href: "https://alternativeto.net/software/outlayr/about/", key: "alternativeTo" },
    { href: "https://www.producthunt.com/products/outlayr", key: "productHunt" },
    { href: "https://sellwithboost.com", key: "sellWithBoost" },
] as const;

const SOCIALS = [
    { href: INSTAGRAM_URL, icon: InstagramIcon, name: "Instagram" },
    { href: LINKEDIN_URL, icon: Linkedin01Icon, name: "LinkedIn" },
    { href: TIKTOK_URL, icon: TiktokIcon, name: "TikTok" },
    { href: X_URL, icon: NewTwitterIcon, name: "X" },
] as const;

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
    const isHome = getPathWithoutLocale(useLocation({ select: (location) => location.pathname })) === "/";
    return (
        <footer
            className="print:hidden"
            data-night-ground={isHome ? "" : undefined}
            data-sky={isHome ? "sunrise" : undefined}
        >
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
                        <ul className="mt-4 -ml-1.5 flex items-center gap-1">
                            {SOCIALS.map(({ href, icon, name }) => (
                                <li key={name}>
                                    <a
                                        aria-label={name}
                                        className="fluid text-muted hover:text-foreground inline-flex p-1.5"
                                        href={href}
                                    >
                                        <HugeiconsIcon icon={icon} size={20} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                        <ul className="mt-6 flex flex-col gap-3 text-sm">
                            {LISTINGS.map(({ href, key }) => (
                                <li key={key}>
                                    <a className={LINK} href={href}>
                                        {footer.listings[key]}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <nav aria-label={footer.nav.value} className="grid grid-cols-2 gap-x-12 gap-y-10 sm:grid-cols-3">
                        <Column title={footer.product}>
                            <Item hash="how" to="/">
                                {nav.how}
                            </Item>
                            <Item hash="features" to="/">
                                {nav.features}
                            </Item>
                            <Item to="/pricing">{nav.pricing}</Item>
                        </Column>
                        <Column title={footer.resources}>
                            <Item to="/guides">{footer.guides}</Item>
                            <Item to="/blog">{footer.blog}</Item>
                            <Item to="/compare">{footer.compare}</Item>
                            <Item to="/tools">{footer.tools}</Item>
                            <Item to="/help">{footer.help}</Item>
                            <Item to="/support">{footer.support}</Item>
                            <li>
                                <a className={LINK} href={SOURCE_URL}>
                                    {footer.source}
                                </a>
                            </li>
                        </Column>
                        <Column title={footer.company}>
                            <Item to="/about">{footer.about}</Item>
                            <Item to="/brand">{footer.brand}</Item>
                            <Item to="/open">{footer.open}</Item>
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
                <p className="text-muted mt-2 text-xs">{footer.owners}</p>
            </div>
        </footer>
    );
}
