import { useLoaderData } from "@tanstack/react-router";
import { useIntlayer, useLocale } from "react-intlayer";

import { Icon } from "@/components/icon";
import { LANGUAGES } from "@/lib/i18n";
import { CONTAINER } from "@/lib/layout";
import { proPrices } from "@/lib/pro-prices";

import { HEADING, LABEL } from "./problem";

export function Pricing() {
    const { limits, plansCopy, proOnly } = useIntlayer("home");
    const { pricing } = useIntlayer("story");
    const { locale } = useLocale();
    const { lang } = LANGUAGES[locale];
    const prices = proPrices(useLoaderData({ from: "__root__" }), locale);
    return (
        <section className={`${CONTAINER} scroll-mt-24 py-24`} id="pricing">
            <p className={LABEL} data-reveal>
                {pricing.label}
            </p>
            <h2 className={`${HEADING} mt-4 max-w-[680px] delay-100`} data-reveal>
                {pricing.title}
            </h2>
            <p className="text-muted mt-6 max-w-[680px] text-lg delay-200" data-reveal>
                {pricing.lead}
            </p>
            <div className="mt-16 grid gap-4 lg:grid-cols-2">
                <div className="bg-surface flex flex-col rounded-3xl p-6 md:p-8" data-reveal>
                    <div className="min-h-40">
                        <h3 className="text-lg font-semibold">Outlayr</h3>
                        <p className="mt-4 text-5xl font-semibold tracking-tight">{prices.zero}</p>
                        <p className="text-muted mt-3 text-sm">{plansCopy.lead}</p>
                    </div>
                    <ul className="mt-8 flex flex-col gap-3 text-base">
                        {limits.map((limit) => (
                            <li className="flex items-baseline justify-between gap-4" key={limit.label.value}>
                                <span className="flex gap-3">
                                    <Icon className="mt-1 shrink-0" name="check" />
                                    {limit.label}
                                </span>
                                <span className="text-muted font-mono text-sm tabular-nums">{limit.free}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div
                    className="bg-foreground text-background relative flex flex-col rounded-3xl p-6 delay-100 md:p-8"
                    data-reveal
                >
                    <div className="min-h-40">
                        <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-semibold">
                            Outlayr Pro
                            <span className="flex items-center gap-2 text-sm font-medium">
                                <span className="bg-tint size-2 rounded-sm" />
                                {pricing.trial}
                            </span>
                        </h3>
                        <p className="mt-4 flex items-baseline gap-2">
                            <span className="text-5xl font-semibold tracking-tight">
                                {prices.monthly.whole}
                                <span className="text-2xl opacity-60">{prices.monthly.fraction}</span>
                            </span>
                            <span className="text-base opacity-60">{pricing.month}</span>
                        </p>
                        <p className="mt-3 text-sm opacity-60">
                            {pricing.other({ once: prices.once, yearly: prices.yearly })}
                        </p>
                    </div>
                    <ul className="mt-8 flex flex-col gap-3 text-base">
                        {limits.map((limit) => (
                            <li className="flex items-baseline justify-between gap-4" key={limit.label.value}>
                                <span className="flex gap-3">
                                    <Icon className="text-tint mt-1 shrink-0" name="check" />
                                    {limit.label}
                                </span>
                                <span className="font-mono text-sm tabular-nums">{limit.pro}</span>
                            </li>
                        ))}
                        {proOnly.map((feature) => (
                            <li className="flex gap-3" key={feature.value}>
                                <Icon className="text-tint mt-1 shrink-0" name="check" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <p className="text-muted mt-6 text-sm">
                {prices.country
                    ? pricing.localNote({
                          country: new Intl.DisplayNames(lang, { type: "region" }).of(prices.country) ?? prices.country,
                      })
                    : pricing.note}{" "}
                {plansCopy.footnote}
            </p>
        </section>
    );
}
