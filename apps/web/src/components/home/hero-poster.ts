import type { Locale } from "@/lib/i18n";

import type { Poster } from "./media";

function screen(name: string) {
    return { src: `/screens/${name}.webp`, srcSet: `/screens/${name}-440.webp 440w, /screens/${name}.webp 880w` };
}

// Apart from the hero so the home route's `head`, which ships in every page's chunk, can preload it alone.
export function heroPoster(locale: Locale) {
    const name = locale === "es" ? "es/log-an-expense" : "log-an-expense";
    return {
        height: 1912,
        sizes: "(min-width: 40rem) 288px, 200px",
        variants: { dark: screen(`${name}-dark`), light: screen(name) },
        width: 880,
    } satisfies Poster;
}
