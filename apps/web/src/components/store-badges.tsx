import { useIntlayer, useLocale } from "react-intlayer";

import { capture } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/site";

const APP_STORE_BADGE = {
    en: "/badges/app-store.svg",
    es: "/badges/app-store-es.svg",
    fr: "/badges/app-store-fr.svg",
    pt: "/badges/app-store-pt.svg",
} as const satisfies Record<Locale, string>;

const GOOGLE_PLAY_BADGE = {
    en: "/badges/google-play",
    es: "/badges/google-play-es",
    fr: "/badges/google-play-fr",
    pt: "/badges/google-play-pt",
} as const satisfies Record<Locale, string>;

type Placement = "answer" | "closing" | "hero" | "intro" | "invite" | "story";

export function StoreBadges({ placement }: { placement: Placement }) {
    const { badges } = useIntlayer("site");
    const { locale } = useLocale();
    const googlePlay = GOOGLE_PLAY_BADGE[locale];
    const loading = placement === "hero" || placement === "intro" || placement === "invite" ? "eager" : "lazy";
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
                    className="h-12 w-auto"
                    height={40}
                    loading={loading}
                    src={APP_STORE_BADGE[locale]}
                    width={120}
                />
            </a>
        </div>
    );
}
