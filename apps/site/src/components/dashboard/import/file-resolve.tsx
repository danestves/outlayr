import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import CancelCircleIcon from "@hugeicons/core-free-icons/CancelCircleIcon";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import CircleIcon from "@hugeicons/core-free-icons/CircleIcon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon";
import type { IconSvgElement } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Table } from "panelui-web/table";
import { Tabs } from "panelui-web/tabs";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import type { AccountChoice } from "@/lib/import-plan";

import type { AiRefusal } from "./ai";
import type { Draft, DraftStore } from "./draft";
import { AccountPick, CategoryChip } from "./file-parts";
import { HEAD } from "./history";
import type { FileModel, GroupView } from "./model";
import { Banner, Card, Columns, ImportBar, ImportPage, NOTE } from "./parts";

export type AiStatus = { kind: "answered"; sent: number } | { kind: "asking" } | { kind: "failed"; reason: AiRefusal };

type Filter = "ai" | "all" | "matched" | "pick";

const PAGE = 15;
const ROW = "h-[49px] px-3 py-0 align-middle first:ps-4 last:pe-4";

const filterOf = (group: GroupView): Exclude<Filter, "all"> => {
    if (group.choice.kind === "none") {
        return "pick";
    }
    return group.found === "ai" ? "ai" : "matched";
};

const REASON_KEY = {
    aiOff: "aiOff",
    offline: "offline",
    rateLimited: "rateLimit",
    timeout: "timeout",
} as const;
const OTHER_REASONS = ["offline", "rateLimit", "timeout", "tooLarge", "aiOff"] as const;

function Step({ done, failed, label, value }: { done: boolean; failed: boolean; label: ReactNode; value: ReactNode }) {
    let icon: IconSvgElement = CircleIcon;
    let tone = "text-muted-foreground";
    if (failed) {
        icon = CancelCircleIcon;
        tone = "text-destructive";
    } else if (done) {
        icon = CheckmarkCircle02Icon;
        tone = "text-app-income";
    }
    return (
        <div className="flex min-h-9 items-center gap-2 border-b text-[13px] last:border-0">
            <Glyph className={`flex-none ${tone}`} icon={icon} size={16} />
            <span className="text-muted-foreground min-w-0 truncate">{label}</span>
            <span className="dash-figure ml-auto whitespace-nowrap">{value}</span>
        </div>
    );
}

function Preparing({ ai, model }: { ai: AiStatus; model: FileModel }) {
    const { resolve } = useIntlayer("dashboard-import");
    const matched = model.groups.filter((group) => group.found !== "none" && group.found !== "ai").length;
    let asked: ReactNode = resolve.asking;
    if (ai.kind === "answered") {
        asked = resolve.sent({ count: ai.sent });
    } else if (ai.kind === "failed") {
        asked = ai.reason === "aiOff" ? resolve.skipped : resolve.sent({ count: 0 });
    }
    return (
        <Card title={resolve.preparing}>
            <div className="mx-4 mt-4 border-t">
                <Step
                    done
                    failed={false}
                    label={resolve.readFile}
                    value={resolve.readRows({ count: model.rows.length + model.faulty.length })}
                />
                <Step
                    done
                    failed={false}
                    label={resolve.matchedOnDevice}
                    value={resolve.matchedCount({ matched, total: model.groups.length })}
                />
                <Step
                    done={ai.kind === "answered"}
                    failed={ai.kind === "failed"}
                    label={resolve.askedModel}
                    value={asked}
                />
            </div>
            {ai.kind === "failed" ? null : <p className={`${NOTE} pt-3 pb-4`}>{resolve.privacyLine}</p>}
        </Card>
    );
}

function OtherReasons({ reason }: { reason: AiRefusal }) {
    const { resolve } = useIntlayer("dashboard-import");
    const current = reason === "providerError" ? null : REASON_KEY[reason];
    return (
        <Card title={resolve.otherReasons}>
            <div className="mx-4 mt-4 border-t">
                {OTHER_REASONS.filter((key) => key !== current).map((key) => (
                    <div className="flex min-h-9 items-center gap-3 border-b text-[13px] last:border-0" key={key}>
                        <span className="text-muted-foreground">{resolve.reason[key]}</span>
                        <span className="ml-auto text-end">{resolve.reason[`${key}Hint`]}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

const NEW_ACCOUNT = "new:account";
const NEW_CARD = "new:card";
const SKIP = "skip";

const pickValue = (choice: AccountChoice, picked: boolean) => {
    if (!picked) {
        return null;
    }
    if (choice.kind === "existing") {
        return choice.id;
    }
    return choice.kind === "skip" ? SKIP : `new:${choice.type}`;
};

const choiceOf = (value: string): AccountChoice => {
    if (value === NEW_ACCOUNT) {
        return { kind: "new", type: "account" };
    }
    if (value === NEW_CARD) {
        return { kind: "new", type: "card" };
    }
    return value === SKIP ? { kind: "skip" } : { id: value, kind: "existing" };
};

function FileAccounts({ draft, model, store }: { draft: Draft; model: FileModel; store: DraftStore }) {
    const { resolve } = useIntlayer("dashboard-import");
    const extra = [
        { icon: <Glyph icon={PlusSignIcon} size={16} />, label: resolve.newAccount.value, value: NEW_ACCOUNT },
        { icon: <Glyph icon={CreditCardIcon} size={16} />, label: resolve.newCard.value, value: NEW_CARD },
        { icon: <Glyph icon={Cancel01Icon} size={16} />, label: resolve.leaveOut.value, value: SKIP },
    ];
    return (
        <Card title={resolve.accounts}>
            <div className="flex flex-col gap-4 p-4">
                {model.accounts.map((account) => (
                    <div className="flex flex-col gap-2" key={account.value}>
                        <span className="text-muted-foreground truncate text-[13px]">
                            {account.value},{" "}
                            {account.count === 1 ? resolve.oneRow : resolve.rowsCount({ count: account.count })}
                        </span>
                        <AccountPick
                            extra={extra}
                            onPick={(value) =>
                                store.change({ accounts: { ...draft.accounts, [account.value]: choiceOf(value) } })
                            }
                            placeholder={resolve.pickAccount.value}
                            value={pickValue(account.choice, account.picked)}
                        />
                    </div>
                ))}
            </div>
        </Card>
    );
}

function FoundBy({ found }: { found: GroupView["found"] }) {
    const { resolve } = useIntlayer("dashboard-import");
    if (found === "ai") {
        return (
            <span className="inline-flex items-center gap-1.5">
                <Glyph icon={SparklesIcon} size={14} />
                {resolve.found.ai}
            </span>
        );
    }
    return resolve.found[found];
}

export function ResolveStep({
    ai,
    draft,
    model,
    onCancel,
    onRetryAi,
    onTurnOnAi,
    store,
}: {
    ai: AiStatus;
    draft: Draft;
    model: FileModel;
    onCancel: () => void;
    onRetryAi: () => void;
    onTurnOnAi: () => void;
    store: DraftStore;
}) {
    const copy = useIntlayer("dashboard-import");
    const { columns, resolve } = copy;
    const [filter, setFilter] = useState<Filter>("all");
    const [shown, setShown] = useState(PAGE);
    const count = (which: Exclude<Filter, "all">) => model.groups.filter((group) => filterOf(group) === which).length;
    const picks = count("pick");
    const fromAi = count("ai");
    const visible = filter === "all" ? model.groups : model.groups.filter((group) => filterOf(group) === filter);
    const failed = ai.kind === "failed" ? ai : null;
    const tabs: { count: number; label: ReactNode; value: Filter }[] = [
        { count: model.groups.length, label: resolve.all, value: "all" },
        { count: count("matched"), label: resolve.matched, value: "matched" },
        ...(fromAi > 0 ? [{ count: fromAi, label: resolve.fromAi, value: "ai" as const }] : []),
        { count: picks, label: resolve.pickCategory, value: "pick" },
    ];
    const review = () => store.change({ step: "review" });

    return (
        <ImportPage>
            <ImportBar step="match">
                <Button onClick={onCancel} variant="outline">
                    {copy.cancel}
                </Button>
                <Button onClick={review}>{resolve.reviewCount({ count: model.rows.length })}</Button>
            </ImportBar>
            <Columns
                rail={
                    <>
                        <Preparing ai={ai} model={model} />
                        {model.accounts.length > 0 ? <FileAccounts draft={draft} model={model} store={store} /> : null}
                        {failed ? <OtherReasons reason={failed.reason} /> : null}
                    </>
                }
            >
                <Frame className="min-w-0">
                    <Frame.Header className="min-h-10 py-0 ps-0">
                        <Tabs
                            className="min-w-0"
                            onValueChange={(value) => {
                                setFilter(tabs.find((tab) => tab.value === value)?.value ?? "all");
                                setShown(PAGE);
                            }}
                            value={filter}
                            variant="underline"
                        >
                            <Tabs.List aria-label={resolve.all.value}>
                                {tabs.map((tab) => (
                                    <Tabs.Trigger key={tab.value} value={tab.value}>
                                        {tab.label}
                                        <Tabs.Badge className="dash-figure text-muted-foreground bg-transparent! px-0">
                                            {tab.count}
                                        </Tabs.Badge>
                                    </Tabs.Trigger>
                                ))}
                            </Tabs.List>
                        </Tabs>
                    </Frame.Header>
                    <Frame.Panel className="flex flex-1 flex-col">
                        {failed ? (
                            <Banner
                                action={
                                    <Button
                                        onClick={failed.reason === "aiOff" ? onTurnOnAi : onRetryAi}
                                        size="sm"
                                        variant="outline"
                                    >
                                        {failed.reason === "aiOff" ? resolve.turnOnAi : copy.tryAgain}
                                    </Button>
                                }
                                title={resolve.unavailable}
                                tone="warn"
                            >
                                {resolve.unavailableWhy[failed.reason === "timeout" ? "providerError" : failed.reason]}{" "}
                                {resolve.stillHere}
                            </Banner>
                        ) : null}
                        <Table containerClassName="overflow-x-auto">
                            <Table.Header>
                                <Table.Row className="border-b-0">
                                    <Table.Head className={`${HEAD} md:w-[383px]`}>{columns.inYourFile}</Table.Head>
                                    <Table.Head align="end" className={`${HEAD} w-16`}>
                                        {columns.rows}
                                    </Table.Head>
                                    <Table.Head className={HEAD}>{columns.category}</Table.Head>
                                    <Table.Head align="end" className={HEAD}>
                                        {columns.foundBy}
                                    </Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {visible.slice(0, shown).map((group) => (
                                    <Table.Row key={group.key}>
                                        <Table.Cell className={`${ROW} dash-figure max-w-0 truncate text-[13px]`}>
                                            {group.label}
                                        </Table.Cell>
                                        <Table.Cell align="end" className={`${ROW} text-muted-foreground text-sm`}>
                                            {group.rows}
                                        </Table.Cell>
                                        <Table.Cell className={ROW}>
                                            <CategoryChip
                                                choice={group.choice}
                                                income={group.income}
                                                newName={group.fromCategory ? group.name : null}
                                                onPick={(choice) =>
                                                    store.change({
                                                        categories: { ...draft.categories, [group.key]: choice },
                                                    })
                                                }
                                            />
                                        </Table.Cell>
                                        <Table.Cell
                                            align="end"
                                            className={`${ROW} text-muted-foreground text-sm whitespace-nowrap`}
                                        >
                                            <FoundBy found={group.found} />
                                        </Table.Cell>
                                    </Table.Row>
                                ))}
                            </Table.Body>
                        </Table>
                    </Frame.Panel>
                    <Frame.Footer className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                        <span className="text-muted-foreground">
                            {resolve.showing({ shown: Math.min(shown, visible.length), total: model.groups.length })}
                        </span>
                        <span className="flex gap-2">
                            {shown < visible.length ? (
                                <Button onClick={() => setShown(shown + PAGE)} size="sm" variant="outline">
                                    {resolve.showMore}
                                </Button>
                            ) : null}
                            {picks > 0 ? (
                                <Button
                                    onClick={() => store.change({ leftForLater: true, step: "review" })}
                                    size="sm"
                                    variant="outline"
                                >
                                    {resolve.leaveForLater({ count: picks })}
                                </Button>
                            ) : null}
                        </span>
                    </Frame.Footer>
                </Frame>
            </Columns>
        </ImportPage>
    );
}
