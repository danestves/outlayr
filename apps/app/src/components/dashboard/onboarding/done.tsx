import { Button } from "panelui-web/button";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import type { OnboardingStep } from "@/lib/onboarding";

import { HEADLINE, Plate, PlateFoot, Staged, focusOnMount } from "./chrome";
import { HeardFromRows, sendHeardFrom } from "./heard-from";
import type { HeardFrom } from "./heard-from";

function Fact({ figure = true, label, value }: { figure?: boolean; label: ReactNode; value: ReactNode }) {
    return (
        <div className="border-border flex min-h-11 items-center justify-between gap-3 border-t px-4">
            <dt className="text-muted-foreground text-[13px]">{label}</dt>
            <dd className={figure ? "dash-figure" : undefined}>{value}</dd>
        </div>
    );
}

export function Done({
    asksSource,
    begun,
    currency,
    onOpen,
    onStep,
    reminder,
}: {
    asksSource: boolean;
    begun: string;
    currency: string;
    onOpen: () => void;
    onStep: (step: OnboardingStep) => void;
    reminder: string | null;
}) {
    const { done } = useIntlayer("dashboard-onboarding");
    const [heardFrom, setHeardFrom] = useState<HeardFrom | null>(null);
    const open = () => {
        if (heardFrom) {
            sendHeardFrom(heardFrom);
        }
        onOpen();
    };
    return (
        <Staged current="done" layout="justify-center md:grid-cols-[560px]" onPick={onStep}>
            <Plate>
                <div className="px-5 pt-5 pb-[22px]">
                    <h1 className={HEADLINE}>{done.title}</h1>
                </div>
                <dl>
                    <Fact label={done.begun} value={begun} />
                    <Fact label={done.keptIn} value={currency} />
                    <Fact figure={reminder !== null} label={done.writtenAt} value={reminder ?? done.noReminder} />
                    {asksSource ? <HeardFromRows onChange={setHeardFrom} value={heardFrom} /> : null}
                </dl>
                <PlateFoot>
                    <Button className="ml-auto" onClick={open} ref={focusOnMount}>
                        {done.open}
                    </Button>
                </PlateFoot>
            </Plate>
        </Staged>
    );
}
