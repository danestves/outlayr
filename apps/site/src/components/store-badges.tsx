import { capture } from "@outlayr/shared/analytics";
import type { Locale } from "@outlayr/shared/i18n";
import { APP_STORE_URL, PLAY_STORE_URL } from "@outlayr/shared/urls";
import { useIntlayer, useLocale } from "react-intlayer";

const APP_STORE_BADGE = {
    en: "/badges/app-store.svg",
    de: "/badges/app-store-de.svg",
    es: "/badges/app-store-es.svg",
    fr: "/badges/app-store-fr.svg",
    pt: "/badges/app-store-pt.svg",
} as const satisfies Record<Locale, string>;

const GOOGLE_PLAY_BADGE = {
    en: "/badges/google-play",
    de: "/badges/google-play-de",
    es: "/badges/google-play-es",
    fr: "/badges/google-play-fr",
    pt: "/badges/google-play-pt",
} as const satisfies Record<Locale, string>;

type Placement = "answer" | "closing" | "dialog" | "hero" | "intro" | "invite" | "story";

const HEIGHT = { lg: "h-13", md: "h-12", sm: "h-11" } as const;

export function StoreBadges({ placement, size = "md" }: { placement: Placement; size?: keyof typeof HEIGHT }) {
    const { badges } = useIntlayer("site");
    const { locale } = useLocale();
    const googlePlay = GOOGLE_PLAY_BADGE[locale];
    const loading = placement === "hero" || placement === "intro" || placement === "invite" ? "eager" : "lazy";
    const height = `${HEIGHT[size]} w-auto`;
    return (
        <div className="flex flex-wrap items-center gap-4">
            <a
                className="fluid shrink-0 hover:-translate-y-0.5 active:translate-y-px"
                href={PLAY_STORE_URL}
                onClick={() => capture("google_play_badge_clicked", { placement })}
            >
                <img
                    alt={badges.googlePlay.value}
                    className={height}
                    height={96}
                    loading={loading}
                    src={`${googlePlay}-2x.webp`}
                    srcSet={`${googlePlay}-2x.webp 2x, ${googlePlay}-3x.webp 3x`}
                    width={322}
                />
            </a>
            <a
                className="fluid shrink-0 hover:-translate-y-0.5 active:translate-y-px"
                href={APP_STORE_URL}
                onClick={() => capture("app_store_badge_clicked", { placement })}
            >
                <img
                    alt={badges.appStore.value}
                    className={height}
                    height={40}
                    loading={loading}
                    src={APP_STORE_BADGE[locale]}
                    width={120}
                />
            </a>
        </div>
    );
}
