import SearchRemoveIcon from "@hugeicons/core-free-icons/SearchRemoveIcon";
import { Button } from "panelui-web/button";
import { Table } from "panelui-web/table";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { MerchantTile } from "@/components/ledger/tiles";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { photoSrc } from "@/lib/photo-src";
import type { Rule, Run } from "@/lib/rules";

import { Empty } from "../home/empty";
import type { RulesData } from "./data";
import { CategoryBadge, FIGURE, HEAD, LIT, TagMarks, useShortDay } from "./parts";

const CELL = "h-13 px-3 py-0 align-middle first:ps-6 last:pe-6";
const TOP = `${HEAD} first:ps-6 last:pe-6`;

function Stat({
    children,
    label,
    warn = false,
}: {
    children: React.ReactNode;
    label: React.ReactNode;
    warn?: boolean;
}) {
    return (
        <div className="border-border border-l pt-3 pl-3 first:border-0 first:pl-0">
            <small className="text-muted-foreground text-app-caption block">{label}</small>
            <b className={`dash-figure text-app-title font-medium ${warn ? "text-app-warn" : ""}`}>{children}</b>
        </div>
    );
}

export function RuleTest({ data, onBack, rule, run }: { data: RulesData; onBack: () => void; rule: Rule; run: Run }) {
    const { columns, test } = useIntlayer("dashboard-rules");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const shortDay = useShortDay();
    if (run.matched.length === 0) {
        const [only] = rule.conditions;
        const named = rule.conditions.length === 1 && only && only.field !== "amount" && only.value !== "";
        const count = String(data.entries.length);
        return (
            <Empty
                action={
                    <Button onClick={onBack} size="sm" variant="outline">
                        {test.back}
                    </Button>
                }
                icon={SearchRemoveIcon}
                line={
                    named
                        ? test.emptyHas({
                              count,
                              field: only.field === "merchant" ? test.fieldMerchant.value : test.fieldDescription.value,
                              value: only.value,
                          })
                        : test.emptyLine({ count })
                }
                title={test.emptyTitle}
            />
        );
    }
    const changes = new Map(run.changes.map((change) => [change.entry.id, change]));
    const total = run.matched.reduce((sum, entry) => sum + Math.abs(entry.worth), 0);
    return (
        <>
            <div className="grid grid-cols-3 px-6 pt-1 pb-4">
                <Stat label={test.match}>
                    {run.matched.length === 1 ? test.entriesOne : test.entries({ count: String(run.matched.length) })}
                </Stat>
                <Stat label={test.total}>{money(total, ledger.currency)}</Stat>
                <Stat label={test.wouldChange} warn={run.changes.length > 0}>
                    {run.changes.length}
                </Stat>
            </div>
            <Table className="border-border w-full border-t" containerClassName="min-h-0 flex-1 overflow-auto">
                <Table.Header>
                    <Table.Row className="border-0 hover:bg-transparent">
                        <Table.Head className={TOP}>{columns.date}</Table.Head>
                        <Table.Head className={TOP}>{columns.entry}</Table.Head>
                        <Table.Head align="end" className={TOP}>
                            {columns.amount}
                        </Table.Head>
                        <Table.Head className={TOP}>{columns.now}</Table.Head>
                        <Table.Head className={TOP}>{columns.becomes}</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {run.matched.map((entry) => {
                        const change = changes.get(entry.id);
                        return (
                            <Table.Row className={`border-0 ${change ? LIT : "hover:bg-transparent"}`} key={entry.id}>
                                <Table.Cell className={`${CELL} ${FIGURE} text-muted-foreground`}>
                                    <span className="text-app-label">{shortDay(entry.day)}</span>
                                </Table.Cell>
                                <Table.Cell className={CELL}>
                                    <div className="text-app-body flex items-center gap-2.5 font-medium">
                                        <MerchantTile imageUrl={photoSrc(entry.imageKey)} name={entry.note} />
                                        <span className="max-w-44 truncate">{entry.note}</span>
                                    </div>
                                </Table.Cell>
                                <Table.Cell align="end" className={`${CELL} ${FIGURE}`}>
                                    <span className="text-app-label">
                                        {money(entry.income ? entry.amount : -entry.amount, entry.currency)}
                                    </span>
                                </Table.Cell>
                                <Table.Cell className={CELL}>
                                    <CategoryBadge id={entry.categoryId} />
                                </Table.Cell>
                                <Table.Cell className={CELL}>
                                    {change ? (
                                        <div className="flex items-center gap-1.5">
                                            {change.categoryId === null ? null : (
                                                <CategoryBadge id={change.categoryId} />
                                            )}
                                            <TagMarks ids={change.tagIds} names={data.tagNames} />
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-app-label">{test.noChange}</span>
                                    )}
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table>
        </>
    );
}
