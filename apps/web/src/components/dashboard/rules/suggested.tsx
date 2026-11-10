import { Button } from "panelui-web/button";
import { Table } from "panelui-web/table";
import { useIntlayer } from "react-intlayer";

import type { Suggestion } from "@/lib/rules";

import { QuietTable } from "../home/setup";
import { CELL, CategoryBadge, ConditionChip, FIGURE, HEAD, NAME } from "./parts";

const ROW = "h-[60px]";

export function SuggestedTable({
    onAdd,
    onDismiss,
    suggestions,
}: {
    onAdd: (suggestion: Suggestion) => void;
    onDismiss: (suggestion: Suggestion) => void;
    suggestions: readonly Suggestion[];
}) {
    const { columns, suggested } = useIntlayer("dashboard-rules");
    if (suggestions.length === 0) {
        return (
            <div className="dash-empty relative isolate min-h-[299px] justify-end pt-0 pb-7">
                <QuietTable />
                <b className="text-[15px] font-semibold">{suggested.emptyTitle}</b>
                <p className="text-muted-foreground max-w-sm text-[13px]">{suggested.emptyLine}</p>
            </div>
        );
    }
    return (
        <Table className="w-full" containerClassName="overflow-x-auto">
            <Table.Header className="in-data-[sticky]:bg-card">
                <Table.Row className="border-0 hover:bg-transparent">
                    <Table.Head className={`${HEAD} w-[14.4%]`}>{columns.rule}</Table.Head>
                    <Table.Head className={`${HEAD} w-[29.4%]`}>{columns.when}</Table.Head>
                    <Table.Head className={HEAD}>{columns.outcome}</Table.Head>
                    <Table.Head align="end" className={HEAD}>
                        {columns.entries}
                    </Table.Head>
                    <Table.Head align="end" className={HEAD}>
                        {columns.picked}
                    </Table.Head>
                    <Table.Head className={`${HEAD} w-[170px]`} />
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {suggestions.map((suggestion) => (
                    <Table.Row className="hover:bg-muted/40" key={suggestion.key}>
                        <Table.Cell className={`${CELL} ${ROW} ${NAME}`}>{suggestion.name}</Table.Cell>
                        <Table.Cell className={`${CELL} ${ROW}`}>
                            <ConditionChip condition={{ field: "merchant", op: "contains", value: suggestion.value }} />
                        </Table.Cell>
                        <Table.Cell className={`${CELL} ${ROW}`}>
                            <CategoryBadge id={suggestion.categoryId} />
                        </Table.Cell>
                        <Table.Cell align="end" className={`${CELL} ${ROW} ${FIGURE} text-sm`}>
                            {suggestion.entries}
                        </Table.Cell>
                        <Table.Cell align="end" className={`${CELL} ${ROW} ${FIGURE} text-muted-foreground text-sm`}>
                            {suggested.pickedOf({
                                picked: String(suggestion.picked),
                                total: String(suggestion.entries),
                            })}
                        </Table.Cell>
                        <Table.Cell className={`${CELL} ${ROW}`}>
                            <div className="flex justify-end gap-1.5">
                                <Button
                                    className="text-muted-foreground"
                                    onClick={() => onDismiss(suggestion)}
                                    size="sm"
                                    variant="outline"
                                >
                                    {suggested.dismiss}
                                </Button>
                                <Button onClick={() => onAdd(suggestion)} size="sm" variant="outline">
                                    {suggested.add}
                                </Button>
                            </div>
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table>
    );
}
