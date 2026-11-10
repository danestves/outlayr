import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import DollarCircleIcon from "@hugeicons/core-free-icons/DollarCircleIcon";
import File01Icon from "@hugeicons/core-free-icons/File01Icon";
import Notion01Icon from "@hugeicons/core-free-icons/Notion01Icon";
import Pdf01Icon from "@hugeicons/core-free-icons/Pdf01Icon";
import Upload04Icon from "@hugeicons/core-free-icons/Upload04Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { PhoneButton } from "@/components/dashboard/home/setup";
import { SuggestDialog } from "@/components/dashboard/settings/about/suggest";
import { SettingsCard } from "@/components/dashboard/settings/parts";

import { HEADLINE, Plate, QUIET, Solo, Tile } from "./chrome";

const SOURCE = "min-h-[65px] gap-3";

function Source({
    hint,
    icon,
    onOpen,
    title,
    waits,
}: {
    hint: ReactNode;
    icon: IconSvgElement;
    onOpen?: () => void;
    title: ReactNode;
    waits?: "phone";
}) {
    const { phoneHint } = useIntlayer("dashboard-home").setup;
    const inside = (
        <>
            <Tile>
                <HugeiconsIcon icon={icon} size={14} />
            </Tile>
            <span className="min-w-0 flex-1">
                <span className="block font-medium">{title}</span>
                <span className={`block ${QUIET}`}>{hint}</span>
            </span>
        </>
    );
    const chevron = <HugeiconsIcon className="text-muted-foreground" icon={ArrowRight01Icon} size={17} />;
    if (onOpen) {
        return (
            <Frame.Row className={SOURCE} onClick={onOpen}>
                {inside}
                {chevron}
            </Frame.Row>
        );
    }
    if (waits) {
        return (
            <Frame.Row className={SOURCE} title={phoneHint.value}>
                {inside}
                <span className="sr-only">{phoneHint}</span>
                {chevron}
            </Frame.Row>
        );
    }
    return <Frame.Row className={SOURCE}>{inside}</Frame.Row>;
}

export function ImportSources({ onMoneyManager, onSkip }: { onMoneyManager: () => void; onSkip: () => void }) {
    const { sources } = useIntlayer("dashboard-onboarding");
    const [suggesting, setSuggesting] = useState(false);
    return (
        <Solo width="max-w-[880px]">
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <h1 className={`mr-auto ${HEADLINE}`}>{sources.title}</h1>
                <Button onClick={onSkip} variant="outline">
                    {sources.skip}
                </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <SettingsCard title={sources.fromApp}>
                    <Source
                        hint={sources.moneyManagerHint}
                        icon={DollarCircleIcon}
                        onOpen={onMoneyManager}
                        title="Money Manager"
                    />
                    <Source hint={sources.notionHint} icon={Notion01Icon} title="Notion" waits="phone" />
                </SettingsCard>
                <SettingsCard title={sources.fromFile}>
                    <Source hint={sources.csvHint} icon={File01Icon} title={sources.csv} waits="phone" />
                    <Source hint={sources.pdfHint} icon={Pdf01Icon} title={sources.pdf} />
                </SettingsCard>
                <Plate className="md:col-span-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                        <p className={`mr-auto ${QUIET}`}>{sources.privacy}</p>
                        <Button onClick={() => setSuggesting(true)} size="sm" variant="outline">
                            {sources.tellUs}
                        </Button>
                    </div>
                </Plate>
            </div>
            <SuggestDialog onClose={() => setSuggesting(false)} open={suggesting} />
        </Solo>
    );
}

export function MoneyManagerSteps({ onBack }: { onBack: () => void }) {
    const { moneyManager } = useIntlayer("dashboard-onboarding");
    const steps = [moneyManager.one, moneyManager.two, moneyManager.three];
    return (
        <Solo width="max-w-[560px]">
            <SettingsCard
                footer={
                    <>
                        <span className={`mr-auto ${QUIET}`}>{moneyManager.fileHint}</span>
                        <Button onClick={onBack} size="sm" variant="outline">
                            <HugeiconsIcon icon={ArrowLeft02Icon} />
                            {moneyManager.back}
                        </Button>
                        <PhoneButton>
                            <HugeiconsIcon icon={Upload04Icon} />
                            {moneyManager.choose}
                        </PhoneButton>
                    </>
                }
                title={moneyManager.title}
            >
                <ol>
                    {steps.map((step, index) => (
                        <li
                            className="border-border flex min-h-11 items-center gap-4 border-t px-4 py-2.5 first:border-t-0"
                            key={step.value}
                        >
                            <span className={`dash-figure w-4 shrink-0 font-medium ${QUIET}`}>{index + 1}</span>
                            {step}
                        </li>
                    ))}
                </ol>
            </SettingsCard>
        </Solo>
    );
}
