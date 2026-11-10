import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import InformationCircleIcon from "@hugeicons/core-free-icons/InformationCircleIcon";
import PlayIcon from "@hugeicons/core-free-icons/PlayIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Kpi } from "panelui-web/kpi";
import { Tabs } from "panelui-web/tabs";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { dismissed, removed, reordered, resolved, ruleFromSuggestion, runOf, saved, toggled } from "@/lib/rules";
import type { Change, ConflictChoice, Rule } from "@/lib/rules";

import { KpiBand } from "../accounts/parts";
import { QuietTable } from "../home/setup";
import { ConflictList } from "./conflicts";
import type { ConflictChoices } from "./conflicts";
import { useRuleWrites, useRulesData } from "./data";
import type { RulesData } from "./data";
import { DeleteDialog, RunDialog } from "./dialogs";
import { useCategoryLook } from "./parts";
import { RuleList } from "./rule-list";
import type { Moving, RuleActions } from "./rule-list";
import { RuleSheet } from "./rule-sheet";
import type { SheetTarget } from "./rule-sheet";
import { NEW_RULE, RULE_TABS, tabOf } from "./search";
import type { RulesSearch, SetRulesSearch } from "./search";
import { SuggestedTable } from "./suggested";

const PERCENT = 100;

function Figure({ children, label, tone = "" }: { children: ReactNode; label: ReactNode; tone?: string }) {
    return (
        <Kpi className="gap-0">
            <Kpi.Header>
                <Kpi.Title>{label}</Kpi.Title>
            </Kpi.Header>
            <Kpi.Value className={`dash-figure mt-1 truncate leading-8 font-semibold tracking-[-0.04em] ${tone}`}>
                {children}
            </Kpi.Value>
        </Kpi>
    );
}

interface ScreenProps {
    data: RulesData;
    search: RulesSearch;
    setSearch: SetRulesSearch;
}

export function RulesScreen({ data, search, setSearch }: ScreenProps) {
    const copy = useIntlayer("dashboard-rules");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const writes = useRuleWrites();
    const look = useCategoryLook();
    const [moving, setMoving] = useState<Moving | null>(null);
    const [running, setRunning] = useState<Rule | "all" | null>(null);
    const [deleting, setDeleting] = useState<Rule | null>(null);
    const [choices, setChoices] = useState<ConflictChoices>({});
    const { book, conflicts, stats, suggestions } = data;
    const { rules } = book;
    const tab = tabOf(search);
    const target = useMemo((): SheetTarget | null => {
        if (search.rule === undefined) {
            return null;
        }
        if (search.rule === NEW_RULE) {
            const seed = suggestions.find((suggestion) => suggestion.key === search.from) ?? null;
            return { key: `${NEW_RULE}:${search.from ?? ""}`, rule: null, seed };
        }
        const rule = rules.find((each) => each.id === search.rule);
        return rule ? { key: rule.id, rule, seed: null } : null;
    }, [rules, search.from, search.rule, suggestions]);
    const categoryName = (id: string) => look(id)?.name ?? "";
    const closeSheet = () => setSearch({ from: null, rule: null, view: null });
    const create = () => setSearch({ from: null, rule: NEW_RULE, view: null });

    const actions: RuleActions = {
        onDelete: setDeleting,
        onDuplicate: (rule) => {
            const copied = { ...rule, id: crypto.randomUUID(), name: copy.copyOf({ name: rule.name }).value };
            writes.update((current) =>
                saved(current, copied, current.rules.findIndex((each) => each.id === rule.id) + 1)
            );
            setSearch({ rule: copied.id, view: null });
        },
        onEdit: (rule) => setSearch({ rule: rule.id, view: null }),
        onMove: (rule, position) => {
            writes.update((current) => reordered(current, rule.id, position));
        },
        onRun: setRunning,
        onTest: (rule) => setSearch({ rule: rule.id, view: "test" }),
        onToggle: (rule, on) => {
            writes.update((current) => toggled(current, rule.id, on));
            if (!on) {
                const count = String(stats.byRule.get(rule.id)?.count ?? 0);
                writes.undoable(copy.toast.off({ count, name: rule.name }).value, () => {
                    writes.update((current) => toggled(current, rule.id, true));
                });
            }
        },
    };

    const remove = (rule: Rule) => {
        const at = rules.findIndex((each) => each.id === rule.id);
        const kept = book.settled.filter((key) => key.split("|").includes(rule.id));
        writes.update((current) => removed(current, rule.id));
        if (search.rule === rule.id) {
            closeSheet();
        }
        writes.undoable(copy.toast.deleted({ name: rule.name }).value, () => {
            writes.update((current) => ({
                ...saved(current, rule, at),
                settled: [...new Set([...current.settled, ...kept])],
            }));
        });
    };

    const saveChoices = () => {
        const picks = conflicts.map((conflict) => ({ choice: choices[conflict.key] ?? "first", conflict }));
        const before = book;
        const live = new Set(data.tagNames.keys());
        const changes: Change[] = picks.flatMap(({ choice, conflict }) =>
            choice === "second"
                ? runOf([conflict.second], conflict.entries, data.kinds, live).changes.filter(
                      (change) => change.categoryId !== null
                  )
                : []
        );
        writes.update((current) =>
            picks.reduce((next, { choice, conflict }) => resolved(next, conflict, choice), current)
        );
        setChoices({});
        if (changes.length > 0) {
            writes.apply(changes, categoryName, () => {
                writes.update(() => before);
            });
        }
    };
    const undecided = conflicts.every((conflict) => (choices[conflict.key] ?? "first") === "leave");

    const tabs = (
        <Tabs
            className="min-w-0 flex-1"
            onValueChange={(value) => setSearch({ tab: value === "all" ? null : String(value) })}
            value={tab}
            variant="underline"
        >
            <Tabs.List aria-label={copy.title.value}>
                {RULE_TABS.map((each) => (
                    <Tabs.Trigger key={each} value={each}>
                        {copy.tabs[each]}
                        <Tabs.Badge className="dash-figure">
                            {{ all: rules.length, conflicts: conflicts.length, suggested: suggestions.length }[each]}
                        </Tabs.Badge>
                    </Tabs.Trigger>
                ))}
                {tab === "all" ? (
                    <span className="text-muted-foreground ml-auto flex items-center gap-1.5 self-center pe-1 text-[13px] whitespace-nowrap max-md:hidden">
                        <HugeiconsIcon icon={InformationCircleIcon} size={14} />
                        {copy.firstMatch}
                    </span>
                ) : null}
            </Tabs.List>
        </Tabs>
    );

    const fresh = rules.length === 0 && tab === "all";
    const active = rules.filter((rule) => rule.on).length;
    const share = data.entries.length === 0 ? 0 : Math.round((stats.matched / data.entries.length) * PERCENT);
    const clash = new Map(conflicts.flatMap((conflict) => conflict.entries).map((entry) => [entry.id, entry]));
    const clashTotal = [...clash.values()].reduce((sum, entry) => sum + Math.abs(entry.worth), 0);

    const footer = () => {
        if (tab === "suggested") {
            return suggestions.length > 0 ? <span>{copy.suggested.footer}</span> : null;
        }
        if (tab === "conflicts") {
            return conflicts.length > 0 ? (
                <span>
                    {copy.conflicts.total} <span className="dash-figure">{money(clashTotal, ledger.currency)}</span>
                </span>
            ) : null;
        }
        return (
            <>
                <span>{rules.length === 1 ? copy.footer.one : copy.footer.count({ count: String(rules.length) })}</span>
                <span aria-live="polite" className="ml-auto max-sm:hidden">
                    {moving
                        ? copy.footer.moving({ name: moving.name, position: String(moving.position) })
                        : copy.footer.drag}
                </span>
            </>
        );
    };
    const foot = footer();

    return (
        <main className="@container flex h-[calc(100dvh-52px-env(safe-area-inset-top))] min-w-0 flex-col px-4 pb-5 sm:px-6 lg:h-dvh">
            <div className="flex min-h-16 flex-wrap items-center gap-2 py-3">
                <h1 className="mr-auto text-lg leading-6 font-semibold tracking-[-0.02em]">{copy.title}</h1>
                {fresh ? null : (
                    <>
                        <Button disabled={active === 0} onClick={() => setRunning("all")} variant="outline">
                            <HugeiconsIcon icon={PlayIcon} size={16} />
                            <span className="max-sm:hidden">{copy.runPast}</span>
                        </Button>
                        {tab === "conflicts" && conflicts.length > 0 ? (
                            <Button disabled={undecided} onClick={saveChoices}>
                                {copy.conflicts.save}
                            </Button>
                        ) : (
                            <Button onClick={create}>
                                <HugeiconsIcon icon={Add01Icon} size={17} />
                                {copy.create}
                            </Button>
                        )}
                    </>
                )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-4">
                {fresh ? null : (
                    <KpiBand>
                        <Figure label={copy.kpi.active}>
                            {active}
                            <span className="text-muted-foreground text-[15px] font-normal tracking-normal">
                                {" "}
                                {copy.kpi.ofTotal({ count: String(rules.length) })}
                            </span>
                        </Figure>
                        <Figure label={copy.kpi.matches}>{stats.matched}</Figure>
                        <Figure label={copy.kpi.share}>{share}%</Figure>
                        <Figure label={copy.kpi.conflicts} tone={conflicts.length > 0 ? "text-app-warn" : ""}>
                            {conflicts.length}
                        </Figure>
                    </KpiBand>
                )}
                <Frame className="flex min-h-0 min-w-0 flex-1 flex-col" variant="plain">
                    <Frame.Panel className="min-h-0 flex-1 rounded-2xl">
                        {fresh ? null : <div className="border-border border-b">{tabs}</div>}
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                            {fresh ? (
                                <div className="dash-empty relative isolate h-full min-h-[299px]">
                                    <QuietTable />
                                    <b className="text-[15px] font-semibold">{copy.empty.title}</b>
                                    <p className="text-muted-foreground max-w-sm text-[13px]">{copy.empty.line}</p>
                                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                                        {suggestions.length > 0 ? (
                                            <Button onClick={() => setSearch({ tab: "suggested" })} variant="outline">
                                                {suggestions.length === 1
                                                    ? copy.empty.seeOne
                                                    : copy.empty.see({ count: String(suggestions.length) })}
                                            </Button>
                                        ) : null}
                                        <Button onClick={create}>
                                            <HugeiconsIcon icon={Add01Icon} size={17} />
                                            {copy.create}
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                            {!fresh && tab === "all" ? (
                                <RuleList
                                    actions={actions}
                                    data={data}
                                    editing={target?.rule?.id ?? null}
                                    onMoving={setMoving}
                                />
                            ) : null}
                            {tab === "suggested" ? (
                                <SuggestedTable
                                    onAdd={(suggestion) => {
                                        writes.update((current) =>
                                            saved(
                                                current,
                                                ruleFromSuggestion(suggestion, crypto.randomUUID()),
                                                current.rules.length
                                            )
                                        );
                                    }}
                                    onDismiss={(suggestion) => {
                                        writes.update((current) => dismissed(current, suggestion.key));
                                    }}
                                    suggestions={suggestions}
                                />
                            ) : null}
                            {tab === "conflicts" ? (
                                <ConflictList
                                    choices={choices}
                                    data={data}
                                    onChoose={(key, choice: ConflictChoice) =>
                                        setChoices((current) => ({ ...current, [key]: choice }))
                                    }
                                />
                            ) : null}
                            {fresh || foot === null ? null : (
                                <div
                                    className={`text-muted-foreground flex flex-wrap items-center gap-2 py-3 ps-4 pe-6 text-[13px] ${tab === "all" ? "" : "mt-auto"} ${tab === "conflicts" ? "border-border bg-background/30 border-t" : ""}`}
                                >
                                    {foot}
                                </div>
                            )}
                        </div>
                    </Frame.Panel>
                </Frame>
            </div>
            <RuleSheet
                data={data}
                onClose={closeSheet}
                onDelete={setDeleting}
                onRun={setRunning}
                onView={(test) => setSearch({ view: test ? "test" : null }, { replace: true })}
                target={target}
                testing={search.view === "test"}
            />
            {running ? (
                <RunDialog
                    data={data}
                    onClose={() => setRunning(null)}
                    onRun={(changes) => writes.apply(changes, categoryName)}
                    rule={running === "all" ? null : running}
                />
            ) : null}
            {deleting ? (
                <DeleteDialog
                    count={stats.byRule.get(deleting.id)?.count ?? 0}
                    onClose={() => setDeleting(null)}
                    onDelete={() => remove(deleting)}
                    rule={deleting}
                />
            ) : null}
        </main>
    );
}

export function LiveRules({ search, setSearch }: Omit<ScreenProps, "data">) {
    return <RulesScreen data={useRulesData()} search={search} setSearch={setSearch} />;
}
