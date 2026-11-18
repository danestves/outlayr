import { LANGUAGES } from "@outlayr/shared/i18n";
import { useLoaderData } from "@tanstack/react-router";
import { useIntlayer, useLocale } from "react-intlayer";

import { GetAppButton } from "@/components/get-app";
import { Icon } from "@/components/icon";
import { LocalizedLink } from "@/components/localized-link";
import { proPrices } from "@/lib/pro-prices";

const CADENCES = ["month", "year", "once"] as const;

export function Plans() {
    const { limits, plansCopy, proOnly } = useIntlayer("home");
    const { pricing: copy } = useIntlayer("horizon");
    const { pricing } = useIntlayer("story");
    const { more } = useIntlayer("pricing");
    const { getApp } = useIntlayer("site");
    const { locale } = useLocale();
    const visitorCountry = useLoaderData({ from: "__root__" });
    const prices = proPrices(visitorCountry, locale);
    const price = {
        month: `${prices.monthly.whole}${prices.monthly.fraction}`,
        once: prices.once,
        year: prices.yearly,
    };
    const unit = { month: pricing.month, once: copy.onceUnit, year: copy.yearUnit };
    const country = prices.country
        ? (new Intl.DisplayNames(LANGUAGES[locale].lang, { type: "region" }).of(prices.country) ?? prices.country)
        : null;

    return (
        <section aria-labelledby="pricing-title" className="hz-section" id="pricing">
            <div className="hz-container hz-pricing">
                <div className="hz-price-top" data-reveal="group">
                    <h2 className="hz-head hz-r" id="pricing-title">
                        {copy.lead} <span className="hz-lead-in">{copy.rest}</span>
                    </h2>
                    <div
                        aria-label={copy.cadence.label.value}
                        className="hz-cadence hz-r"
                        role="radiogroup"
                        style={{ "--i": 1 }}
                    >
                        <span aria-hidden="true" className="hz-cadence-thumb" />
                        {CADENCES.map((cadence) => (
                            <label key={cadence}>
                                <input
                                    data-c={cadence}
                                    defaultChecked={cadence === "year"}
                                    name="cadence"
                                    type="radio"
                                    value={cadence}
                                />
                                {copy.cadence[cadence]}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="hz-plans" data-reveal="group">
                    <article aria-labelledby="free-title" className="hz-plan hz-r" data-plan="free">
                        <h3 className="hz-plan-name" id="free-title">
                            {copy.free}
                        </h3>
                        <p className="hz-plan-price">{prices.zero}</p>
                        <p className="hz-plan-unit">{copy.freeUnit}</p>
                        <ul className="hz-plan-list">
                            {limits.map((limit) => (
                                <li key={limit.label.value}>
                                    <Icon name="check" />
                                    {limit.label}
                                    <span className="hz-plan-value">{limit.free}</span>
                                </li>
                            ))}
                        </ul>
                        <GetAppButton className="hz-pill" placement="plan_free" tone="glass">
                            {getApp.title}
                        </GetAppButton>
                    </article>
                    <article aria-labelledby="pro-title" className="hz-plan hz-r" data-plan="pro" style={{ "--i": 1 }}>
                        <h3 className="hz-plan-name" id="pro-title">
                            Pro
                        </h3>
                        <p className="hz-plan-price">
                            <span className="hz-roll">
                                {CADENCES.map((cadence) => (
                                    <span data-roll={cadence} key={cadence}>
                                        {price[cadence]}
                                    </span>
                                ))}
                            </span>
                        </p>
                        <p className="hz-plan-unit">
                            <span className="hz-roll">
                                {CADENCES.map((cadence) => (
                                    <span data-roll={cadence} key={cadence}>
                                        {unit[cadence]}
                                    </span>
                                ))}
                            </span>
                        </p>
                        <ul className="hz-plan-list">
                            {limits.map((limit) => (
                                <li key={limit.label.value}>
                                    <Icon name="check" />
                                    {limit.label}
                                    <span className="hz-plan-value">{limit.pro}</span>
                                </li>
                            ))}
                            {proOnly.map((feature) => (
                                <li key={feature.value}>
                                    <Icon name="check" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                        <GetAppButton className="hz-pill" placement="plan_pro">
                            {getApp.title}
                        </GetAppButton>
                    </article>
                </div>
                <p className="hz-plan-note">
                    {country ? pricing.localNote({ country }) : pricing.note} {plansCopy.footnote}{" "}
                    <LocalizedLink to="/pricing">{more}</LocalizedLink>
                </p>
            </div>
        </section>
    );
}
