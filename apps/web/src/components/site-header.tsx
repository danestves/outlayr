import { useLocation } from "@tanstack/react-router";
import { getPathWithoutLocale } from "intlayer";
import { useEffect, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { SOURCE_URL } from "@/lib/site";

import { Icon } from "./icon";
import { LocalizedLink } from "./localized-link";
import { LogoMark } from "./logo-mark";

const SECTIONS = ["how", "features", "pricing"] as const;

type Section = (typeof SECTIONS)[number];

const PILL =
    "fluid block rounded-full px-3 py-2 text-sm whitespace-nowrap text-muted hover:text-foreground aria-[current=page]:bg-foreground/5 aria-[current=page]:text-foreground data-[current]:bg-foreground/5 data-[current]:text-foreground";

function useCurrentSection(enabled: boolean) {
    const [current, setCurrent] = useState<Section | null>(null);
    useEffect(() => {
        if (!enabled) {
            return;
        }
        const watcher = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const id = SECTIONS.find((section) => section === entry.target.id);
                        setCurrent(id ?? null);
                    }
                }
            },
            { rootMargin: "-45% 0px -50% 0px" }
        );
        for (const id of ["top", ...SECTIONS]) {
            const element = document.querySelector(`#${id}`);
            if (element) {
                watcher.observe(element);
            }
        }
        return () => watcher.disconnect();
    }, [enabled]);
    return enabled ? current : null;
}

export function SiteHeader() {
    const { footer, home, nav } = useIntlayer("site");
    const [open, setOpen] = useState(false);
    const path = getPathWithoutLocale(useLocation({ select: (location) => location.pathname }));
    const current = useCurrentSection(path === "/");

    useEffect(() => {
        if (!open) {
            return;
        }
        document.body.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };
        addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = "";
            removeEventListener("keydown", onKey);
        };
    }, [open]);

    const links = [
        { hash: "how", label: nav.how, to: "/" },
        { hash: "features", label: nav.features, to: "/" },
        { hash: "pricing", label: nav.pricing, to: "/" },
        { label: footer.guides, to: "/guides" },
        { label: footer.support, to: "/support" },
    ] as const;

    return (
        <>
            <a
                className="fluid bg-foreground text-background fixed top-4 left-4 z-50 -translate-y-24 rounded-full px-3 py-2 text-sm font-semibold focus:translate-y-0"
                href="#main"
            >
                {nav.skip}
            </a>
            <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-6 print:hidden">
                <nav
                    aria-label={nav.label.value}
                    className="glass pointer-events-auto flex w-max items-center gap-1 rounded-full p-2 pl-4"
                >
                    <LocalizedLink
                        aria-label={home.value}
                        className="flex items-center gap-2 pr-2 text-base font-semibold tracking-tight"
                        onClick={() => setOpen(false)}
                        to="/"
                    >
                        <LogoMark className="size-6" />
                        Outlayr
                    </LocalizedLink>
                    <ul className="hidden items-center gap-1 md:flex">
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
                    <a
                        aria-label={nav.github.value}
                        className="fluid text-muted hover:text-foreground hover:bg-foreground/5 flex size-11 items-center justify-center rounded-full active:scale-[0.98]"
                        href={SOURCE_URL}
                    >
                        <Icon className="text-xl" name="github-logo" />
                    </a>
                    <button
                        aria-controls="site-menu"
                        aria-expanded={open}
                        aria-label={open ? nav.close.value : nav.open.value}
                        className="fluid hover:bg-foreground/5 relative size-11 rounded-full active:scale-[0.98] md:hidden"
                        onClick={() => setOpen(!open)}
                        type="button"
                    >
                        <span
                            className={`fluid absolute top-1/2 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-current ${open ? "rotate-45" : "-translate-y-1"}`}
                        />
                        <span
                            className={`fluid absolute top-1/2 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-current ${open ? "-rotate-45" : "translate-y-1"}`}
                        />
                    </button>
                </nav>
            </header>
            <div
                aria-hidden={!open}
                className={`fluid bg-background/80 fixed inset-0 z-40 flex flex-col justify-center px-6 backdrop-blur-3xl md:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`}
                id="site-menu"
                inert={!open}
            >
                <ul className="flex flex-col gap-4">
                    {links.map((link, index) => (
                        <li
                            className={`fluid ${open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"}`}
                            key={link.label.value}
                            style={{ transitionDelay: open ? `${100 + index * 50}ms` : "0ms" }}
                        >
                            <LocalizedLink
                                className="text-4xl font-semibold tracking-tight"
                                hash={"hash" in link ? link.hash : undefined}
                                onClick={() => setOpen(false)}
                                to={link.to}
                            >
                                {link.label}
                            </LocalizedLink>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}
