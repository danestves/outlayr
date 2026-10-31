import { useIntlayer, useLocale } from "react-intlayer";

import { BudgetCard } from "@/components/app-ui/app-ui";
import { COFFEE_SHOP } from "@/components/demo/capture-panels";
import { formatMoney } from "@/components/demo/money";
import { useNames } from "@/components/demo/use-names";
import { Icon } from "@/components/icon";
import { StoreBadges } from "@/components/store-badges";
import { CONTAINER } from "@/lib/layout";

import { heroPoster } from "./hero-poster";
import { LoopVideo, Phone, videoUrl } from "./media";

export function Hero() {
    const { hero } = useIntlayer("home");
    const story = useIntlayer("story");
    const { day, voiceAt } = useIntlayer("demo");
    const nameOf = useNames();
    const { locale } = useLocale();
    const shop = COFFEE_SHOP[locale];
    const cut = locale === "es" ? "-es" : "";
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
                    <div className="mt-8 grid max-w-[680px] items-center gap-4 sm:grid-cols-[auto_1fr] sm:gap-8">
                        <p
                            className="border-foreground flex items-center justify-between gap-4 border-b py-3 text-xl delay-200 sm:min-w-60"
                            data-reveal
                        >
                            {`${shop.toLowerCase()} 4.50`}
                            <Icon className="text-muted text-base" name="arrow-elbow-down-left" />
                        </p>
                        <div className="sm:border-border delay-300 sm:border-l sm:pl-8" data-reveal>
                            <p className="text-4xl font-semibold tracking-tight tabular-nums">
                                {formatMoney(4.5, "USD")}
                            </p>
                            <p className="mt-1 text-lg">
                                <span className="text-muted">{voiceAt}</span> {shop}
                            </p>
                            <p className="text-muted mt-0.5 text-sm">
                                {nameOf("Coffee")} · {day.today}
                            </p>
                        </div>
                    </div>
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
                            <LoopVideo
                                av1={{
                                    dark: videoUrl(`log-an-expense-dark${cut}.av1.mp4`),
                                    light: videoUrl(`log-an-expense${cut}.av1.mp4`),
                                }}
                                className="phone-screen bg-app-bg overflow-hidden"
                                label={hero.videoLabel.value}
                                poster={heroPoster(locale)}
                                sources={{
                                    dark: videoUrl(`log-an-expense-dark${cut}.mp4`),
                                    light: videoUrl(`log-an-expense${cut}.mp4`),
                                }}
                            />
                        </Phone>
                        <div className="glass absolute top-16 -left-12 w-4/5 rounded-2xl p-2 sm:-left-24">
                            <div className="overflow-hidden rounded-lg">
                                <BudgetCard size="sm" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
