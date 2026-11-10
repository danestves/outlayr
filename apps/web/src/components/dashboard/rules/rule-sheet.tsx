import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { wallNoon } from "@outlayr/money/ledger-zone";
import { Button } from "panelui-web/button";
import { Sheet } from "panelui-web/sheet";
import { Switch } from "panelui-web/switch";
import { Tabs } from "panelui-web/tabs";
import { useMemo, useState } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { ruleProblems, runOf, saved } from "@/lib/rules";
import type { Change, Rule, Run, Suggestion } from "@/lib/rules";

import { useWide } from "../insights/use-wide";
import { ruleToasts, useRuleWrites } from "./data";
import type { RulesData } from "./data";
import { draftOf, ruleOf, withNewTags } from "./draft";
import { useCategoryLook, useShortDay } from "./parts";
import { BandRow, RuleForm } from "./rule-form";
import { RuleTest } from "./rule-test";

export interface SheetTarget {
    key: string;
    rule: Rule | null;
    seed: Suggestion | null;
}

interface RuleSheetProps {
    data: RulesData;
    onClose: () => void;
    onDelete: (rule: Rule) => void;
    onRun: (rule: Rule) => void;
    onView: (test: boolean) => void;
    target: SheetTarget | null;
    testing: boolean;
}

const NO_RUN: Run = { changes: [], kept: 0, matched: [], right: 0 };

function useMonth() {
    const { locale } = useLocale();
    return useMemo(() => {
        const format = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
        return (day: string) => format.format(wallNoon(day));
    }, [locale]);
}

function Body({
    data,
    onClose,
    onDelete,
    onRun,
    onView,
    target,
    testing,
}: Omit<RuleSheetProps, "target"> & { target: SheetTarget }) {
    const { cancel, close, create, run: runCopy, sheet, test, toast } = useIntlayer("dashboard-rules");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const committer = useLedgerCommitter();
    const writes = useRuleWrites();
    const look = useCategoryLook();
    const shortDay = useShortDay();
    const month = useMonth();
    const { locale } = useLocale();
    const existing = target.rule;
    const others = data.book.rules.filter((rule) => rule.id !== existing?.id);
    const [id] = useState(() => existing?.id ?? crypto.randomUUID());
    const [draft, setDraft] = useState(() => {
        const at = existing ? data.book.rules.findIndex((rule) => rule.id === existing.id) : Number.POSITIVE_INFINITY;
        return draftOf(existing, at, data.tagNames, target.seed, locale);
    });
    const [tried, setTried] = useState(false);
    const [tabbed, setTabbed] = useState(existing !== null || testing);
    const rule = ruleOf(draft, id, data.tagBooks.tags);
    const problems = ruleProblems(rule);
    const live = new Set(data.tagNames.keys());
    const ready = problems.none === null && problems.conditions.every((problem) => problem === null);
    const run = ready ? runOf([rule], data.entries, data.kinds, live) : NO_RUN;
    const count = run.matched.length;
    const total = run.matched.reduce((sum, entry) => sum + Math.abs(entry.worth), 0);
    const oldest = run.matched.at(-1);
    const [newest] = run.matched;
    const view = (next: boolean) => {
        setTabbed((shown) => shown || next);
        onView(next);
    };
    const save = () => {
        if (problems.count > 0) {
            setTried(true);
            view(false);
            return;
        }
        const made = withNewTags(rule, draft);
        if (made.rows.length > 0) {
            void committer.commit(made.rows).settled.then((outcome) => {
                if (outcome.status === "failed") {
                    ruleToasts.add({ title: toast.saveFailed.value, type: "destructive" });
                }
            });
        }
        writes.update((book) => saved(book, made.rule, draft.position));
        if (!existing && draft.runToo) {
            const tags = new Set([...live, ...made.rule.actions.flatMap((a) => (a.type === "tag" ? [a.tagId] : []))]);
            const changes: readonly Change[] = runOf([made.rule], data.entries, data.kinds, tags).changes;
            writes.apply(changes, (categoryId) => look(categoryId)?.name ?? "");
        }
        onClose();
    };
    const matchTitle = () => {
        if (count === 0) {
            return sheet.matchesNone;
        }
        return count === 1 ? sheet.matchesPastOne : sheet.matchesPast({ count: String(count) });
    };
    const matchedLine = (day: string) =>
        count === 1
            ? sheet.matchedOne({ date: shortDay(day) })
            : sheet.matched({ count: String(count), date: shortDay(day) });
    const fixes = problems.count === 1 ? sheet.errors.fixOne : sheet.errors.fix({ count: String(problems.count) });
    return (
        <>
            <Sheet.Header className="border-border border-b pb-5" title={existing ? existing.name : create} />
            {tabbed ? (
                <Tabs
                    onValueChange={(next) => view(next === "test")}
                    value={testing ? "test" : "rule"}
                    variant="underline"
                >
                    <Tabs.List className="px-3">
                        <Tabs.Trigger value="rule">{sheet.ruleTab}</Tabs.Trigger>
                        <Tabs.Trigger value="test">
                            {test.tab}
                            <Tabs.Badge>{count}</Tabs.Badge>
                        </Tabs.Trigger>
                    </Tabs.List>
                </Tabs>
            ) : null}
            {testing ? (
                <div className="flex min-h-0 flex-1 flex-col pt-3">
                    <RuleTest data={data} onBack={() => view(false)} rule={rule} run={run} />
                </div>
            ) : (
                <Sheet.Body className="pt-1">
                    <RuleForm
                        draft={draft}
                        onChange={setDraft}
                        others={others}
                        problems={tried ? problems : null}
                        tagNames={[...data.tagNames.values()]}
                        whole={existing !== null}
                    >
                        <div className="mt-5">
                            {existing ? (
                                <BandRow line={newest ? matchedLine(newest.day) : sheet.matchedNone} title={sheet.on}>
                                    <Switch
                                        aria-label={sheet.on.value}
                                        checked={draft.on}
                                        onCheckedChange={(on) => setDraft({ ...draft, on })}
                                    />
                                </BandRow>
                            ) : (
                                <>
                                    <BandRow
                                        line={
                                            oldest
                                                ? sheet.since({
                                                      month: month(oldest.day),
                                                      total: money(total, ledger.currency),
                                                  })
                                                : sheet.runTooLine
                                        }
                                        title={matchTitle()}
                                    >
                                        <Button
                                            disabled={!ready}
                                            onClick={() => view(true)}
                                            size="sm"
                                            variant="outline"
                                        >
                                            {sheet.test}
                                        </Button>
                                    </BandRow>
                                    <BandRow line={sheet.runTooLine} title={sheet.runToo}>
                                        <Switch
                                            aria-label={sheet.runToo.value}
                                            checked={draft.runToo}
                                            disabled={count === 0}
                                            onCheckedChange={(runToo) => setDraft({ ...draft, runToo })}
                                        />
                                    </BandRow>
                                </>
                            )}
                        </div>
                    </RuleForm>
                </Sheet.Body>
            )}
            <Sheet.Footer className="border-border flex-row items-center justify-end border-t pt-4">
                {existing && !testing ? (
                    <Button
                        className="text-destructive hover:text-destructive mr-auto"
                        onClick={() => onDelete(existing)}
                        variant="ghost"
                    >
                        <HugeiconsIcon icon={Delete02Icon} size={16} />
                        {sheet.delete}
                    </Button>
                ) : null}
                {tried && problems.count > 0 && !testing ? (
                    <span className="text-destructive mr-auto text-[13px]">{fixes}</span>
                ) : null}
                <Button onClick={onClose} variant="ghost">
                    {existing && testing ? close : cancel}
                </Button>
                {existing && testing ? (
                    <Button disabled={run.changes.length === 0} onClick={() => onRun(rule)}>
                        {run.changes.length === 0 ? runCopy.nothing : null}
                        {run.changes.length === 1 ? runCopy.confirmOne : null}
                        {run.changes.length > 1 ? runCopy.confirm({ count: String(run.changes.length) }) : null}
                    </Button>
                ) : (
                    <Button onClick={save}>{existing ? sheet.save : create}</Button>
                )}
            </Sheet.Footer>
        </>
    );
}

export function RuleSheet({ target, testing, ...props }: RuleSheetProps) {
    const wide = useWide();
    const [shown, setShown] = useState(target);
    if (target && target !== shown) {
        setShown(target);
    }
    const width = testing
        ? "sm:w-[min(680px,calc(100vw-2*var(--sheet-gap)))]"
        : "sm:w-[min(540px,calc(100vw-2*var(--sheet-gap)))]";
    return (
        <Sheet
            onOpenChange={(open) => (open ? undefined : props.onClose())}
            open={target !== null}
            side={wide ? "right" : "bottom"}
        >
            <Sheet.Content
                className={`app-shell ph-no-capture ${wide ? width : ""}`}
                showGrabber={false}
                size={wide ? "auto" : "full"}
            >
                {shown ? <Body key={shown.key} target={shown} testing={testing} {...props} /> : null}
            </Sheet.Content>
        </Sheet>
    );
}
