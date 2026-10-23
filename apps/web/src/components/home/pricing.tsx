import { useIntlayer } from "react-intlayer";

import { Icon } from "@/components/icon";
import { CONTAINER } from "@/lib/layout";

import { HEADING, LABEL } from "./problem";

export function Pricing() {
    const { limits, plansCopy, proOnly } = useIntlayer("home");
    const { pricing } = useIntlayer("story");
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
                        <p className="mt-4 text-5xl font-semibold tracking-tight">{pricing.zero}</p>
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
                    className="bg-foreground text-background flex flex-col rounded-3xl p-6 delay-100 md:p-8"
                    data-reveal
                    data-spot
                >
                    <div className="min-h-40">
                        <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-semibold">
                            Outlayr Pro
                            <span className="text-tint text-sm font-medium">{pricing.trial}</span>
                        </h3>
                        <p className="mt-4 flex items-baseline gap-2">
                            <span className="text-5xl font-semibold tracking-tight">
                                {pricing.price}
                                <span className="text-2xl opacity-60">{pricing.cents}</span>
                            </span>
                            <span className="text-base opacity-60">{pricing.month}</span>
                        </p>
                        <p className="mt-3 text-sm opacity-60">{pricing.other}</p>
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
                {pricing.note} {plansCopy.footnote}
            </p>
        </section>
    );
}
