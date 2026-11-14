import { Button } from "panelui-web/button";
import { Chip } from "panelui-web/chip";
import { Frame } from "panelui-web/frame";
import { Sheet } from "panelui-web/sheet";
import { Table } from "panelui-web/table";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import licenses from "../../../../../../native/src/screens/settings/licenses.json";

const NAMED = ["MIT", "Apache-2.0", "ISC"] as const;
const COLLAPSED = 11;

type License = (typeof licenses)[number];
type Filter = "all" | "other" | (typeof NAMED)[number];

const matches = (filter: Filter, license: string) =>
    filter === "all" || (filter === "other" ? !NAMED.some((name) => name === license) : license === filter);

const isFilter = (value: string): value is Filter =>
    value === "all" || value === "other" || NAMED.some((name) => name === value);

export function LicensesTab() {
    const copy = useIntlayer("dashboard-about");
    const [filter, setFilter] = useState<Filter>("all");
    const [expanded, setExpanded] = useState(false);
    const [open, setOpen] = useState<License | null>(null);
    const shown = useMemo(() => licenses.filter((row) => matches(filter, row.license)), [filter]);
    const rows = expanded ? shown : shown.slice(0, COLLAPSED);
    const labels: Partial<Record<Filter, ReactNode>> = { all: copy.all, other: copy.other };
    const count = (value: Filter) => licenses.filter((row) => matches(value, row.license)).length;
    return (
        <div className="flex flex-col gap-4">
            <Chip.Group
                aria-label={copy.license.value}
                multiple={false}
                onValueChange={(next) => {
                    const [picked] = next;
                    if (picked && isFilter(picked)) {
                        setFilter(picked);
                    }
                }}
                value={[filter]}
            >
                {(["all", ...NAMED, "other"] as const).map((value) => (
                    <Chip key={value} value={value}>
                        {labels[value] ?? value} {count(value)}
                    </Chip>
                ))}
            </Chip.Group>
            <Frame className="min-w-0">
                <Frame.Panel>
                    <Table framed aria-label={copy.tabLicenses.value} maxHeight="none">
                        <Table.Header className="in-data-[sticky]:bg-card">
                            <Table.Row>
                                <Table.Head>{copy.package}</Table.Head>
                                <Table.Head>{copy.versionColumn}</Table.Head>
                                <Table.Head align="end">{copy.license}</Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {rows.map((row) => (
                                <Table.Row key={row.name}>
                                    <Table.Cell className="max-w-[260px] truncate font-medium">
                                        <button
                                            className="truncate text-left hover:underline"
                                            onClick={() => setOpen(row)}
                                            type="button"
                                        >
                                            {row.name}
                                        </button>
                                    </Table.Cell>
                                    <Table.Cell className="dash-figure text-muted-foreground">{row.version}</Table.Cell>
                                    <Table.Cell align="end" className="text-muted-foreground">
                                        {row.license}
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table>
                </Frame.Panel>
                <Frame.Footer className="text-sm">
                    <div className="flex w-full items-center justify-between">
                        <span className="dash-figure text-muted-foreground">
                            {copy.ofTotal({ shown: rows.length, total: shown.length })}
                        </span>
                        {shown.length > COLLAPSED ? (
                            <Button onClick={() => setExpanded(!expanded)} size="sm" variant="ghost">
                                {copy.showAll}
                            </Button>
                        ) : null}
                    </div>
                </Frame.Footer>
            </Frame>
            <Sheet onOpenChange={(next) => next || setOpen(null)} open={open !== null} side="right">
                <Sheet.Content className="app-shell">
                    <Sheet.Header>
                        <Sheet.Title>{open?.name}</Sheet.Title>
                    </Sheet.Header>
                    <Sheet.Body>
                        <dl className="border-border mb-3 border-b text-[13px]">
                            <div className="border-border flex justify-between border-t py-2.5">
                                <dt className="text-muted-foreground">{copy.versionColumn}</dt>
                                <dd className="dash-figure">{open?.version}</dd>
                            </div>
                            <div className="border-border flex justify-between border-t py-2.5">
                                <dt className="text-muted-foreground">{copy.license}</dt>
                                <dd className="font-medium">{open?.license}</dd>
                            </div>
                        </dl>
                        <p className="text-muted-foreground text-[13px] leading-5 wrap-anywhere whitespace-pre-wrap">
                            {open?.text || copy.noText}
                        </p>
                    </Sheet.Body>
                </Sheet.Content>
            </Sheet>
        </div>
    );
}
