import { isPublished } from "@outlayr/shared/i18n";
import { Link } from "@tanstack/react-router";
import { getPrefix } from "intlayer";
import { useIntlayer, useLocale } from "react-intlayer";

import { Icon } from "@/components/icon";
import { LocalizedLink } from "@/components/localized-link";

const PICKS = [
    "best-expense-tracker-apps",
    "best-expense-tracker-apps-latin-america",
    "ynab-alternatives",
    "best-budget-apps",
    "multi-currency-expense-tracker",
    "expense-tracker-template",
] as const;

const STAGGER_CAP = 5;

export function Guides() {
    const { answerLinks, footer } = useIntlayer("site");
    const { allGuides } = useIntlayer("about");
    const { locale } = useLocale();
    const picks = PICKS.filter((slug) => isPublished(`/guides/${slug}`, locale));
    if (picks.length === 0) {
        return null;
    }
    return (
        <section aria-labelledby="guides-title" className="hz-section" id="guides">
            <div className="hz-container hz-faq">
                <div className="hz-faq-head" data-reveal="group">
                    <h2 className="hz-head hz-r" id="guides-title">
                        {footer.guides}
                    </h2>
                    <p className="hz-definition hz-r" style={{ "--i": 1 }}>
                        <LocalizedLink to="/guides">{allGuides}</LocalizedLink>
                    </p>
                </div>
                <ul className="hz-faq-list" data-reveal="group">
                    {picks.map((slug, index) => (
                        <li className="hz-qa hz-r" key={slug} style={{ "--i": Math.min(index, STAGGER_CAP) }}>
                            <Link
                                className="hz-guide"
                                params={{ locale: getPrefix(locale).localePrefix, slug }}
                                to="/{-$locale}/guides/$slug"
                            >
                                {answerLinks.guides[slug]}
                                <Icon name="arrow-right" />
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
