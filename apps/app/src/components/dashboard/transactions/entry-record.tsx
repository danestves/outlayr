import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import Image01Icon from "@hugeicons/core-free-icons/Image01Icon";
import Pdf01Icon from "@hugeicons/core-free-icons/Pdf01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { decimalsFor } from "@outlayr/money/currency";
import { parseReceipt } from "@outlayr/money/receipt";
import type { StoredReceipt } from "@outlayr/money/receipt";
import { isBalanced, unallocated } from "@outlayr/money/split";
import type { Allocation } from "@outlayr/money/split";
import { addPart, openDraft, removePart, setPartAmount, setPartCategory } from "@outlayr/money/split-draft";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Input } from "panelui-web/input";
import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useLedgerDb } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { DialogContent } from "@/components/ui/dialog-content";
import { parseAmount } from "@/lib/account-writes";
import { entryFiles, FILE_TYPES, liveSplits, MAX_FILE_BYTES, MAX_FILES } from "@/lib/entry-record";
import type { EntryFile } from "@/lib/entry-record";
import type { Doc } from "@/lib/entry-writes";
import { recordBooks, useRecordBooks } from "@/lib/ledger-db";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { photoSrc } from "@/lib/photo-src";
import { useUploadPhoto } from "@/lib/photo-upload";
import { attachedFile, removedFile, splitRows } from "@/lib/record-writes";

import { useCategoryName } from "../home/format";
import { Pick as CategoryPick, useCategoryOptions } from "./entry-form";
import { SavedReceipt } from "./receipt-card";
import { TagPicker } from "./tag-picker";
import { entryNotices } from "./use-delete";

type Entry = Pick<Doc, "amount" | "categoryId" | "income" | "localId" | "receipt"> & { currency: string };

const isFileType = (type: string): type is (typeof FILE_TYPES)[number] => FILE_TYPES.some((each) => each === type);

function Heading({ children, end }: { children: ReactNode; end?: ReactNode }) {
    return (
        <div className="text-muted-foreground text-app-label flex items-center justify-between gap-3 pt-4 pb-2">
            <span>{children}</span>
            {end}
        </div>
    );
}

function Dot({ color }: { color: string | undefined }) {
    return <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}

/** The split and files under an entry, read from the synced record tables. */
export function EntryRecord({ editable, entry: doc, merchant }: { editable: boolean; entry: Doc; merchant: string }) {
    const { ledger } = useDashboard();
    const { columns } = useIntlayer("dashboard-ledger");
    const entry: Entry = { ...doc, currency: doc.currency ?? ledger.currency };
    const books = useRecordBooks();
    const parts = liveSplits(books, entry.localId);
    const files = entryFiles(books, entry.localId, entry.receipt);
    const unattached = files.some((file) => file.receipt) ? null : parseReceipt(entry.receipt);
    return (
        <div className="pb-2">
            <div className="border-border text-app-body flex min-h-11 w-full items-center gap-3 border-b py-2">
                <span className="text-muted-foreground w-24 shrink-0 text-left">{columns.tags}</span>
                <div className="flex min-w-0 flex-1 justify-end">
                    <TagPicker editable={editable} entryId={entry.localId} />
                </div>
            </div>
            <SplitSection editable={editable} entry={entry} parts={parts} />
            <FilesSection
                currency={entry.currency}
                editable={editable}
                entryId={entry.localId}
                files={files}
                merchant={merchant}
                receipt={unattached}
            />
        </div>
    );
}

function SplitSection({ editable, entry, parts }: { editable: boolean; entry: Entry; parts: readonly Allocation[] }) {
    const { ledger } = useDashboard();
    const { detail, record } = useIntlayer("dashboard-transactions");
    const categoryName = useCategoryName();
    const { money } = useDisplayFormat();
    const [open, setOpen] = useState(false);
    const decimals = decimalsFor(entry.currency);
    const left = unallocated(entry.amount, parts, decimals);
    const dialog = open ? <SplitDialog entry={entry} onClose={() => setOpen(false)} parts={parts} /> : null;
    if (parts.length < 2) {
        return editable ? (
            <>
                <button
                    className="border-border text-app-body flex min-h-11 w-full items-center gap-3 border-b py-2"
                    onClick={() => setOpen(true)}
                    type="button"
                >
                    <span className="text-muted-foreground w-24 shrink-0 text-left">{record.split}</span>
                    <span className="text-muted-foreground ml-auto">{detail.off}</span>
                </button>
                {dialog}
            </>
        ) : null;
    }
    const summary = (
        <>
            <Heading
                end={
                    <span className={left === 0 ? undefined : "text-destructive"}>
                        {left === 0 ? record.balanced : record.offBy({ amount: money(Math.abs(left), entry.currency) })}
                    </span>
                }
            >
                {record.splitAcross({ count: parts.length })}
            </Heading>
            <ul className="flex flex-col pb-1">
                {parts.map((part, index) => {
                    const category = ledger.books.categories.find((each) => each.localId === part.categoryId);
                    return (
                        <li className="text-app-body flex min-h-7 items-center gap-2" key={index}>
                            <Dot color={category?.color ?? undefined} />
                            <span className="min-w-0 flex-1 truncate text-left">
                                {category ? categoryName({ id: category.localId, name: category.name ?? "" }) : ""}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                                {money(part.amount, entry.currency)}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </>
    );
    return editable ? (
        <>
            <button className="block w-full text-left" onClick={() => setOpen(true)} type="button">
                {summary}
            </button>
            {dialog}
        </>
    ) : (
        summary
    );
}

interface PartText {
    index: number;
    text: string;
}

function SplitDialog({
    entry,
    onClose,
    parts: saved,
}: {
    entry: Entry;
    onClose: () => void;
    parts: readonly Allocation[];
}) {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { record } = useIntlayer("dashboard-transactions");
    const { money } = useDisplayFormat();
    const formId = useId();
    const options = useCategoryOptions(ledger, entry.income);
    const decimals = decimalsFor(entry.currency);
    const [parts, setParts] = useState<Allocation[]>(() =>
        saved.length > 1
            ? saved.map(({ amount, categoryId }) => ({ amount, categoryId }))
            : openDraft(entry.amount, entry.categoryId, decimals)
    );
    const [typing, setTyping] = useState<PartText | null>(null);
    const left = unallocated(entry.amount, parts, decimals);
    const complete = parts.every((part) => part.categoryId !== null);
    const balanced = isBalanced(entry.amount, parts, decimals);
    const settled = (next: PartText | null) =>
        next === null
            ? parts
            : setPartAmount(entry.amount, parts, next.index, parseAmount(next.text, decimals), decimals);
    const commit = (next: readonly Allocation[]) => {
        const rows = splitRows(
            recordBooks(db),
            { amount: entry.amount, id: entry.localId },
            next,
            decimals,
            Date.now()
        );
        if (rows === null) {
            return;
        }
        onClose();
        if (rows.length > 0) {
            void committer.commit(rows, { failed: record.splitFailed.value });
        }
    };
    return (
        <Dialog onOpenChange={(open) => !open && onClose()} open>
            <DialogContent size="sm">
                <form
                    id={formId}
                    onSubmit={(event) => {
                        event.preventDefault();
                        const final = settled(typing);
                        setParts(final);
                        setTyping(null);
                        if (complete && isBalanced(entry.amount, final, decimals)) {
                            commit(final);
                        }
                    }}
                >
                    <Dialog.Header title={record.split.value} />
                    <Dialog.Body className="flex flex-col gap-2">
                        {parts.map((part, index) => (
                            <div className="flex items-center gap-2" key={index}>
                                <div className="min-w-0 flex-1">
                                    <CategoryPick
                                        invalid={part.categoryId === null}
                                        onPick={(categoryId) =>
                                            setParts((current) => setPartCategory(current, index, categoryId))
                                        }
                                        options={options}
                                        placeholder={record.chooseCategory.value}
                                        quiet={false}
                                        value={part.categoryId}
                                    />
                                </div>
                                <Input
                                    aria-label={record.split.value}
                                    className="w-28 text-right font-mono tabular-nums"
                                    inputMode="decimal"
                                    onBlur={() => {
                                        if (typing?.index === index) {
                                            setParts(settled(typing));
                                            setTyping(null);
                                        }
                                    }}
                                    onChange={(event) => setTyping({ index, text: event.target.value })}
                                    onFocus={(event) => event.target.select()}
                                    value={typing?.index === index ? typing.text : part.amount.toFixed(decimals)}
                                />
                                <Button
                                    aria-label={record.removePart.value}
                                    disabled={parts.length < 2}
                                    onClick={() => setParts((current) => removePart(current, index, decimals))}
                                    size="icon-sm"
                                    type="button"
                                    variant="ghost"
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} size={14} />
                                </Button>
                            </div>
                        ))}
                        <Button
                            className="self-start"
                            onClick={() => setParts((current) => addPart(current, null))}
                            size="sm"
                            type="button"
                            variant="ghost"
                        >
                            <HugeiconsIcon icon={Add01Icon} size={14} />
                            {record.addCategory}
                        </Button>
                        <div className="border-border text-app-label flex items-center justify-between gap-3 border-t pt-3">
                            <span className={balanced ? "text-muted-foreground" : "text-destructive"}>
                                {balanced
                                    ? record.balanced
                                    : record.left({ amount: money(left, entry.currency, "auto") })}
                            </span>
                            {balanced ? null : (
                                <Button
                                    onClick={() =>
                                        setParts((current) =>
                                            setPartAmount(
                                                entry.amount,
                                                current,
                                                current.length - 1,
                                                (current.at(-1)?.amount ?? 0) + left,
                                                decimals
                                            )
                                        )
                                    }
                                    size="sm"
                                    type="button"
                                    variant="ghost"
                                >
                                    {record.fillRest}
                                </Button>
                            )}
                        </div>
                    </Dialog.Body>
                    <Dialog.Footer>
                        {saved.length > 1 ? (
                            <Button className="sm:mr-auto" onClick={() => commit([])} type="button" variant="ghost">
                                {record.removeSplit}
                            </Button>
                        ) : null}
                        <Button onClick={onClose} type="button" variant="outline">
                            {record.cancel}
                        </Button>
                        <Button disabled={!complete || (typing === null && !balanced)} form={formId} type="submit">
                            {record.save}
                        </Button>
                    </Dialog.Footer>
                </form>
            </DialogContent>
        </Dialog>
    );
}

type FileProblem = "full" | "tooLarge" | "unreadable" | "uploadFailed";

function FilesSection({
    currency,
    editable,
    entryId,
    files,
    merchant,
    receipt,
}: {
    currency: string;
    editable: boolean;
    entryId: string;
    files: readonly EntryFile[];
    merchant: string;
    receipt: StoredReceipt | null;
}) {
    const { record } = useIntlayer("dashboard-transactions");
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const upload = useUploadPhoto();
    const picker = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [problem, setProblem] = useState<FileProblem | null>(null);
    const [viewing, setViewing] = useState<EntryFile | null>(null);
    if (!editable && files.length === 0 && receipt === null) {
        return null;
    }
    const attach = async (file: File) => {
        if (files.length >= MAX_FILES) {
            return setProblem("full");
        }
        if (!isFileType(file.type)) {
            return setProblem("unreadable");
        }
        if (file.size > MAX_FILE_BYTES) {
            return setProblem("tooLarge");
        }
        setProblem(null);
        setUploading(true);
        try {
            const imageKey = await upload(file, file.type);
            const row = attachedFile(recordBooks(db), entryId, { imageKey, name: file.name }, Date.now());
            await committer.commit([row], { failed: record.uploadFailed.value });
        } catch {
            setProblem("uploadFailed");
        } finally {
            setUploading(false);
        }
    };
    return (
        <>
            <Heading end={<span>{record.fileCount({ count: files.length, max: MAX_FILES })}</span>}>
                {record.files}
            </Heading>
            <ul className="flex flex-col gap-2">
                {receipt ? (
                    <li>
                        <SavedReceipt currency={currency} merchant={merchant} receipt={receipt} />
                    </li>
                ) : null}
                {files.map((file) => (
                    <li key={file.attachment.localId}>
                        <FileCard file={file} merchant={merchant} onOpen={() => setViewing(file)} />
                    </li>
                ))}
                {uploading ? (
                    <li>
                        <Card icon={Image01Icon} subtitle={null} title={record.uploading} />
                    </li>
                ) : null}
                {editable && !uploading && files.length < MAX_FILES ? (
                    <li>
                        <Card
                            icon={Add01Icon}
                            onPress={() => picker.current?.click()}
                            subtitle={record.addHint}
                            title={record.addFile}
                        />
                        <input
                            accept={FILE_TYPES.join(",")}
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = "";
                                if (file) {
                                    void attach(file);
                                }
                            }}
                            ref={picker}
                            type="file"
                        />
                    </li>
                ) : null}
            </ul>
            {problem ? <p className="text-destructive text-app-label pt-2">{record[problem]}</p> : null}
            {viewing ? (
                <FileViewer
                    currency={currency}
                    editable={editable}
                    file={viewing}
                    merchant={merchant}
                    onClose={() => setViewing(null)}
                />
            ) : null}
        </>
    );
}

function useFileTitle(merchant: string) {
    const { record } = useIntlayer("dashboard-transactions");
    return (file: EntryFile) => {
        if (file.receipt) {
            return record.receiptOf({ merchant }).value;
        }
        return file.attachment.name ?? (file.kind === "pdf" ? "PDF" : record.photo.value);
    };
}

function useFileSubtitle() {
    const { record } = useIntlayer("dashboard-transactions");
    return (file: EntryFile) => {
        if (file.key === null) {
            return record.waiting.value;
        }
        if (file.receipt) {
            const count = file.receipt.items.length;
            return count === 1 ? record.scannedOne.value : record.scanned({ count }).value;
        }
        return file.kind === "pdf" ? "PDF" : record.photo.value;
    };
}

function FileCard({ file, merchant, onOpen }: { file: EntryFile; merchant: string; onOpen: () => void }) {
    const title = useFileTitle(merchant)(file);
    const subtitle = useFileSubtitle()(file);
    const src = file.kind === "image" ? photoSrc(file.key) : undefined;
    return (
        <Card
            icon={file.kind === "pdf" ? Pdf01Icon : Image01Icon}
            image={src}
            onPress={file.key === null ? undefined : onOpen}
            subtitle={subtitle}
            title={title}
        />
    );
}

function Card({
    icon,
    image,
    onPress,
    subtitle,
    title,
}: {
    icon: typeof Image01Icon;
    image?: string;
    onPress?: () => void;
    subtitle: ReactNode;
    title: ReactNode;
}) {
    const body = (
        <>
            <span className="bg-app-fill text-muted-foreground rounded-app-sm flex size-12 shrink-0 items-center justify-center overflow-hidden">
                {image ? (
                    <img alt="" className="size-full object-cover" loading="lazy" src={image} />
                ) : (
                    <HugeiconsIcon icon={icon} size={18} />
                )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-app-body truncate font-medium">{title}</span>
                {subtitle === null ? null : (
                    <span className="text-muted-foreground text-app-label truncate">{subtitle}</span>
                )}
            </span>
            {onPress ? (
                <HugeiconsIcon className="text-muted-foreground shrink-0" icon={ArrowUpRight01Icon} size={16} />
            ) : null}
        </>
    );
    const card = "border-border rounded-app-lg flex w-full items-center gap-3 border p-2";
    return onPress ? (
        <button className={`${card} hover:bg-muted/50`} onClick={onPress} type="button">
            {body}
        </button>
    ) : (
        <div className={card}>{body}</div>
    );
}

function FileViewer({
    currency,
    editable,
    file,
    merchant,
    onClose,
}: {
    currency: string;
    editable: boolean;
    file: EntryFile;
    merchant: string;
    onClose: () => void;
}) {
    const { record } = useIntlayer("dashboard-transactions");
    const committer = useLedgerCommitter(entryNotices);
    const title = useFileTitle(merchant)(file);
    const src = file.key === null ? undefined : `/photos/${file.key}`;
    const remove = () => {
        onClose();
        committer.commitWithUndo([removedFile(file.attachment, Date.now())], {
            failed: record.removeFailed.value,
            text: record.fileRemoved.value,
        });
    };
    return (
        <Dialog onOpenChange={(open) => !open && onClose()} open>
            <DialogContent size="md">
                <Dialog.Header title={title} />
                <Dialog.Body className="flex flex-col gap-4">
                    {file.kind === "image" && src ? (
                        <img
                            alt={title}
                            className="bg-app-fill rounded-app-lg max-h-[60vh] w-full object-contain"
                            src={src}
                        />
                    ) : null}
                    {file.kind === "pdf" && src ? (
                        <a
                            className="border-border rounded-app-lg text-app-body flex items-center gap-3 border p-3 font-medium"
                            href={src}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            <HugeiconsIcon className="text-muted-foreground" icon={Pdf01Icon} size={18} />
                            {record.openPdf}
                            <HugeiconsIcon
                                className="text-muted-foreground ml-auto"
                                icon={ArrowUpRight01Icon}
                                size={16}
                            />
                        </a>
                    ) : null}
                    {file.receipt ? <ReceiptLines currency={currency} receipt={file.receipt} /> : null}
                </Dialog.Body>
                {editable ? (
                    <Dialog.Footer>
                        <Button onClick={remove} type="button" variant="outline">
                            <HugeiconsIcon icon={Delete02Icon} size={14} />
                            {record.removeFile}
                        </Button>
                    </Dialog.Footer>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function ReceiptLines({ currency, receipt }: { currency: string; receipt: StoredReceipt }) {
    const { record } = useIntlayer("dashboard-transactions");
    const { money } = useDisplayFormat();
    const extras = [
        [record.subtotal, receipt.subtotal],
        [record.tax, receipt.tax],
        [record.tip, receipt.tip],
    ] as const;
    return (
        <div className="text-app-body">
            <p className="text-muted-foreground text-app-label pb-1">{record.items}</p>
            <ul>
                {receipt.items.map((item, index) => (
                    <li className="flex min-h-7 items-center gap-3" key={index}>
                        <span className="min-w-0 flex-1 truncate">
                            {item.quantity === 1 ? item.name : `${item.quantity} × ${item.name}`}
                        </span>
                        <span className="font-mono tabular-nums">{money(item.price * item.quantity, currency)}</span>
                    </li>
                ))}
            </ul>
            {extras.map(([label, value]) =>
                value === null ? null : (
                    <p
                        className="text-muted-foreground border-border flex min-h-7 items-center justify-between border-t"
                        key={label.value}
                    >
                        <span>{label}</span>
                        <span className="font-mono tabular-nums">{money(value, currency)}</span>
                    </p>
                )
            )}
        </div>
    );
}
