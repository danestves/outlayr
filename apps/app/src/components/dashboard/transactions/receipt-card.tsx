import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { IconButton } from "@/components/ui/icon-button";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { isReceiptFile } from "@/lib/receipt-scan";
import type { StoredReceipt } from "@/lib/receipt-scan";

const CARD = "border-border rounded-app-md flex w-full items-center gap-3 border p-2.5 text-left";
const RECEIPT_LINES = ["w-7", "w-5", "w-7", "w-4", "w-6"] as const;

function ReceiptTile() {
    return (
        <span aria-hidden className="bg-muted rounded-app-xs flex size-11 flex-none flex-col justify-center gap-1 px-2">
            {RECEIPT_LINES.map((width, index) => (
                <i className={`bg-muted-foreground/45 h-0.5 rounded-full ${width}`} key={index} />
            ))}
        </span>
    );
}

function CardText({ subtitle, title }: { subtitle: ReactNode; title: ReactNode }) {
    return (
        <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-app-body truncate font-medium">{title}</span>
            <span className="text-app-label text-muted-foreground truncate">{subtitle}</span>
        </span>
    );
}

export function FilesLabel({ children }: { children?: ReactNode }) {
    const { files } = useIntlayer("dashboard-receipt");
    return (
        <p className="text-app-label text-muted-foreground flex items-center justify-between">
            {files}
            {children}
        </p>
    );
}

/** The Add form's way in: click to pick, or drop a photo or PDF straight on it. */
export function ScanCard({ onScan }: { onScan: (file?: File) => void }) {
    const { limit, title } = useIntlayer("dashboard-receipt");
    const [over, setOver] = useState(false);
    return (
        <button
            className={`${CARD} hover:bg-muted/40 transition-colors ${over ? "border-primary bg-primary/5" : ""}`}
            onClick={() => onScan()}
            onDragLeave={() => setOver(false)}
            onDragOver={(event) => {
                event.preventDefault();
                setOver(true);
            }}
            onDrop={(event) => {
                event.preventDefault();
                setOver(false);
                const file = [...event.dataTransfer.files].find(isReceiptFile);
                if (file) {
                    onScan(file);
                }
            }}
            type="button"
        >
            <span aria-hidden className="bg-muted rounded-app-xs flex size-11 flex-none items-center justify-center">
                <HugeiconsIcon className="text-muted-foreground" icon={Add01Icon} size={18} />
            </span>
            <CardText subtitle={limit} title={title} />
        </button>
    );
}

function useReceiptTitle(merchant: string, receipt: StoredReceipt | null) {
    const { card } = useIntlayer("dashboard-receipt");
    const count = receipt?.items.length ?? 0;
    let subtitle: ReactNode = card.scanned;
    if (count === 1) {
        subtitle = card.scannedOne;
    } else if (count > 1) {
        subtitle = card.scannedMany({ count });
    }
    return { subtitle, title: merchant ? card.of({ merchant }) : card.scanned };
}

export function ReceiptLines({ currency, receipt }: { currency: string; receipt: StoredReceipt }) {
    const words = useIntlayer("dashboard-receipt");
    const { money } = useDisplayFormat();
    const extras = (["subtotal", "tax", "tip"] as const).flatMap((key) => {
        const value = receipt[key];
        return value === null ? [] : [{ key, value }];
    });
    return (
        <ul className="text-app-label flex flex-col">
            {receipt.items.map((item, index) => (
                <li className="border-border flex items-baseline gap-3 border-b py-1.5 last:border-0" key={index}>
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    {item.quantity === 1 ? null : (
                        <span className="text-muted-foreground font-mono tabular-nums">×{item.quantity}</span>
                    )}
                    <span className="font-mono tabular-nums">{money(item.price, currency)}</span>
                </li>
            ))}
            {extras.map(({ key, value }) => (
                <li className="text-muted-foreground flex items-baseline gap-3 py-1" key={key}>
                    <span className="flex-1">{words[key]}</span>
                    <span className="font-mono tabular-nums">{money(value, currency)}</span>
                </li>
            ))}
        </ul>
    );
}

/** A receipt the form is about to save, with a way to drop it before it does. */
export function DraftReceipt({
    currency,
    merchant,
    onRemove,
    receipt,
}: {
    currency: string;
    merchant: string;
    onRemove: () => void;
    receipt: StoredReceipt | null;
}) {
    const { remove } = useIntlayer("dashboard-receipt");
    const { subtitle, title } = useReceiptTitle(merchant, receipt);
    return (
        <div className="flex flex-col gap-2">
            <div className={CARD}>
                <ReceiptTile />
                <CardText subtitle={subtitle} title={title} />
                <IconButton icon={Cancel01Icon} label={remove.value} onClick={onRemove} size="sm" />
            </div>
            {receipt ? <ReceiptLines currency={currency} receipt={receipt} /> : null}
        </div>
    );
}

/** A saved entry's receipt in the drawer; its lines open under it. */
export function SavedReceipt({
    currency,
    merchant,
    receipt,
}: {
    currency: string;
    merchant: string;
    receipt: StoredReceipt;
}) {
    const { subtitle, title } = useReceiptTitle(merchant, receipt);
    return (
        <details className="group">
            <summary className={`${CARD} hover:bg-muted/40 cursor-pointer list-none transition-colors`}>
                <ReceiptTile />
                <CardText subtitle={subtitle} title={title} />
                <HugeiconsIcon
                    className="text-muted-foreground flex-none group-open:rotate-180"
                    icon={ArrowDown01Icon}
                    size={16}
                />
            </summary>
            <div className="mt-2">
                <ReceiptLines currency={currency} receipt={receipt} />
            </div>
        </details>
    );
}
