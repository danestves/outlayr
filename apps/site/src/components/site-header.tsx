import { useLocation } from "@tanstack/react-router";
import { getPathWithoutLocale } from "intlayer";
import { lazy, Suspense, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useScrollSpy } from "@/lib/scroll-spy";
import { SOURCE_URL } from "@/lib/site";

import { GetAppButton, GetAppDialog } from "./get-app";
import { Icon } from "./icon";
import { LocalizedLink } from "./localized-link";
import { LogoMark } from "./logo-mark";

const SECTIONS = ["how", "features", "pricing"] as const;

type Section = (typeof SECTIONS)[number];

const PILL =
    "fluid block rounded-full px-3 py-2 text-sm whitespace-nowrap text-muted hover:text-foreground aria-[current=page]:bg-foreground/5 aria-[current=page]:text-foreground data-[current]:bg-foreground/5 data-[current]:text-foreground";

const SiteMenu = lazy(async () => {
    const module = await import("./site-menu");
    return { default: module.SiteMenu };
});

const WATCHED = ["top", ...SECTIONS];

function useCurrentSection(enabled: boolean) {
    const [current, setCurrent] = useState<Section | null>(null);
    useScrollSpy(enabled ? WATCHED : [], "-45% 0px -50% 0px", (_, entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                setCurrent(SECTIONS.find((section) => section === entry.target.id) ?? null);
            }
        }
    });
    return enabled ? current : null;
}

function useNavLinks() {
    const { footer, nav } = useIntlayer("site");
    return [
        { hash: "how", label: nav.how, to: "/" },
        { hash: "features", label: nav.features, to: "/" },
        { hash: "pricing", label: nav.pricing, to: "/" },
        { label: footer.guides, to: "/guides" },
        { label: footer.blog, to: "/blog" },
        { label: footer.support, to: "/support" },
    ] as const;
}

export type NavLinks = ReturnType<typeof useNavLinks>;

export function SiteHeader() {
    const { getApp, home, nav } = useIntlayer("site");
    const [menu, setMenu] = useState(false);
    const [open, setOpen] = useState(false);
    const path = getPathWithoutLocale(useLocation({ select: (location) => location.pathname }));
    const isHome = path === "/";
    const current = useCurrentSection(isHome);
    const links = useNavLinks();
    const warmMenu = () => setMenu(true);

    return (
        <>
            <a
                className="fluid bg-foreground text-background fixed top-4 left-4 z-50 -translate-y-24 rounded-full px-3 py-2 text-sm font-semibold focus:translate-y-0"
                href="#main"
            >
                {nav.skip}
            </a>
            <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] print:hidden">
                <nav
                    aria-label={nav.label.value}
                    className="site-nav glass text-foreground pointer-events-auto relative mx-auto grid h-14 max-w-[1120px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-full pr-2 pl-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
                    data-ground={isHome ? "day" : undefined}
                    data-site-nav
                >
                    <LocalizedLink
                        aria-label={home.value}
                        className="fluid flex items-center gap-2 justify-self-start rounded-xl text-[1.1875rem] font-semibold tracking-[-0.035em] hover:opacity-80"
                        to="/"
                    >
                        <LogoMark className="size-7" />
                        Outlayr
                    </LocalizedLink>
                    <ul className="hidden items-center gap-0.5 lg:flex">
                        {links.map((link) => (
                            <li key={link.label.value}>
                                <LocalizedLink
                                    activeOptions={{ exact: true, includeHash: true }}
                                    className={PILL}
                                    data-current={"hash" in link && current === link.hash ? "" : undefined}
                                    hash={"hash" in link ? link.hash : undefined}
                                    to={link.to}
                                >
                                    {link.label}
                                </LocalizedLink>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center gap-1 justify-self-end">
                        <a
                            aria-label={nav.github.value}
                            className="fluid hover:bg-foreground/5 hidden size-10 place-items-center rounded-full active:scale-[0.96] lg:grid"
                            href={SOURCE_URL}
                        >
                            <Icon className="text-xl" name="github-logo" />
                        </a>
                        <GetAppButton
                            className="bg-foreground text-background hover:not-disabled:bg-foreground/90 h-10 px-5 text-[0.9375rem]"
                            placement="nav"
                        >
                            {getApp.title}
                        </GetAppButton>
                        <button
                            aria-expanded={open}
                            aria-haspopup="dialog"
                            aria-label={nav.open.value}
                            className="fluid hover:bg-foreground/5 grid size-10 place-items-center rounded-full active:scale-[0.96] lg:hidden"
                            onClick={() => {
                                setMenu(true);
                                setOpen(true);
                            }}
                            onFocus={warmMenu}
                            onPointerDown={warmMenu}
                            onPointerEnter={warmMenu}
                            type="button"
                        >
                            <Icon className="text-xl" name="menu" />
                        </button>
                        {menu ? (
                            <Suspense fallback={null}>
                                <SiteMenu links={links} onOpenChange={setOpen} open={open} />
                            </Suspense>
                        ) : null}
                    </div>
                </nav>
            </header>
            <GetAppDialog />
        </>
    );
}
