import Idea01Icon from "@hugeicons/core-free-icons/Idea01Icon";
import { Button } from "panelui-web/button";
import { Table } from "panelui-web/table";
import { useIntlayer } from "react-intlayer";

import type { Suggestion } from "@/lib/rules";

import { Empty } from "../home/empty";
import { CELL, CategoryBadge, ConditionChip, FIGURE, HEAD, NAME } from "./parts";

const ROW = "h-15";

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
        return <Empty icon={Idea01Icon} line={suggested.emptyLine} title={suggested.emptyTitle} />;
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
                    <Table.Head className={`${HEAD} w-42.5`} />
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {suggestions.map((suggestion) => (
                    <Table.Row className="hover:bg-muted/40" key={suggestion.key}>
                        <Table.Cell className={`${CELL} ${ROW}`}>
                            <span className={NAME}>{suggestion.name}</span>
                        </Table.Cell>
                        <Table.Cell className={`${CELL} ${ROW}`}>
                            <ConditionChip condition={{ field: "merchant", op: "contains", value: suggestion.value }} />
                        </Table.Cell>
                        <Table.Cell className={`${CELL} ${ROW}`}>
                            <CategoryBadge id={suggestion.categoryId} />
                        </Table.Cell>
                        <Table.Cell align="end" className={`${CELL} ${ROW} ${FIGURE}`}>
                            <span className="text-app-body">{suggestion.entries}</span>
                        </Table.Cell>
                        <Table.Cell align="end" className={`${CELL} ${ROW} ${FIGURE} text-muted-foreground`}>
                            <span className="text-app-body">
                                {suggested.pickedOf({
                                    picked: String(suggestion.picked),
                                    total: String(suggestion.entries),
                                })}
                            </span>
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
