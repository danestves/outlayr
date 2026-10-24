import { useIntlayer, useLocale } from "react-intlayer";

import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon";
import { CONTAINER } from "@/lib/layout";

import { Phone, Screen, screenSources } from "./media";
import { HEADING, LABEL } from "./problem";

const SHIFTS = ["translate-y-12", "", "-translate-y-12", "", "translate-y-12"] as const;
const TRUST: IconName[] = ["prohibit", "fingerprint", "wifi-slash", "export"];

export function Screens() {
    const { hero, tour } = useIntlayer("home");
    const { screens } = useIntlayer("story");
    const { locale } = useLocale();
    const [budgets, insights, accounts, subscriptions] = tour;
    const shots = [
        { alt: budgets?.alt.value ?? "", ...screenSources("04", locale) },
        { alt: insights?.alt.value ?? "", ...screenSources("05", locale) },
        { alt: hero.videoLabel.value, ...screenSources("log-an-expense", locale) },
        { alt: subscriptions?.alt.value ?? "", ...screenSources("10", locale) },
        { alt: accounts?.alt.value ?? "", ...screenSources("06", locale) },
    ];
    return (
        <section aria-label={screens.label.value} className="overflow-clip py-24">
            <div className="strip flex justify-center gap-6">
                {shots.map((shot, index) => (
                    <div
                        className={`w-56 shrink-0 md:w-72 ${SHIFTS[index] ?? ""} ${index === 2 ? "" : "delay-100"}`}
                        data-reveal
                        key={shot.src}
                    >
                        <Phone className="drop-shadow-[0_32px_48px_rgb(19_18_9/0.3)]">
                            <Screen alt={shot.alt} dark={shot.dark} src={shot.src} />
                        </Phone>
                    </div>
                ))}
            </div>
        </section>
    );
}

export function Trust() {
    const { trust } = useIntlayer("story");
    return (
        <section className={`${CONTAINER} py-24`}>
            <div className="grid gap-16 lg:grid-cols-12">
                <div className="lg:col-span-5">
                    <h2 className={HEADING} data-reveal>
                        {trust.title}
                    </h2>
                    <p className="text-muted mt-6 text-lg delay-100" data-reveal>
                        {trust.lead}
                    </p>
                </div>
                <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:col-span-7">
                    {trust.items.map((item, index) => (
                        <li
                            className={`flex gap-4 ${index % 2 === 1 ? "delay-100" : ""}`}
                            data-reveal
                            key={item.title.value}
                        >
                            <Icon className="text-tint shrink-0 text-2xl" name={TRUST[index] ?? "prohibit"} />
                            <div>
                                <h3 className="text-lg font-semibold">{item.title}</h3>
                                <p className="text-muted mt-1 text-base">{item.body}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

export function Extras() {
    const { extras, extrasTitle } = useIntlayer("home");
    return (
        <section className={`${CONTAINER} py-24`}>
            <h2 className={HEADING} data-reveal>
                {extrasTitle}
            </h2>
            <dl className="mt-12 grid gap-x-12 sm:grid-cols-2">
                {extras.map((extra) => (
                    <div
                        className="border-border grid gap-1 border-t py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4"
                        data-reveal
                        key={extra.label.value}
                    >
                        <dt className={`${LABEL} pt-1`}>{extra.label}</dt>
                        <dd className="text-base">{extra.text}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
