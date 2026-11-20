import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import TransactionHistoryIcon from "@hugeicons/core-free-icons/TransactionHistoryIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Select } from "panelui-web/select";
import { useId, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useDateFormat } from "@/components/dashboard/home/format";
import { SettingsCard } from "@/components/dashboard/settings/parts";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { useCategoryOptions } from "@/components/dashboard/transactions/entry-form";
import { parseAmount } from "@/lib/account-writes";
import { blankValues, createdEntry, draftOf, entryProblem, wallText } from "@/lib/entry-writes";
import type { EntryProblem } from "@/lib/entry-writes";
import { useDisplayFormat } from "@/lib/ledger-settings";
import type { OnboardingStep } from "@/lib/onboarding";

import { HEADLINE, Plate, PlateFoot, QUIET, Staged, slotted, focusOnMount } from "./chrome";

const DAY_LENGTH = 10;
const SLOT_FIELD =
    "border-input bg-background dark:bg-input/30 h-app-control rounded-app-sm border shadow-xs transition duration-150";
const HEAD =
    "text-muted-foreground border-border text-app-caption h-10 border-b px-3 text-left font-medium first:pl-4 last:pr-4";
const CELL = "h-12.5 px-3 whitespace-nowrap first:pl-4 last:pr-4";

function Dot({ color, size }: { color: string | null | undefined; size: string }) {
    return <i className={`${size} flex-none rounded-full`} style={{ backgroundColor: color ?? undefined }} />;
}

export function FirstEntry({
    onLater,
    onSaved,
    onStep,
}: {
    onLater: () => void;
    onSaved: () => void;
    onStep: (step: OnboardingStep) => void;
}) {
    const { firstEntry } = useIntlayer("dashboard-onboarding");
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter();
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const options = useCategoryOptions(ledger, false);
    const [amountText, setAmountText] = useState("");
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [problem, setProblem] = useState<EntryProblem | null>(null);
    const amountId = useId();
    const { currency } = ledger;
    const decimals = decimalsFor(currency);
    const amount = parseAmount(amountText, decimals);
    const category = ledger.books.categories.find((row) => row.localId === categoryId);
    const picked = options.find((option) => option.value === categoryId);
    const ready = amount > 0 && categoryId !== null;
    const blank = (0).toFixed(decimals);
    const today = wallText(ledger.now, ledger).slice(0, DAY_LENGTH);

    const save = () => {
        const at = Date.now();
        const current = committer.current();
        const values = { ...blankValues(current, null, at), amountText, categoryId };
        const draft = { ...draftOf(current, values, null, ""), date: at };
        const found = entryProblem(current, draft, null, at);
        setProblem(found);
        if (found === null) {
            void committer.commit(createdEntry(current, crypto.randomUUID(), draft, at), {
                failed: firstEntry.failed.value,
            });
            onSaved();
        }
    };

    return (
        <Staged current="first-entry" layout="xl:grid-cols-[600px_minmax(0,1fr)]" onPick={onStep}>
            <Plate>
                <form
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (ready) {
                            save();
                        }
                    }}
                >
                    <div className="px-5 pt-5 pb-4">
                        <h1 className={HEADLINE}>{firstEntry.title}</h1>
                    </div>
                    <div className="text-app-heading flex flex-wrap items-center gap-2.5 px-5 pt-1 pb-6">
                        {slotted(firstEntry.sentence.value, {
                            amount: (
                                <label
                                    className={`dash-figure has-focus-visible:border-ring has-focus-visible:ring-ring/30 flex cursor-text items-center px-3 has-focus-visible:ring-3 ${amountText === "" ? "text-app-heading" : "text-app-body"} ${SLOT_FIELD}`}
                                    htmlFor={amountId}
                                >
                                    <span className={amountText === "" ? "text-muted-foreground" : undefined}>
                                        {currencyDisplayFor(currency).symbol}
                                    </span>
                                    <input
                                        aria-label={firstEntry.amount.value}
                                        autoComplete="off"
                                        className="placeholder:text-muted-foreground min-w-0 bg-transparent outline-none"
                                        id={amountId}
                                        inputMode="decimal"
                                        onChange={(event) => {
                                            setAmountText(event.target.value);
                                            setProblem(null);
                                        }}
                                        placeholder={blank}
                                        ref={focusOnMount}
                                        style={{ width: `${Math.max(amountText.length, blank.length)}ch` }}
                                        value={amountText}
                                    />
                                </label>
                            ),
                            category: (
                                <Select
                                    items={options.map((option) => ({ label: option.label, value: option.value }))}
                                    onValueChange={(next) => {
                                        setCategoryId(next);
                                        setProblem(null);
                                    }}
                                    value={categoryId}
                                >
                                    <Select.Trigger
                                        aria-label={firstEntry.category.value}
                                        icon={
                                            <HugeiconsIcon
                                                className="size-4.25 transition-transform duration-200 group-data-popup-open/slot:rotate-180 motion-reduce:transition-none"
                                                icon={ArrowDown01Icon}
                                            />
                                        }
                                        className={`group/slot data-popup-open:ring-ring/30 w-auto px-3 data-popup-open:ring-3 ${picked ? "text-sm" : "text-lg"} ${SLOT_FIELD}`}
                                    >
                                        {picked?.icon}
                                        <Select.Value placeholder={firstEntry.category.value} />
                                    </Select.Trigger>
                                    <Select.Content alignItemWithTrigger={false} className="app-shell z-60">
                                        {options.map((option) => (
                                            <Select.Item icon={option.icon} key={option.value} value={option.value}>
                                                {option.label}
                                            </Select.Item>
                                        ))}
                                    </Select.Content>
                                </Select>
                            ),
                        }).map((part) => (
                            <span key={part.key}>{part.node}</span>
                        ))}
                    </div>
                    {problem === null ? null : (
                        <p className="text-app-spend text-app-label -mt-3 px-5 pb-4" role="alert">
                            {problem === "rateMissing" ? firstEntry.rateMissing : firstEntry.failed}
                        </p>
                    )}
                    <PlateFoot>
                        <Button className="mr-auto" onClick={onLater} size="sm" variant="outline">
                            {firstEntry.later}
                        </Button>
                        <Button disabled={!ready} type="submit">
                            {firstEntry.save}
                        </Button>
                    </PlateFoot>
                </form>
            </Plate>
            <SettingsCard title={firstEntry.transactions}>
                {amount > 0 || picked ? (
                    <table className="text-app-label w-full border-collapse">
                        <thead>
                            <tr>
                                <th className={HEAD} scope="col">
                                    {firstEntry.category}
                                </th>
                                <th className={HEAD} scope="col">
                                    {firstEntry.date}
                                </th>
                                <th className={`${HEAD} text-right`} scope="col">
                                    {firstEntry.amount}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className={CELL}>
                                    {picked ? (
                                        <Badge variant="outline">
                                            <Dot color={category?.color} size="size-1.5" />
                                            {picked.label}
                                        </Badge>
                                    ) : null}
                                </td>
                                <td className={`${CELL} dash-figure text-muted-foreground`}>{date.day(today)}</td>
                                <td className={`${CELL} dash-figure text-right`}>{money(-amount, currency)}</td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-8 text-center">
                        <span className="bg-app-fill text-muted-foreground rounded-app-lg mb-2 flex size-11 items-center justify-center">
                            <HugeiconsIcon icon={TransactionHistoryIcon} size={20} />
                        </span>
                        <p className={QUIET}>{firstEntry.empty}</p>
                    </div>
                )}
            </SettingsCard>
        </Staged>
    );
}
