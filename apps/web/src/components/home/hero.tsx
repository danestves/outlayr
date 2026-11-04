import { useState } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { COFFEE_SHOP } from "@/components/demo/capture-panels";
import { formatMoney } from "@/components/demo/money";
import { useNames } from "@/components/demo/use-names";
import { Icon } from "@/components/icon";
import { StoreBadges } from "@/components/store-badges";
import type { Locale } from "@/lib/i18n";
import { CONTAINER } from "@/lib/layout";

import { FilmFrame } from "./films/frame";
import { LogFilm } from "./films/log";
import { Phone } from "./media";
import { parsePurchase } from "./parse-purchase";

export function Hero() {
    const { hero } = useIntlayer("home");
    const story = useIntlayer("story");
    const { locale } = useLocale();
    return (
        <section className="relative" id="top">
            <div className={`${CONTAINER} grid items-center gap-16 pt-24 pb-24 lg:grid-cols-12`}>
                <div className="mt-8 md:mt-16 lg:col-span-7">
                    <h1
                        className="max-w-[680px] pb-2 text-5xl font-semibold tracking-tighter delay-100 md:text-7xl"
                        data-reveal
                    >
                        {hero.title}
                    </h1>
                    <LivePurchase key={locale} locale={locale} />
                    <div className="mt-10 delay-300" data-reveal>
                        <StoreBadges placement="hero" />
                    </div>
                    <ul className="text-muted mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm delay-500" data-reveal>
                        {story.hero.proof.map((item) => (
                            <li className="flex items-center gap-2" key={item.value}>
                                <Icon className="text-tint text-base" name="check-circle" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="relative mt-8 delay-200 lg:col-span-5 lg:mt-16" data-reveal>
                    <div className="relative mx-auto w-3/5 max-w-80 sm:w-1/2 lg:w-2/3">
                        <Phone className="drop-shadow-[0_32px_48px_rgb(19_18_9/0.3)]">
                            <FilmFrame className="phone-screen bg-app-bg overflow-hidden" label={hero.videoLabel.value}>
                                <LogFilm />
                            </FilmFrame>
                        </Phone>
                    </div>
                </div>
            </div>
        </section>
    );
}

function LivePurchase({ locale }: { locale: Locale }) {
    const { hero } = useIntlayer("home");
    const { day, voiceAt } = useIntlayer("demo");
    const nameOf = useNames();
    const initial = `${COFFEE_SHOP[locale].toLowerCase()} ${locale === "es" ? "4,50" : "4.50"}`;
    const [text, setText] = useState(initial);
    const parsed = parsePurchase(text, locale);

    return (
        <div className="mt-8 grid max-w-[680px] items-center gap-4 sm:grid-cols-[auto_1fr] sm:gap-8">
            <div className="sm:min-w-60" data-reveal>
                <label className="text-muted mb-1 block font-mono text-xs tracking-widest uppercase delay-200">
                    {hero.tryLabel}
                </label>
                <div className="border-foreground focus-within:border-tint flex items-center justify-between gap-4 border-b py-3 text-xl delay-200">
                    <input
                        aria-label={hero.tryLabel.value}
                        autoComplete="off"
                        className="placeholder:text-muted min-w-0 flex-1 bg-transparent outline-none"
                        maxLength={80}
                        onChange={(event) => setText(event.target.value)}
                        placeholder={hero.tryPlaceholder.value}
                        spellCheck={false}
                        type="text"
                        value={text}
                    />
                    <Icon aria-hidden="true" className="text-muted shrink-0 text-base" name="arrow-elbow-down-left" />
                </div>
            </div>
            <div
                aria-atomic="true"
                aria-live="polite"
                className="sm:border-border delay-300 sm:border-l sm:pl-8"
                data-reveal
            >
                <p className="min-h-10 text-4xl font-semibold tracking-tight tabular-nums">
                    {parsed.amount === null ? null : formatMoney(parsed.amount, "USD")}
                </p>
                <p className="mt-1 min-h-7 text-lg">
                    {parsed.merchant === "" ? null : (
                        <>
                            <span className="text-muted">{voiceAt}</span> {parsed.merchant}
                        </>
                    )}
                </p>
                <p className="text-muted mt-0.5 min-h-5 text-sm">
                    {parsed.category === null ? null : <>{nameOf(parsed.category)} · </>}
                    {day.today}
                </p>
            </div>
        </div>
    );
}
