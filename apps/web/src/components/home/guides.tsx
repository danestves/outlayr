import { Link } from "@tanstack/react-router";
import { getPrefix } from "intlayer";
import { useIntlayer, useLocale } from "react-intlayer";

import { Icon } from "@/components/icon";
import { LocalizedLink } from "@/components/localized-link";
import { CONTAINER } from "@/lib/layout";

import { LABEL } from "./problem";

const PICKS = [
    "best-expense-tracker-apps",
    "ynab-alternatives",
    "best-budget-apps",
    "multi-currency-expense-tracker",
    "expense-tracker-template",
] as const;

export function Guides() {
    const { answerLinks, footer } = useIntlayer("site");
    const { allGuides } = useIntlayer("about");
    const { locale } = useLocale();
    return (
        <section aria-labelledby="home-guides" className={`${CONTAINER} py-24`}>
            <div className="border-foreground flex items-baseline justify-between gap-6 border-b pb-3" data-reveal>
                <h2 className={LABEL} id="home-guides">
                    {footer.guides}
                </h2>
                <LocalizedLink className="fluid text-muted hover:text-foreground text-sm" to="/guides">
                    {allGuides}
                </LocalizedLink>
            </div>
            <ul>
                {PICKS.map((slug) => (
                    <li className="border-border border-b" data-reveal key={slug}>
                        <Link
                            className="fluid group hover:text-tint flex items-center justify-between gap-6 py-4 text-lg"
                            params={{ locale: getPrefix(locale).localePrefix, slug }}
                            to="/{-$locale}/guides/$slug"
                        >
                            {answerLinks.guides[slug]}
                            <Icon className="text-muted fluid group-hover:translate-x-0.5" name="arrow-right" />
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
