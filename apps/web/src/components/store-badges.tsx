import { useIntlayer, useLocale } from "react-intlayer";

import { capture } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/site";

const APP_STORE_BADGE = {
    en: "/badges/app-store.svg",
    es: "/badges/app-store-es.svg",
} as const satisfies Record<Locale, string>;

const GOOGLE_PLAY_BADGE = {
    en: { height: 168, src: "/badges/google-play.png", width: 564 },
    es: { height: 192, src: "/badges/google-play-es.png", width: 646 },
} as const satisfies Record<Locale, { height: number; src: string; width: number }>;

const PRODUCT_HUNT_URL =
    "https://www.producthunt.com/products/outlayr?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-outlayr";
const PRODUCT_HUNT_THEMES = [
    { className: "light-only", theme: "light" },
    { className: "dark-only", theme: "dark" },
] as const;

type Placement = "answer" | "closing" | "hero" | "intro" | "story";

export function StoreBadges({ placement }: { placement: Placement }) {
    const { badges } = useIntlayer("site");
    const { locale } = useLocale();
    const googlePlay = GOOGLE_PLAY_BADGE[locale];
    const loading = placement === "hero" || placement === "intro" ? "eager" : "lazy";
    return (
        <div className="flex flex-wrap items-center gap-4">
            <a
                className="fluid shrink-0 hover:-translate-y-0.5 active:translate-y-px"
                href={PLAY_STORE_URL}
                onClick={() => capture("google_play_badge_clicked", { placement })}
            >
                <img
                    alt={badges.googlePlay.value}
                    className="h-12 w-auto"
                    height={googlePlay.height}
                    loading={loading}
                    src={googlePlay.src}
                    width={googlePlay.width}
                />
            </a>
            <a
                className="fluid shrink-0 hover:-translate-y-0.5 active:translate-y-px"
                href={APP_STORE_URL}
                onClick={() => capture("app_store_badge_clicked", { placement })}
            >
                <img
                    alt={badges.appStore.value}
                    className="h-12 w-auto"
                    height={40}
                    loading={loading}
                    src={APP_STORE_BADGE[locale]}
                    width={120}
                />
            </a>
            {placement === "hero" && (
                <a
                    className="fluid shrink-0 hover:-translate-y-0.5 active:translate-y-px"
                    href={PRODUCT_HUNT_URL}
                    onClick={() => capture("product_hunt_badge_clicked", { placement })}
                >
                    {PRODUCT_HUNT_THEMES.map(({ className, theme }) => (
                        <img
                            alt={badges.productHunt.value}
                            className={`${className} h-12 w-auto`}
                            height={54}
                            key={theme}
                            loading="lazy"
                            src={`/badges/product-hunt.svg?theme=${theme}`}
                            width={250}
                        />
                    ))}
                </a>
            )}
        </div>
    );
}
