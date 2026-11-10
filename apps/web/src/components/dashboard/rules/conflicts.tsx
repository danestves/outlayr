import { Badge } from "panelui-web/badge";
import { Radio, RadioGroup } from "panelui-web/radio-group";
import { Table } from "panelui-web/table";
import { useId } from "react";
import { useIntlayer } from "react-intlayer";

import { useDisplayFormat } from "@/lib/ledger-settings";
import { categoryOf, skipConditionOf, tagsOf } from "@/lib/rules";
import type { Conflict, ConflictChoice } from "@/lib/rules";

import { QuietTable } from "../home/setup";
import type { RulesData } from "./data";
import { CategoryBadge, FIGURE, HEAD, LIT, NOTE, TagMarks, useCategoryLook, useShortDay } from "./parts";

const CELL = "h-12 px-3 py-0 align-middle first:ps-3.5 last:pe-3.5";

export type ConflictChoices = Readonly<Record<string, ConflictChoice>>;

function Option({
    choice,
    line,
    picked,
    title,
}: {
    choice: ConflictChoice;
    line: string;
    picked: ConflictChoice;
    title: string;
}) {
    const id = useId();
    return (
        <label
            className={`border-border flex cursor-pointer items-start gap-3 border-t px-3.5 py-3 ${picked === choice ? LIT : "hover:bg-muted/40"}`}
            htmlFor={id}
        >
            <Radio className="mt-0.5" id={id} value={choice} />
            <span className="flex min-w-0 flex-col">
                <b className="text-sm leading-5 font-medium">{title}</b>
                <span className={NOTE}>{line}</span>
            </span>
        </label>
    );
}

function ConflictBlock({
    choice,
    conflict,
    data,
    onChoose,
}: {
    choice: ConflictChoice;
    conflict: Conflict;
    data: RulesData;
    onChoose: (choice: ConflictChoice) => void;
}) {
    const { columns, conflicts } = useIntlayer("dashboard-rules");
    const { money } = useDisplayFormat();
    const shortDay = useShortDay();
    const look = useCategoryLook();
    const { entries, first, second } = conflict;
    const position = (id: string) => data.book.rules.findIndex((rule) => rule.id === id) + 1;
    const firstCategory = categoryOf(first);
    const secondCategory = categoryOf(second);
    const nameOf = (id: string | null) => (id === null ? "" : (look(id)?.name ?? ""));
    const tags = [...new Set([...tagsOf(first), ...tagsOf(second)])];
    const secondTags = tagsOf(second)
        .flatMap((id) => {
            const name = data.tagNames.get(id);
            return name === undefined ? [] : [`#${name}`];
        })
        .join(", ");
    const skip = skipConditionOf(first, second);
    const count = String(entries.length);
    const names = { first: first.name, second: second.name };
    return (
        <section>
            <div className="bg-foreground/[0.03] flex min-h-12 flex-wrap items-center gap-2 px-4 py-2">
                <b className="text-muted-foreground text-sm font-normal">
                    {entries.length === 1 ? conflicts.bothOne(names) : conflicts.both({ ...names, count })}
                </b>
                <Badge className="ml-auto" dot variant="warning">
                    {conflicts.or({ first: nameOf(firstCategory), second: nameOf(secondCategory) })}
                </Badge>
            </div>
            <Table className="w-full" containerClassName="overflow-x-auto">
                <Table.Header>
                    <Table.Row className="border-border border-t hover:bg-transparent">
                        <Table.Head className={HEAD}>{columns.date}</Table.Head>
                        <Table.Head className={HEAD}>{columns.description}</Table.Head>
                        <Table.Head align="end" className={HEAD}>
                            {columns.amount}
                        </Table.Head>
                        <Table.Head className={HEAD}>
                            {position(first.id)} · {first.name}
                        </Table.Head>
                        <Table.Head className={HEAD}>
                            {position(second.id)} · {second.name}
                        </Table.Head>
                        <Table.Head className={HEAD}>{columns.result}</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {entries.map((entry) => (
                        <Table.Row className="hover:bg-transparent" key={entry.id}>
                            <Table.Cell className={`${CELL} ${FIGURE} text-muted-foreground text-sm`}>
                                {shortDay(entry.day)}
                            </Table.Cell>
                            <Table.Cell className={`${CELL} ${FIGURE} max-w-64 truncate text-sm`}>
                                {entry.details || entry.note}
                            </Table.Cell>
                            <Table.Cell align="end" className={`${CELL} ${FIGURE} text-sm`}>
                                {money(entry.income ? entry.amount : -entry.amount, entry.currency)}
                            </Table.Cell>
                            <Table.Cell className={CELL}>
                                <div className="flex items-center gap-1.5">
                                    <CategoryBadge id={firstCategory} />
                                    <TagMarks ids={tagsOf(first)} names={data.tagNames} />
                                </div>
                            </Table.Cell>
                            <Table.Cell className={CELL}>
                                <div className="flex items-center gap-1.5">
                                    <CategoryBadge id={secondCategory} />
                                    <TagMarks ids={tagsOf(second)} names={data.tagNames} />
                                </div>
                            </Table.Cell>
                            <Table.Cell className={CELL}>
                                <div className="flex items-center gap-1.5">
                                    <CategoryBadge id={firstCategory} />
                                    <TagMarks ids={tags} names={data.tagNames} />
                                </div>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            <RadioGroup
                className="border-border gap-0 border-b"
                onValueChange={(value) => {
                    const next = (["first", "second", "skip", "leave"] as const).find((each) => each === value);
                    if (next) {
                        onChoose(next);
                    }
                }}
                value={choice}
            >
                <Option
                    choice="first"
                    line={
                        secondTags === ""
                            ? conflicts.firstLine({ category: nameOf(firstCategory), first: first.name }).value
                            : conflicts.firstLineTags({
                                  category: nameOf(firstCategory),
                                  first: first.name,
                                  second: second.name,
                                  tags: secondTags,
                              }).value
                    }
                    picked={choice}
                    title={conflicts.orderTitle({ name: first.name }).value}
                />
                <Option
                    choice="second"
                    line={conflicts.secondLine({ category: nameOf(secondCategory), count }).value}
                    picked={choice}
                    title={conflicts.orderTitle({ name: second.name }).value}
                />
                {skip && skip.field !== "amount" ? (
                    <Option
                        choice="skip"
                        line={
                            secondTags === ""
                                ? conflicts.skipLine({ name: second.name }).value
                                : conflicts.skipLineTags({ name: second.name, tags: secondTags }).value
                        }
                        picked={choice}
                        title={conflicts.skipTitle({ name: second.name, value: skip.value }).value}
                    />
                ) : null}
                <Option
                    choice="leave"
                    line={conflicts.leaveLine.value}
                    picked={choice}
                    title={conflicts.leaveTitle.value}
                />
            </RadioGroup>
        </section>
    );
}

export function ConflictList({
    choices,
    data,
    onChoose,
}: {
    choices: ConflictChoices;
    data: RulesData;
    onChoose: (key: string, choice: ConflictChoice) => void;
}) {
    const { conflicts } = useIntlayer("dashboard-rules");
    if (data.conflicts.length === 0) {
        return (
            <div className="dash-empty relative isolate min-h-[299px] justify-end pt-0 pb-7">
                <QuietTable />
                <b className="text-[15px] font-semibold">{conflicts.emptyTitle}</b>
                <p className="text-muted-foreground max-w-sm text-[13px]">{conflicts.emptyLine}</p>
            </div>
        );
    }
    return data.conflicts.map((conflict) => (
        <ConflictBlock
            choice={choices[conflict.key] ?? "first"}
            conflict={conflict}
            data={data}
            key={conflict.key}
            onChoose={(choice) => onChoose(conflict.key, choice)}
        />
    ));
}
