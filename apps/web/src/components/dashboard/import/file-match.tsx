import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { RadioGroup } from "panelui-web/radio-group";
import { Table } from "panelui-web/table";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { Pick } from "@/components/dashboard/transactions/entry-form";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { columnValues, FIELDS, missingNeeds, readRows, retargeted, tidyLabel } from "@/lib/import-file";
import type { CsvFile, Target } from "@/lib/import-file";
import { useDisplayFormat } from "@/lib/ledger-settings";

import type { Draft, DraftStore } from "./draft";
import { datesOf, knownFormat } from "./file-flow";
import { AccountPick, NONE, useEntryDay } from "./file-parts";
import { HEAD } from "./history";
import { Banner, Card, Columns, FileHead, FileStats, ImportBar, ImportPage, NOTE } from "./parts";

const ROW = "h-[61px] px-3 py-0 align-middle text-[13px] first:ps-4 last:pe-4";
const PREVIEW_ROWS = 3;
const SAMPLE = 3;
const MONTHS_IN_YEAR = 12;

const SKELETON_WIDTHS = [
    [40, 60, 40, 60],
    [60, 100, 40, 60],
    [60, 90, 50, 80],
    [80, 120, 40, 60],
    [50, 100, 40, 70],
    [40, 80, 40, 60],
] as const;

const NEEDS = ["date", "label", "amount"] as const;

const FORMAT_LABEL: Record<string, string> = {};
const formatLabel = (format: string) => FORMAT_LABEL[format] ?? format.replaceAll("d", "D").replaceAll("y", "Y");

function DateChoice({
    draft,
    file,
    format,
    onFormat,
    options,
}: {
    draft: Draft;
    file: CsvFile;
    format: string;
    onFormat: (format: string) => void;
    options: { dayFirst: string; monthFirst: string };
}) {
    const { columns, match } = useIntlayer("dashboard-import");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const day = useEntryDay();
    const read = (dateFormat: string) => readRows(file, draft.targets, { dateFormat, offsetAt: ledger.offsetAt }).rows;
    const monthRows = read(options.monthFirst);
    const dayRows = read(options.dayFirst);
    const dayOf = new Map(dayRows.map((row) => [row.index, row.at]));
    const months = (rows: typeof monthRows) =>
        new Set(rows.map((row) => Math.floor(row.at / 86_400_000 / (365.25 / MONTHS_IN_YEAR)))).size;
    const picked = format === options.dayFirst ? "dayFirst" : "monthFirst";
    const other = picked === "dayFirst" ? "monthFirst" : "dayFirst";
    const otherRows = other === "dayFirst" ? dayRows : monthRows;
    return (
        <Card
            action={
                <Badge className="h-6 gap-1.5 rounded-md px-2 text-xs font-medium" variant="warning">
                    <i className="size-1.5 rounded-full bg-current" />
                    {match.needsChoice}
                </Badge>
            }
            footer={
                <>
                    <span className="text-muted-foreground">{match.bothWays({ count: monthRows.length })}</span>
                    <span className="text-muted-foreground">
                        {match.spreads({ count: months(otherRows), order: match[other].value })}
                    </span>
                </>
            }
            title={match.whichFirst}
        >
            <RadioGroup
                aria-label={match.whichFirst.value}
                className="grid grid-cols-2 gap-3 px-5 pb-4"
                onValueChange={(next) => onFormat(next === "dayFirst" ? options.dayFirst : options.monthFirst)}
                value={picked}
            >
                {(["monthFirst", "dayFirst"] as const).map((order) => (
                    <RadioGroup.Card className="py-[11px]" key={order} value={order}>
                        <RadioGroup.CardBody>
                            <RadioGroup.CardTitle>{match[order]}</RadioGroup.CardTitle>
                            <RadioGroup.CardDescription className="dash-figure text-xs leading-4">
                                {formatLabel(options[order])}
                            </RadioGroup.CardDescription>
                        </RadioGroup.CardBody>
                    </RadioGroup.Card>
                ))}
            </RadioGroup>
            <Table containerClassName="overflow-x-auto">
                <Table.Header>
                    <Table.Row className="border-b-0">
                        <Table.Head className={`${HEAD} md:w-[187px]`}>{columns.inYourFile}</Table.Head>
                        <Table.Head className={`${HEAD} md:w-[177px]`}>{match.field.merchant}</Table.Head>
                        <Table.Head
                            className={`${HEAD} md:w-[147px] ${picked === "monthFirst" ? "text-foreground" : ""}`}
                        >
                            {match.monthFirst}
                        </Table.Head>
                        <Table.Head className={`${HEAD} ${picked === "dayFirst" ? "text-foreground" : ""}`}>
                            {match.dayFirst}
                        </Table.Head>
                        <Table.Head align="end" className={`${HEAD} md:w-40`}>
                            {columns.amount}
                        </Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {monthRows.map((row) => {
                        const dayAt = dayOf.get(row.index);
                        return (
                            <Table.Row key={row.index}>
                                <Table.Cell className="dash-figure text-muted-foreground h-[45px] px-3 py-0 text-[13px] first:ps-4">
                                    {row.dateText}
                                </Table.Cell>
                                <Table.Cell className="h-[45px] px-3 py-0 text-[13px] font-medium">
                                    {tidyLabel(row.label)}
                                </Table.Cell>
                                <Table.Cell
                                    className={`dash-figure h-[45px] px-3 py-0 text-[13px] ${picked === "monthFirst" ? "" : "text-muted-foreground"}`}
                                >
                                    {day(row.at)}
                                </Table.Cell>
                                <Table.Cell
                                    className={`dash-figure h-[45px] px-3 py-0 text-[13px] ${picked === "dayFirst" ? "" : "text-muted-foreground"}`}
                                >
                                    {dayAt === undefined ? "–" : day(dayAt)}
                                </Table.Cell>
                                <Table.Cell
                                    align="end"
                                    className={`dash-figure h-[45px] px-3 py-0 text-sm last:pe-4 ${row.income ? "text-app-income" : ""}`}
                                >
                                    {money(
                                        row.income ? row.amount : -row.amount,
                                        row.currency ?? ledger.currency,
                                        "always"
                                    )}
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table>
        </Card>
    );
}

function Preview({ draft, file, format }: { draft: Draft; file: CsvFile; format: string | null }) {
    const { columns, match } = useIntlayer("dashboard-import");
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    const day = useEntryDay();
    const ready = format !== null && missingNeeds(draft.targets).length === 0;
    const rows = ready ? readRows(file, draft.targets, { dateFormat: format, offsetAt: ledger.offsetAt }).rows : [];
    return (
        <>
            <Frame.Header>
                <Frame.Title as="h2">{match.preview}</Frame.Title>
                {ready ? (
                    <Frame.Action className="text-muted-foreground justify-self-end text-[13px]">
                        {match.previewCount({ shown: Math.min(PREVIEW_ROWS, rows.length), total: file.rows.length })}
                    </Frame.Action>
                ) : null}
            </Frame.Header>
            <Frame.Panel className="flex flex-1 flex-col">
                {ready ? (
                    <Table>
                        <Table.Header>
                            <Table.Row className="border-b-0">
                                <Table.Head className={`${HEAD} md:w-64`}>{columns.date}</Table.Head>
                                <Table.Head className={HEAD}>{columns.merchant}</Table.Head>
                                <Table.Head align="end" className={HEAD}>
                                    {columns.amount}
                                </Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {rows.slice(0, PREVIEW_ROWS).map((row) => (
                                <Table.Row key={row.index}>
                                    <Table.Cell className="dash-figure text-muted-foreground h-[45px] px-3 py-0 text-sm first:ps-4">
                                        {day(row.at)}
                                    </Table.Cell>
                                    <Table.Cell className="h-[45px] px-3 py-0 text-sm">
                                        {tidyLabel(row.label)}
                                    </Table.Cell>
                                    <Table.Cell
                                        align="end"
                                        className={`dash-figure h-[45px] px-3 py-0 text-sm last:pe-4 ${row.income ? "text-app-income" : ""}`}
                                    >
                                        {money(
                                            row.income ? row.amount : -row.amount,
                                            row.currency ?? ledger.currency,
                                            "always"
                                        )}
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table>
                ) : (
                    <div className="relative flex flex-1 flex-col">
                        <div
                            aria-hidden
                            className="absolute inset-0 overflow-hidden"
                            style={{ maskImage: "linear-gradient(to bottom, #000 55%, transparent)" }}
                        >
                            {SKELETON_WIDTHS.map((widths, row) => (
                                <div className="grid h-[42px] grid-cols-4 items-center border-b px-4" key={row}>
                                    {widths.map((width, cell) => (
                                        <i
                                            className={`bg-app-fill h-2 rounded-full ${cell === widths.length - 1 ? "justify-self-end" : ""}`}
                                            key={cell}
                                            style={{ width }}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                        <div className="relative mt-auto flex flex-col items-center px-4 py-10 text-center">
                            <b className="text-sm font-semibold">{match.noPreview}</b>
                            <p className="text-muted-foreground mt-1 text-[13px]">{match.noPreviewHint}</p>
                        </div>
                    </div>
                )}
            </Frame.Panel>
        </>
    );
}

function useFieldOptions() {
    const { match } = useIntlayer("dashboard-import");
    return [...FIELDS, "skip" as const].map((field) => ({ label: match.field[field].value, value: field }));
}

const isTarget = (value: string): value is Target => value === "skip" || FIELDS.some((field) => field === value);

export function MatchStep({
    draft,
    onCancel,
    onDifferentFile,
    store,
}: {
    draft: Draft;
    onCancel: () => void;
    onDifferentFile: () => void;
    store: DraftStore;
}) {
    const copy = useIntlayer("dashboard-import");
    const { columns, match, upload } = copy;
    const { ledger } = useDashboard();
    const navigate = useNavigate();
    const fieldOptions = useFieldOptions();
    const [asking, setAsking] = useState(false);
    const file: CsvFile = { header: draft.header, rows: draft.rows, width: draft.header.length };
    const needs = missingNeeds(draft.targets);
    const dates = datesOf(file, draft.targets);
    const dateColumn = draft.targets.indexOf("date");
    const unreadable = dates?.kind === "unreadable";
    const ambiguous = dates?.kind === "ambiguous" ? dates : null;
    const chosen = ambiguous && draft.dateFormat !== null ? draft.dateFormat : null;
    const previewFormat = ambiguous ? (chosen ?? ambiguous.monthFirst) : draft.dateFormat;
    const accounts = openAccounts(ledger.books);
    const hasAccountColumn = draft.targets.includes("account");
    const labelColumn = draft.targets.indexOf("merchant");
    const categoryColumn = draft.targets.indexOf("category");
    const required = 3 - needs.length;
    const ready = needs.length === 0 && !unreadable && dates !== null;

    const retarget = (column: number, target: Target) => {
        const targets = retargeted(draft.targets, column, target);
        store.change({ dateFormat: knownFormat(datesOf(file, targets)), targets });
    };

    const proceed = () => {
        if (ambiguous && !asking) {
            setAsking(true);
            store.change({ dateFormat: chosen ?? ambiguous.monthFirst });
            return;
        }
        store.change({ step: "resolve" });
    };

    const bar = (
        <ImportBar step="match">
            <Button onClick={asking ? () => setAsking(false) : onCancel} variant="outline">
                {asking ? copy.back : copy.cancel}
            </Button>
            <Button disabled={!ready} onClick={proceed}>
                {copy.continue}
            </Button>
        </ImportBar>
    );

    let dateStat: ReactNode = "–";
    if (ambiguous) {
        dateStat = "?";
    } else if (previewFormat !== null) {
        dateStat = formatLabel(previewFormat).replace(/[^A-Z]*Y+[^A-Z]*/, "");
    }
    const fileCard = (
        <Card title={upload.file}>
            <FileHead
                name={draft.name}
                note={
                    draft.source === "pdf"
                        ? upload.readByAi({ seconds: Math.round((draft.readMs ?? 0) / 1000) })
                        : upload.readOnDevice
                }
                source={draft.source === "notion" ? "notion" : "csv"}
            />
            <FileStats
                className="mb-3.5"
                columns={draft.header.length}
                dates={dateStat}
                rows={draft.rows.length.toLocaleString()}
            />
            {asking ? null : (
                <div className="px-4 pb-4">
                    <Button className="w-full" onClick={onDifferentFile} size="sm" variant="outline">
                        {match.chooseDifferent}
                    </Button>
                </div>
            )}
        </Card>
    );

    if (asking && ambiguous) {
        return (
            <ImportPage>
                {bar}
                <Columns
                    rail={
                        <>
                            {fileCard}
                            <Card title={match.whyAsk}>
                                <p className={`${NOTE} py-4`}>{match.whyAskText}</p>
                            </Card>
                        </>
                    }
                >
                    <DateChoice
                        draft={draft}
                        file={file}
                        format={chosen ?? ambiguous.monthFirst}
                        onFormat={(dateFormat) => store.change({ dateFormat })}
                        options={ambiguous}
                    />
                </Columns>
            </ImportPage>
        );
    }

    return (
        <ImportPage>
            {bar}
            <Columns
                rail={
                    <>
                        {fileCard}
                        {needs.length > 0 ? (
                            <Card title={match.needed}>
                                <div className="pt-4 pb-2 [&>div:not(:first-child)]:border-t">
                                    {NEEDS.map((need) => (
                                        <div className="flex min-h-9 items-center gap-3 px-4 text-[13px]" key={need}>
                                            <span className="text-muted-foreground">{match.need[need]}</span>
                                            <Glyph
                                                className={`ms-auto ${needs.includes(need) ? "text-destructive" : "text-app-income"}`}
                                                icon={needs.includes(need) ? Cancel01Icon : Tick02Icon}
                                                size={17}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ) : (
                            <>
                                {hasAccountColumn ? null : (
                                    <Card title={match.intoAccount}>
                                        <div className="p-4">
                                            {accounts.length === 0 ? (
                                                <>
                                                    <p className="text-muted-foreground text-[13px] leading-5">
                                                        {match.noAccountNote}
                                                    </p>
                                                    <button
                                                        className="text-primary mt-1 cursor-pointer text-[13px] leading-5 font-medium hover:underline"
                                                        onClick={() => navigate({ to: "/app/accounts" })}
                                                        type="button"
                                                    >
                                                        {match.createAccount}
                                                    </button>
                                                </>
                                            ) : (
                                                <AccountPick
                                                    extra={[{ label: match.none.value, value: NONE }]}
                                                    onPick={(value) =>
                                                        store.change({ intoAccountId: value === NONE ? null : value })
                                                    }
                                                    value={draft.intoAccountId ?? NONE}
                                                />
                                            )}
                                        </div>
                                    </Card>
                                )}
                                <Card title={match.categoryCard}>
                                    <p className={`${NOTE} py-4`}>
                                        {categoryColumn === -1
                                            ? match.noCategoryColumn({
                                                  column: draft.header[labelColumn] ?? match.field.merchant.value,
                                              })
                                            : match.categoryColumn({ column: draft.header[categoryColumn] ?? "" })}
                                    </p>
                                </Card>
                            </>
                        )}
                    </>
                }
            >
                <Frame className="min-w-0 flex-1">
                    <Frame.Header>
                        <Frame.Title as="h2">{match.title}</Frame.Title>
                        <Frame.Action className="justify-self-end text-[13px]">
                            {needs.length > 0 ? (
                                <Badge
                                    className="h-6 gap-1.5 rounded-md px-2 text-xs font-medium"
                                    variant="destructive"
                                >
                                    <i className="size-1.5 rounded-full bg-current" />
                                    {match.required({ count: required })}
                                </Badge>
                            ) : (
                                <span className="text-muted-foreground">{match.required({ count: required })}</span>
                            )}
                        </Frame.Action>
                    </Frame.Header>
                    <Frame.Panel>
                        {needs.length > 0 ? (
                            <Banner
                                title={match.missing({ gaps: needs.map((need) => match.gap[need].value).join(", ") })}
                                tone="bad"
                            />
                        ) : null}
                        {unreadable && dateColumn !== -1 ? (
                            <Banner
                                title={match.unreadableDates({ column: draft.header[dateColumn] ?? "" })}
                                tone="bad"
                            />
                        ) : null}
                        <Table containerClassName="overflow-x-auto">
                            <Table.Header>
                                <Table.Row className="border-b-0">
                                    <Table.Head className={`${HEAD} md:w-40`}>{columns.inYourFile}</Table.Head>
                                    <Table.Head className={`${HEAD} max-md:hidden`}>{columns.firstRows}</Table.Head>
                                    <Table.Head className={HEAD}>{columns.goesTo}</Table.Head>
                                    <Table.Head className={`${HEAD} w-[60px]`} />
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {draft.header.map((name, column) => {
                                    const target = draft.targets[column] ?? "skip";
                                    const bad = column === dateColumn && unreadable;
                                    return (
                                        <Table.Row key={`${name}-${column}`}>
                                            <Table.Cell className={`${ROW} text-sm font-medium`}>{name}</Table.Cell>
                                            <Table.Cell
                                                className={`${ROW} dash-figure text-muted-foreground max-w-0 truncate max-md:hidden`}
                                            >
                                                {columnValues(file, column, SAMPLE).filter(Boolean).join(", ")}
                                            </Table.Cell>
                                            <Table.Cell className={`${ROW} w-[210px]`}>
                                                <Pick
                                                    invalid={bad}
                                                    onPick={(next) => isTarget(next) && retarget(column, next)}
                                                    options={fieldOptions}
                                                    placeholder={match.pickField.value}
                                                    quiet={false}
                                                    value={target}
                                                />
                                            </Table.Cell>
                                            <Table.Cell align="end" className={ROW}>
                                                {target === "skip" || bad ? null : (
                                                    <Glyph
                                                        className="text-app-income ms-auto"
                                                        icon={Tick02Icon}
                                                        size={16}
                                                    />
                                                )}
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                })}
                            </Table.Body>
                        </Table>
                    </Frame.Panel>
                    <Preview draft={draft} file={file} format={previewFormat} />
                </Frame>
            </Columns>
        </ImportPage>
    );
}
