import { Composition } from "remotion";

import { BankShortcut } from "./bank-shortcut";
import { Capture, CAPTURE_SECONDS } from "./web/capture";
import { Chaos, CHAOS_SECONDS } from "./web/chaos";
import { Month, MONTH_SECONDS } from "./web/month";
import { Promo, PROMO_SECONDS } from "./web/promo";
import { Sorted, SORTED_SECONDS } from "./web/sorted";

const FPS = 60;
const SQUARE = 1080;
const MODES = ["light", "dark"] as const;
const LOCALES = ["en", "es"] as const;
const FILMS = [
    { component: Chaos, name: "chaos", seconds: CHAOS_SECONDS },
    { component: Capture, name: "capture", seconds: CAPTURE_SECONDS },
    { component: Sorted, name: "sorted", seconds: SORTED_SECONDS },
    { component: Month, name: "month", seconds: MONTH_SECONDS },
];

export function RemotionRoot() {
    return (
        <>
            <Composition
                component={BankShortcut}
                defaultProps={{ lang: "en" as const }}
                durationInFrames={1267}
                fps={30}
                height={1920}
                id="BankShortcut-en"
                width={1080}
            />
            <Composition
                component={BankShortcut}
                defaultProps={{ lang: "es" as const }}
                durationInFrames={1267}
                fps={30}
                height={1920}
                id="BankShortcut-es"
                width={1080}
            />
            {FILMS.flatMap(({ component, name, seconds }) =>
                MODES.flatMap((mode) =>
                    LOCALES.map((locale) => {
                        const id = locale === "en" ? `${name}-${mode}` : `${name}-${mode}-${locale}`;
                        return (
                            <Composition
                                component={component}
                                defaultProps={{ locale, mode }}
                                durationInFrames={seconds * FPS}
                                fps={FPS}
                                height={SQUARE}
                                id={id}
                                key={id}
                                width={SQUARE}
                            />
                        );
                    })
                )
            )}
            <Composition
                component={Promo}
                durationInFrames={Math.round(PROMO_SECONDS * FPS)}
                fps={FPS}
                height={1920}
                id="promo-dark"
                width={1080}
            />
        </>
    );
}
