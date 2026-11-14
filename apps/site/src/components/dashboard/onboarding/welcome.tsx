import { Button } from "panelui-web/button";
import { useIntlayer } from "react-intlayer";

import { Brand, HEADLINE, QUIET, slotted } from "./chrome";

const SHOT =
    "border-app-strong absolute top-24 left-14 w-[1320px] max-w-none rounded-2xl border select-none pointer-events-none";
const WIDE = "h-9 w-full rounded-lg";

export function Welcome({
    begun,
    onContinue,
    onImport,
}: {
    begun: string;
    onContinue: () => void;
    onImport: () => void;
}) {
    const { welcome } = useIntlayer("dashboard-onboarding");
    return (
        <div className="grid min-h-dvh lg:grid-cols-[600px_minmax(0,1fr)]">
            <div className="flex flex-col px-10 max-sm:px-4">
                <Brand className="h-16 shrink-0" />
                <main className="m-auto w-full max-w-[360px] py-8">
                    <p className={`mb-4 w-fit px-2 py-1 ${QUIET}`}>
                        {slotted(welcome.begun.value, { date: <span className="dash-figure">{begun}</span> }).map(
                            (part) => (
                                <span key={part.key}>{part.node}</span>
                            )
                        )}
                    </p>
                    <h1 className={`mb-1.5 ${HEADLINE}`}>{welcome.title}</h1>
                    <p className={`mb-6 ${QUIET}`}>{welcome.line}</p>
                    <Button autoFocus className={WIDE} onClick={onContinue}>
                        {welcome.continue}
                    </Button>
                    <Button className={`mt-2.5 ${WIDE}`} onClick={onImport} variant="outline">
                        {welcome.importing}
                    </Button>
                </main>
                <div className="h-16 shrink-0 max-lg:hidden" />
            </div>
            <div className="border-border bg-card relative overflow-hidden border-l max-lg:hidden">
                <img
                    alt={welcome.screenshot.value}
                    className={`${SHOT} dark:hidden`}
                    decoding="async"
                    height={880}
                    loading="lazy"
                    src="/app/onboarding-light.webp"
                    width={1320}
                />
                <img
                    alt={welcome.screenshot.value}
                    className={`${SHOT} not-dark:hidden`}
                    decoding="async"
                    height={880}
                    loading="lazy"
                    src="/app/onboarding-dark.webp"
                    width={1320}
                />
            </div>
        </div>
    );
}
