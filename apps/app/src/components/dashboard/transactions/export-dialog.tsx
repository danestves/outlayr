import Download01Icon from "@hugeicons/core-free-icons/Download01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Dialog } from "panelui-web/dialog";
import { Tabs } from "panelui-web/tabs";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { DialogContent } from "@/components/ui/dialog-content";

export interface ExportOptions {
    tagsAndNotes: boolean;
}

export interface ExportSummary {
    entries: number;
    filters: readonly string[];
    net: string;
    view: string;
}

interface ExportDialogProps {
    onClose: () => void;
    onExport: (options: ExportOptions) => void;
    open: boolean;
    summary: ExportSummary;
}

function Row({ children, label }: { children: ReactNode; label: ReactNode }) {
    return (
        <div className="text-app-label flex min-h-10 items-center justify-between gap-4 border-b py-2 last:border-b-0">
            <dt className="text-muted-foreground shrink-0">{label}</dt>
            <dd className="min-w-0 text-end">{children}</dd>
        </div>
    );
}

/** What the file will hold: the view as the table shows it, in the formats that exist. */
export function ExportDialog({ onClose, onExport, open, summary }: ExportDialogProps) {
    const { exporting: words, views } = useIntlayer("dashboard-ledger");
    const { locale } = useLocale();
    const [tagsAndNotes, setTagsAndNotes] = useState(true);
    const checkboxId = useId();
    const submit =
        summary.entries === 1
            ? words.submitOne.value
            : words.submitMany({ count: summary.entries.toLocaleString(locale) }).value;
    return (
        <Dialog onOpenChange={(next) => (next ? null : onClose())} open={open}>
            <DialogContent size="sm">
                <Dialog.Header title={words.title.value} />
                <Dialog.Body className="flex flex-col gap-5">
                    <dl className="flex flex-col">
                        <Row label={words.view}>{summary.view}</Row>
                        {summary.filters.length > 0 ? (
                            <Row label={views.filters}>{summary.filters.join(", ")}</Row>
                        ) : null}
                        <Row label={words.entries}>
                            <span className="font-mono tabular-nums">{summary.entries.toLocaleString(locale)}</span>
                        </Row>
                        <Row label={words.net}>
                            <span className="font-mono tabular-nums">{summary.net}</span>
                        </Row>
                    </dl>
                    <section className="flex flex-col gap-2">
                        <h3 className="text-app-label font-semibold">{words.format}</h3>
                        <Tabs value="csv" variant="segmented">
                            <Tabs.List className="w-full">
                                <Tabs.Trigger className="flex-1" value="csv">
                                    {words.csv}
                                </Tabs.Trigger>
                            </Tabs.List>
                        </Tabs>
                    </section>
                    <section className="flex flex-col gap-2">
                        <h3 className="text-app-label font-semibold">{words.include}</h3>
                        <label className="text-app-label flex items-center gap-2" htmlFor={checkboxId}>
                            <Checkbox
                                checked={tagsAndNotes}
                                id={checkboxId}
                                onCheckedChange={(checked) => setTagsAndNotes(checked)}
                            />
                            {words.tagsAndNotes}
                        </label>
                    </section>
                </Dialog.Body>
                <Dialog.Footer>
                    <Button onClick={onClose} type="button" variant="outline">
                        {words.cancel}
                    </Button>
                    <Button
                        onClick={() => {
                            onExport({ tagsAndNotes });
                            onClose();
                        }}
                        type="button"
                    >
                        <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
                        {submit}
                    </Button>
                </Dialog.Footer>
            </DialogContent>
        </Dialog>
    );
}
