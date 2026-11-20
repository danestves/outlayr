import { Combobox } from "@base-ui/react/combobox";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor } from "@outlayr/money/currency";
import { Button } from "panelui-web/button";
import { useId } from "react";
import { useIntlayer } from "react-intlayer";

import { SettingsCard } from "@/components/dashboard/settings/parts";
import { ErrorBand } from "@/components/error-band";
import { useDisplayFormat } from "@/lib/ledger-settings";
import type { OnboardingStep } from "@/lib/onboarding";

import { FIELD, FIELD_OPEN, Plate, PlateFoot, PlateHead, QUIET, Staged } from "./chrome";

const LEAD = ["USD", "EUR", "GBP", "MXN", "COP", "BRL", "VES"];
const CODES = [...LEAD, ...PICKABLE_CURRENCY_CODES.filter((code) => !LEAD.includes(code))];

const matches = (code: string, query: string) => {
    const wanted = query.trim().toLowerCase();
    return code.toLowerCase().includes(wanted) || currencyDisplayFor(code).name.toLowerCase().includes(wanted);
};

const SAMPLE = { costco: -186.77, netWorth: 24_092.82, spent: 3640.61 };

function CurrencyPicker({ code, id, onPick }: { code: string; id: string; onPick: (code: string) => void }) {
    const { currency } = useIntlayer("dashboard-onboarding");
    return (
        <Combobox.Root
            autoHighlight
            filter={matches}
            items={CODES}
            onValueChange={(next) => next !== null && onPick(next)}
            value={code}
        >
            <Combobox.Trigger className={`group/currency cursor-pointer ${FIELD} ${FIELD_OPEN}`} id={id}>
                <span className="dash-figure">{code}</span>
                <span className={`truncate ${QUIET}`}>{currencyDisplayFor(code).name}</span>
                <HugeiconsIcon
                    className="text-muted-foreground ml-auto shrink-0 transition-transform duration-200 group-data-popup-open/currency:rotate-180 motion-reduce:transition-none"
                    icon={ArrowDown01Icon}
                    size={17}
                />
            </Combobox.Trigger>
            <Combobox.Portal>
                <Combobox.Positioner
                    align="start"
                    alignOffset={3}
                    className="app-shell z-50 outline-none"
                    sideOffset={10}
                >
                    <Combobox.Popup className="bg-popover text-popover-foreground rounded-app-lg w-[calc(var(--anchor-width)-6px)] border p-1 shadow-(--shadow-app-popover) outline-none">
                        <div className="border-input bg-background dark:bg-input/30 h-app-control rounded-app-sm flex items-center gap-2 border px-3">
                            <HugeiconsIcon className="text-muted-foreground shrink-0" icon={Search01Icon} size={15} />
                            <Combobox.Input
                                aria-label={currency.search.value}
                                className="placeholder:text-muted-foreground text-app-label h-full min-w-0 flex-1 bg-transparent outline-none"
                                placeholder={currency.search.value}
                            />
                        </div>
                        <div className="bg-border mx-2 my-1 h-px" />
                        <Combobox.Empty className={`px-2 py-1.5 empty:hidden ${QUIET}`}>{currency.none}</Combobox.Empty>
                        <Combobox.List className="max-h-[min(var(--available-height),14rem)] scroll-py-1 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] overflow-y-auto">
                            {(item: string) => (
                                <Combobox.Item
                                    className="data-highlighted:bg-accent rounded-app-sm text-app-body flex min-h-8 cursor-default items-center gap-2 px-2 outline-none select-none"
                                    key={item}
                                    value={item}
                                >
                                    <span className="dash-figure w-10.5 shrink-0">{item}</span>
                                    <span className={`truncate ${QUIET}`}>{currencyDisplayFor(item).name}</span>
                                    <Combobox.ItemIndicator className="text-app-tint ml-auto flex shrink-0">
                                        <HugeiconsIcon icon={Tick02Icon} size={17} />
                                    </Combobox.ItemIndicator>
                                </Combobox.Item>
                            )}
                        </Combobox.List>
                    </Combobox.Popup>
                </Combobox.Positioner>
            </Combobox.Portal>
        </Combobox.Root>
    );
}

export function Currency({
    code,
    failed,
    onContinue,
    onLeave,
    onPick,
    onStep,
}: {
    code: string;
    failed: boolean;
    onContinue: () => void;
    onLeave: () => void;
    onPick: (code: string) => void;
    onStep: (step: OnboardingStep) => void;
}) {
    const { currency } = useIntlayer("dashboard-onboarding");
    const { money } = useDisplayFormat();
    const fieldId = useId();
    return (
        <Staged current="currency" layout="xl:grid-cols-[520px_minmax(0,1fr)]" onPick={onStep}>
            <Plate>
                <PlateHead body={currency.body} title={currency.title} />
                <div className="px-4 pt-4 pb-4">
                    <label className="text-app-body mb-2 block w-fit font-medium" htmlFor={fieldId}>
                        {currency.label}
                    </label>
                    <CurrencyPicker code={code} id={fieldId} onPick={onPick} />
                </div>
                {failed ? <ErrorBand className="border-t px-5 py-2.5">{currency.failed}</ErrorBand> : null}
                <PlateFoot>
                    <Button className="mr-auto" onClick={onLeave} size="sm" variant="outline">
                        {currency.account}
                    </Button>
                    <Button onClick={onContinue}>{currency.continue}</Button>
                </PlateFoot>
            </Plate>
            <SettingsCard title={currency.inCode({ code })}>
                {(
                    [
                        [currency.netWorth, SAMPLE.netWorth],
                        [currency.spent, SAMPLE.spent],
                        ["Costco", SAMPLE.costco],
                    ] as const
                ).map(([label, amount]) => (
                    <div
                        className="border-border min-h-app-row text-app-label flex items-center justify-between gap-3 border-t px-4 first:border-t-0"
                        key={amount}
                    >
                        <span className="text-muted-foreground">{label}</span>
                        <span className="dash-figure">{money(amount, code)}</span>
                    </div>
                ))}
            </SettingsCard>
        </Staged>
    );
}
