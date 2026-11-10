import Clock01Icon from "@hugeicons/core-free-icons/Clock01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { SettingsCard } from "@/components/dashboard/settings/parts";
import { LogoMark } from "@/components/logo-mark";
import { clockOf } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { DEFAULT_REMINDER_MINUTE } from "@/lib/onboarding";
import type { OnboardingStep } from "@/lib/onboarding";
import { pushAccess } from "@/lib/web-push";

import { FIELD, Plate, PlateFoot, PlateHead, QUIET, Staged } from "./chrome";

const MINUTES_IN_HOUR = 60;
// The browser's own clock button is kept for its picker but drawn over by ours.
const NATIVE_CLOCK =
    "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0";

function minuteOf(clock: string) {
    const [hours, minutes] = clock.split(":").map(Number);
    return hours === undefined || minutes === undefined || Number.isNaN(hours + minutes)
        ? null
        : hours * MINUTES_IN_HOUR + minutes;
}

function Nudge({ line, when }: { line: ReactNode; when: ReactNode }) {
    return (
        <li className="border-border flex gap-2.5 border-t px-4 py-[13px] first:border-t-0">
            <LogoMark className="text-app-tint mt-0.5 ml-1 size-6 shrink-0" />
            <span className="min-w-0 flex-1 text-[13px] leading-5">
                <span className="flex justify-between gap-3 font-medium">
                    Outlayr
                    <span className="dash-figure text-muted-foreground font-normal">{when}</span>
                </span>
                <span className="text-muted-foreground block">{line}</span>
            </span>
        </li>
    );
}

export function Rhythm({
    onAnswer,
    onStep,
    saved,
}: {
    onAnswer: (minute: number | null) => void;
    onStep: (step: OnboardingStep) => void;
    saved: number | null;
}) {
    const { rhythm } = useIntlayer("dashboard-onboarding");
    const { clockTime } = useDisplayFormat();
    const [minute, setMinute] = useState(saved ?? DEFAULT_REMINDER_MINUTE);
    const [access] = useState(pushAccess);
    const fieldId = useId();
    const time = clockTime(clockOf(minute));
    const reachable = access === "allowed" || access === "prompt";
    return (
        <Staged current="rhythm" layout="xl:grid-cols-[520px_minmax(0,1fr)]" onPick={onStep}>
            <Plate>
                <PlateHead body={rhythm.body} title={rhythm.title} />
                <div className="px-4 pt-4 pb-4">
                    <label className="mb-2 block w-fit text-sm leading-5 font-medium" htmlFor={fieldId}>
                        {rhythm.time}
                    </label>
                    <div className="relative">
                        <input
                            className={`dash-figure relative ${FIELD} ${NATIVE_CLOCK}`}
                            disabled={!reachable}
                            id={fieldId}
                            onChange={(event) => setMinute((last) => minuteOf(event.target.value) ?? last)}
                            type="time"
                            value={clockOf(minute)}
                        />
                        <HugeiconsIcon
                            className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
                            icon={Clock01Icon}
                            size={16}
                        />
                    </div>
                    {reachable ? null : <p className={`mt-2 ${QUIET}`}>{rhythm.unsupported}</p>}
                </div>
                <PlateFoot>
                    <Button className="mr-auto" onClick={() => onAnswer(null)} size="sm" variant="outline">
                        {rhythm.none}
                    </Button>
                    <Button disabled={!reachable} onClick={() => onAnswer(minute)}>
                        {rhythm.remind({ time })}
                    </Button>
                </PlateFoot>
            </Plate>
            <SettingsCard title={rhythm.notifications}>
                <ul>
                    <Nudge line={rhythm.today} when={time} />
                    <Nudge line={rhythm.yesterdayLine} when={rhythm.yesterday} />
                </ul>
            </SettingsCard>
        </Staged>
    );
}
