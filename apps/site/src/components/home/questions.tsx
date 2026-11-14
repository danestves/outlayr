import { useIntlayer } from "react-intlayer";

import { LocalizedLink } from "@/components/localized-link";
import { StoreBadges } from "@/components/store-badges";
import { CONTAINER } from "@/lib/layout";

import { Words } from "./media";
import { HEADING } from "./problem";

export function Tagline() {
    const { tagline } = useIntlayer("story");
    return (
        <section className={`${CONTAINER} py-24`}>
            <p className="max-w-[680px] text-4xl font-semibold tracking-tight md:text-5xl">
                <Words text={tagline.value} />
            </p>
        </section>
    );
}

export function Questions() {
    const { faq, faqTitle } = useIntlayer("home");
    const { faqLead, faqSupport } = useIntlayer("story");
    return (
        <section className={`${CONTAINER} scroll-mt-24 py-24`} id="faq">
            <div className="grid gap-16 lg:grid-cols-12">
                <div className="lg:col-span-4">
                    <div className="lg:sticky lg:top-24">
                        <h2 className={HEADING} data-reveal>
                            {faqTitle}
                        </h2>
                        <p className="text-muted mt-6 text-lg delay-100" data-reveal>
                            {faqLead}{" "}
                            <LocalizedLink
                                className="fluid text-foreground decoration-border hover:decoration-tint font-medium underline underline-offset-4"
                                to="/support"
                            >
                                {faqSupport}
                            </LocalizedLink>
                        </p>
                    </div>
                </div>
                <dl className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:col-span-8">
                    {faq.map((item, index) => (
                        <div className={index % 2 === 1 ? "delay-100" : ""} data-reveal key={item.question.value}>
                            <dt className="text-lg font-semibold">{item.question}</dt>
                            <dd className="text-muted mt-2 text-base">{item.answer}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </section>
    );
}

export function Closing() {
    const { hero } = useIntlayer("home");
    const { closingLead } = useIntlayer("story");
    return (
        <section className={`${CONTAINER} pt-24`}>
            <div className="bg-surface rounded-3xl px-6 py-16 md:px-16 md:py-24">
                <h2 className="max-w-[680px] pb-2 text-5xl font-semibold tracking-tighter md:text-7xl" data-reveal>
                    {hero.title}
                </h2>
                <p className="text-muted mt-6 max-w-[680px] text-lg delay-100 md:text-xl" data-reveal>
                    {closingLead}
                </p>
                <div className="mt-10 delay-200" data-reveal>
                    <StoreBadges placement="closing" />
                </div>
            </div>
        </section>
    );
}
