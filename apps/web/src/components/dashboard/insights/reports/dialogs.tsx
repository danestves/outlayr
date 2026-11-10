import Download01Icon from "@hugeicons/core-free-icons/Download01Icon";
import FileExportIcon from "@hugeicons/core-free-icons/File01Icon";
import SpreadsheetIcon from "@hugeicons/core-free-icons/Xls01Icon";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Tabs } from "panelui-web/tabs";
import { useId, useState } from "react";
import type { FormEvent } from "react";

import { Glyph } from "@/components/dashboard/accounts/glyph";

import type { Definition, Report } from "./model";
import { monthsIn, spanOf } from "./model";
import type { ReportWords } from "./words";

const SLUG_BREAK = /[^\p{L}\p{N}]+/gu;
const EDGE_DASH = /^-|-$/g;
const EXTENSION = /\.(csv|pdf)$/i;

export const slug = (name: string) => name.toLocaleLowerCase().replaceAll(SLUG_BREAK, "-").replaceAll(EDGE_DASH, "");

interface ModalProps {
    onClose: () => void;
    words: ReportWords;
}

function NameForm({
    action,
    initial,
    onClose,
    onSubmit,
    words,
    children,
}: ModalProps & {
    action: string;
    children?: React.ReactNode;
    initial: string;
    onSubmit: (name: string) => void;
}) {
    const [name, setName] = useState(initial);
    const formId = useId();
    const trimmed = name.trim();
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (trimmed !== "") {
            onSubmit(trimmed);
        }
    };
    return (
        <>
            <Dialog.Body>
                <Field>
                    <Field.Label>{words.copy.saving.name}</Field.Label>
                    <Input
                        autoFocus
                        form={formId}
                        maxLength={80}
                        onChange={(event) => setName(event.target.value)}
                        value={name}
                    />
                </Field>
                {children}
            </Dialog.Body>
            <Dialog.Footer>
                <Button onClick={onClose} type="button" variant="secondary">
                    {words.copy.saving.cancel}
                </Button>
                <Button disabled={trimmed === ""} form={formId} type="submit">
                    {action}
                </Button>
            </Dialog.Footer>
            <form id={formId} onSubmit={submit} />
        </>
    );
}

interface SaveDialogProps extends ModalProps {
    currentKey: string;
    definition: Definition;
    name: string;
    onSave: (name: string, definition: Definition) => void;
    open: boolean;
}

export function SaveDialog({ currentKey, definition, name, onClose, onSave, open, words }: SaveDialogProps) {
    const { copy } = words;
    const span = spanOf(definition.range, currentKey);
    const rolling = "last" in definition.range;
    const canRoll = rolling || span.to === currentKey;
    const [keep, setKeep] = useState<"fixed" | "rolling">(rolling ? "rolling" : "fixed");
    const months = monthsIn(span);
    const chosen: Definition = {
        ...definition,
        range: keep === "rolling" ? { last: months } : { from: span.from, to: span.to },
    };
    return (
        <Dialog onOpenChange={(next) => next || onClose()} open={open}>
            <Dialog.Content className="app-shell">
                <Dialog.Header>
                    <Dialog.Title>{copy.saving.title}</Dialog.Title>
                </Dialog.Header>
                <NameForm
                    action={copy.saving.save.value}
                    initial={name}
                    onClose={onClose}
                    onSubmit={(next) => onSave(next, chosen)}
                    words={words}
                >
                    {canRoll ? (
                        <Field>
                            <Field.Label>{copy.saving.dates}</Field.Label>
                            <Tabs onValueChange={setKeep} value={keep} variant="segmented">
                                <Tabs.List aria-label={copy.saving.dates.value} className="w-full">
                                    <Tabs.Trigger className="flex-1" value="fixed">
                                        {words.rangeName(span)}
                                    </Tabs.Trigger>
                                    <Tabs.Trigger className="flex-1" value="rolling">
                                        {copy.saving.rolling({ count: String(months) })}
                                    </Tabs.Trigger>
                                </Tabs.List>
                            </Tabs>
                        </Field>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                        <Summary caption={copy.chips.rows.value} value={copy.dimensions[definition.rows].value} />
                        <Summary
                            caption={copy.chips.columns.value}
                            value={copy.groupings[definition.columns].name.value}
                        />
                        <Summary caption={copy.chips.measure.value} value={copy.measures[definition.measure].value} />
                        {canRoll ? null : <Summary value={words.rangeName(span)} />}
                        <Summary
                            value={
                                definition.accounts.length > 0
                                    ? copy.accounts.count({ count: String(definition.accounts.length) }).value
                                    : copy.accounts.all.value
                            }
                        />
                    </div>
                </NameForm>
            </Dialog.Content>
        </Dialog>
    );
}

function Summary({ caption, value }: { caption?: string; value: string }) {
    return (
        <span className="border-border inline-flex h-[26px] items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium">
            {caption ? <span className="text-muted-foreground font-normal">{caption}</span> : null}
            {value}
        </span>
    );
}

interface RenameDialogProps extends ModalProps {
    name: string;
    onRename: (name: string) => void;
    open: boolean;
}

export function RenameDialog({ name, onClose, onRename, open, words }: RenameDialogProps) {
    return (
        <Dialog onOpenChange={(next) => next || onClose()} open={open}>
            <Dialog.Content className="app-shell">
                <Dialog.Header>
                    <Dialog.Title>{words.copy.renaming.title}</Dialog.Title>
                </Dialog.Header>
                <NameForm
                    action={words.copy.renaming.save.value}
                    initial={name}
                    onClose={onClose}
                    onSubmit={onRename}
                    words={words}
                />
            </Dialog.Content>
        </Dialog>
    );
}

interface DeleteDialogProps extends ModalProps {
    name: string;
    onDelete: () => void;
    open: boolean;
}

export function DeleteDialog({ name, onClose, onDelete, open, words }: DeleteDialogProps) {
    const { deleting } = words.copy;
    return (
        <Dialog onOpenChange={(next) => next || onClose()} open={open}>
            <Dialog.Content className="app-shell w-[420px]" role="alertdialog">
                <Dialog.Header>
                    <Dialog.Title>{deleting.title({ name })}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                    <p className="m-0 text-[15px] leading-[22px]">{deleting.body}</p>
                </Dialog.Body>
                <Dialog.Footer>
                    <Button autoFocus onClick={onClose} type="button" variant="secondary">
                        {deleting.cancel}
                    </Button>
                    <Button onClick={onDelete} type="button" variant="destructive">
                        {deleting.confirm}
                    </Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog>
    );
}

export type ExportFormat = "csv" | "pdf";

export interface ExportJob {
    averages: boolean;
    entries: boolean;
    fileName: string;
    format: ExportFormat;
}

const option = (
    label: string,
    note: string,
    props: { checked: boolean; disabled?: boolean; onChange?: (on: boolean) => void }
) => (
    <label className="flex h-8 items-center gap-2.5 text-[13px]">
        <Checkbox checked={props.checked} disabled={props.disabled} onCheckedChange={props.onChange} />
        <span className="flex-1">{label}</span>
        <span className="text-muted-foreground text-xs leading-4">{note}</span>
    </label>
);

interface ExportDialogProps extends ModalProps {
    columnsName: string;
    name: string;
    onExport: (job: ExportJob) => void;
    open: boolean;
    rangeName: string;
    report: Report;
}

const TILE =
    "border-border hover:bg-muted/50 group aria-pressed:border-app-tint aria-pressed:bg-app-tint/10 focus-visible:ring-ring flex min-w-0 flex-1 items-start gap-2.5 rounded-xl border p-3 text-start outline-none focus-visible:ring-2";

export function ExportDialog({
    columnsName,
    name,
    onClose,
    onExport,
    open,
    rangeName,
    report,
    words,
}: ExportDialogProps) {
    const { exporting } = words.copy;
    const [format, setFormat] = useState<ExportFormat>("pdf");
    const [averages, setAverages] = useState(true);
    const [entries, setEntries] = useState(false);
    const [stem, setStem] = useState<string | null>(null);
    const defaultStem = `outlayr-${slug(name)}-${slug(rangeName)}`;
    const fileStem = stem ?? defaultStem;
    const pdf = format === "pdf";
    const tile = (value: ExportFormat, icon: typeof FileExportIcon, title: string, note: string) => (
        <button aria-pressed={format === value} className={TILE} onClick={() => setFormat(value)} type="button">
            <Glyph className="text-muted-foreground group-aria-pressed:text-app-tint shrink-0" icon={icon} size={20} />
            <span className="min-w-0">
                <span className="block text-sm font-medium">{title}</span>
                <span className="text-muted-foreground block text-xs leading-4">{note}</span>
            </span>
        </button>
    );
    return (
        <Dialog onOpenChange={(next) => next || onClose()} open={open}>
            <Dialog.Content className="app-shell">
                <Dialog.Header>
                    <Dialog.Title>{exporting.title({ name })}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                    <div className="flex gap-2">
                        {tile("pdf", FileExportIcon, exporting.pdf.value, exporting.pdfNote.value)}
                        {tile("csv", SpreadsheetIcon, exporting.csv.value, exporting.csvNote.value)}
                    </div>
                    <div className="flex flex-col">
                        {option(exporting.chart.value, exporting.chartNote.value, { checked: pdf, disabled: true })}
                        {option(
                            exporting.table.value,
                            exporting.tableNote({
                                columns: columnsName,
                                rows: String(report.rows.length),
                            }).value,
                            { checked: true, disabled: true }
                        )}
                        {option(exporting.averages.value, "", { checked: averages, onChange: setAverages })}
                        {option(
                            exporting.entries.value,
                            exporting.entriesNote({ count: String(report.entries) }).value,
                            {
                                checked: entries && !pdf,
                                disabled: pdf,
                                onChange: setEntries,
                            }
                        )}
                    </div>
                    <Field className="-mt-px">
                        <Field.Label>{exporting.fileName}</Field.Label>
                        <div className="flex items-center gap-2">
                            <Input
                                className="dash-figure flex-1"
                                onChange={(event) => setStem(event.target.value.replace(EXTENSION, ""))}
                                value={`${fileStem}.${format}`}
                            />
                        </div>
                    </Field>
                </Dialog.Body>
                <Dialog.Footer>
                    <Button onClick={onClose} type="button" variant="secondary">
                        {exporting.cancel}
                    </Button>
                    <Button
                        disabled={fileStem.trim() === ""}
                        onClick={() =>
                            onExport({
                                averages,
                                entries: entries && !pdf,
                                fileName: `${fileStem.trim()}.${format}`,
                                format,
                            })
                        }
                    >
                        <Glyph icon={Download01Icon} size={16} />
                        {exporting.run({ format: exporting[format].value })}
                    </Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog>
    );
}
