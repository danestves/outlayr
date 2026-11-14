import { useIntlayer } from "react-intlayer";

import { Icon } from "./icon";
import { LocalizedLink } from "./localized-link";
import { Page } from "./page";

const PAGES = [
    { id: "home", to: "/" },
    { id: "support", to: "/support" },
    { id: "terms", to: "/terms" },
    { id: "privacy", to: "/privacy" },
] as const;

export function NotFound() {
    const { notFound } = useIntlayer("site");
    return (
        <Page meta={notFound.meta} title={notFound.title}>
            <ul className="mt-12 flex flex-wrap gap-2 delay-300" data-reveal>
                {PAGES.map((page) => (
                    <li key={page.id}>
                        <LocalizedLink
                            className="fluid bg-surface hover:bg-foreground/5 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold active:scale-[0.98]"
                            to={page.to}
                        >
                            {notFound.pages[page.id]}
                            <Icon className="text-muted" name="arrow-right" />
                        </LocalizedLink>
                    </li>
                ))}
            </ul>
        </Page>
    );
}
