import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import type { Locale } from "@/lib/i18n";

import { formatMoney, signedMoney } from "./money";
import { useNames } from "./use-names";

const FADE_IN =
    "transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none starting:translate-y-1 starting:opacity-0";

export const COFFEE_SHOP = { en: "Blue Bottle", es: "Juan Valdez" } as const satisfies Record<Locale, string>;

const STORE = { en: "Target", es: "Farmatodo" } as const satisfies Record<Locale, string>;

const RECEIPT = {
    en: [
        { left: "TARGET", mark: 1, right: "" },
        { left: "BROOKLYN, NY", mark: null, right: "" },
        { left: "09/21/2026", mark: 2, right: "14:32" },
        { left: "PAPER TOWELS", mark: null, right: "17.99" },
        { left: "LAUNDRY PODS", mark: null, right: "12.49" },
        { left: "BATH TOWEL", mark: null, right: "19.49" },
        { left: "SUBTOTAL", mark: null, right: "49.97" },
        { left: "TAX", mark: null, right: "4.31" },
        { left: "TOTAL", mark: 3, right: "54.28" },
        { left: "AMEX", mark: null, right: "•••• 1008" },
    ],
    es: [
        { left: "FARMATODO", mark: 1, right: "" },
        { left: "SUCURSAL 214", mark: null, right: "" },
        { left: "21/09/2026", mark: 2, right: "14:32" },
        { left: "TOALLAS DE PAPEL", mark: null, right: "17.99" },
        { left: "DETERGENTE", mark: null, right: "12.49" },
        { left: "TOALLA DE BAÑO", mark: null, right: "19.49" },
        { left: "SUBTOTAL", mark: null, right: "49.97" },
        { left: "IMPUESTO", mark: null, right: "4.31" },
        { left: "TOTAL", mark: 3, right: "54.28" },
        { left: "VISA", mark: null, right: "•••• 1008" },
    ],
} as const satisfies Record<Locale, readonly { left: string; mark: number | null; right: string }[]>;

const CSV_FILE = { en: "chase-activity.csv", es: "bbva-movimientos.csv" } as const satisfies Record<Locale, string>;

const CSV_ROWS = {
    en: [
        { amount: "-142.18", category: "Groceries", date: "09/18", label: "COSTCO WHOLESALE #482", matchedAt: 1 },
        { amount: "-18.40", category: "Transport", date: "09/19", label: "LYFT *RIDE", matchedAt: 1 },
        { amount: "-4.00", category: "Subscriptions", date: "09/20", label: "GITHUB", matchedAt: 1 },
        { amount: "-6.25", category: "Coffee", date: "09/21", label: "SQ *BLUE BOTTLE COFFEE", matchedAt: 2 },
        { amount: "-38.90", category: "Dining Out", date: "09/22", label: "TST* SUSHI WAY", matchedAt: 2 },
    ],
    es: [
        { amount: "-142.18", category: "Shopping", date: "18/09", label: "MERCADOLIBRE*COMPRA", matchedAt: 1 },
        { amount: "-18.40", category: "Transport", date: "19/09", label: "DIDI *VIAJE", matchedAt: 1 },
        { amount: "-4.00", category: "Subscriptions", date: "20/09", label: "SPOTIFY", matchedAt: 1 },
        { amount: "-6.25", category: "Coffee", date: "21/09", label: "JUAN VALDEZ CAFE 0412", matchedAt: 2 },
        { amount: "-38.90", category: "Dining Out", date: "22/09", label: "RAPPI*RESTAURANTE", matchedAt: 2 },
    ],
} as const satisfies Record<
    Locale,
    readonly { amount: string; category: string; date: string; label: string; matchedAt: number }[]
>;

interface PanelProps {
    frame: number;
}

export const CAPTURE_MODES = [
    { Panel: SayPanel, durations: [1400, 1100, 2400, 1300, 1000, 2400, 2800], id: "say" },
    { Panel: ScanPanel, durations: [1400, 900, 900, 900, 1200, 2800], id: "scan" },
    { Panel: ImportPanel, durations: [1500, 1600, 1800, 3000], id: "import" },
] as const;

function Frame({ children, status, tag }: { children: ReactNode; status: ReactNode; tag?: string }) {
    return (
        <>
            <div className="border-border flex h-11 items-center justify-between gap-4 border-b">
                <p className="text-muted truncate text-sm">{status}</p>
                {tag === undefined ? null : (
                    <span className="text-tint shrink-0 font-mono text-xs tracking-widest uppercase">{tag}</span>
                )}
            </div>
            <div className="flex h-[22rem] flex-col pt-5">{children}</div>
        </>
    );
}

function Logged({ amount, category, merchant }: { amount: number; category: string; merchant: string }) {
    const { log } = useIntlayer("demo");
    const nameOf = useNames();
    return (
        <div className={`mt-auto ${FADE_IN}`}>
            <p className="text-muted border-border border-b pb-2 font-mono text-xs tracking-widest uppercase">{log}</p>
            <div className="border-border flex items-baseline justify-between gap-4 border-b py-3">
                <div className="min-w-0">
                    <p className="truncate font-semibold">{merchant}</p>
                    <p className="text-muted mt-0.5 text-sm">{nameOf(category)}</p>
                </div>
                <span className="shrink-0 font-mono tabular-nums">{signedMoney(amount, "USD", false)}</span>
            </div>
        </div>
    );
}

function sayStatus(frame: number) {
    switch (frame) {
        case 0:
        case 3: {
            return "listening";
        }
        case 1:
        case 4: {
            return "writing";
        }
        case 2: {
            return "draft";
        }
        case 5: {
            return "updated";
        }
        default: {
            return "saved";
        }
    }
}

export function SayPanel({ frame }: PanelProps) {
    const { day, said, status, voiceAt } = useIntlayer("demo");
    const { locale } = useLocale();
    const nameOf = useNames();
    const shop = COFFEE_SHOP[locale];
    const heard = frame === 2 || frame >= 5;
    const coffee = nameOf("Coffee");
    return (
        <Frame status={status[sayStatus(frame)]}>
            <div className="flex h-28 shrink-0 flex-col justify-center">
                {heard ? (
                    <div className={FADE_IN}>
                        <p className="text-4xl font-semibold tracking-tight tabular-nums">{formatMoney(12.5, "USD")}</p>
                        <p className="mt-1 text-lg">
                            <span className="text-muted">{voiceAt}</span> {shop}
                        </p>
                        <p className="text-muted mt-0.5 text-sm">
                            {coffee} · {frame >= 5 ? day.yesterday : day.today}
                        </p>
                    </div>
                ) : (
                    <MicGlyph />
                )}
            </div>
            {frame === 2 || frame === 5 ? (
                <ol className="mt-4 flex flex-col gap-1.5 text-sm">
                    <Said>{said.first}</Said>
                    <Proposed
                        detail={
                            <>
                                {coffee} · {day.today}
                            </>
                        }
                        label={status.draft}
                    />
                    {frame === 5 ? (
                        <>
                            <Said>{said.fix}</Said>
                            <Proposed detail={status.fieldDate} label={status.updated} />
                        </>
                    ) : null}
                </ol>
            ) : null}
            {frame >= 6 ? <Logged amount={12.5} category="Coffee" merchant={shop} /> : null}
        </Frame>
    );
}

function Said({ children }: { children: ReactNode }) {
    return <li className={`bg-surface max-w-[86%] self-end px-2.5 py-1.5 ${FADE_IN}`}>{children}</li>;
}

function Proposed({ detail, label }: { detail: ReactNode; label: ReactNode }) {
    return (
        <li className={`text-muted truncate ${FADE_IN}`}>
            {label} · <span className="text-foreground font-medium">{detail}</span>
        </li>
    );
}

function scanStatus(frame: number) {
    if (frame >= 5) {
        return "saved";
    }
    return frame >= 4 ? "review" : "reading";
}

export function ScanPanel({ frame }: PanelProps) {
    const { scan, status } = useIntlayer("demo");
    const { locale } = useLocale();
    const nameOf = useNames();
    const fields = [
        { id: "store", label: scan.store, shownAt: 1, value: STORE[locale] },
        { id: "date", label: scan.date, shownAt: 2, value: scan.dateValue },
        { id: "total", label: scan.total, shownAt: 3, value: formatMoney(54.28, "USD") },
        { id: "category", label: scan.category, shownAt: 4, value: nameOf("Shopping") },
    ];
    return (
        <Frame status={status[scanStatus(frame)]}>
            <div className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] gap-5">
                <div
                    aria-hidden="true"
                    className="border-border bg-surface self-start border px-2.5 py-3 font-mono text-[0.625rem] leading-4"
                >
                    {RECEIPT[locale].map((line) => (
                        <p
                            className={`flex justify-between gap-2 transition-colors duration-150 ease-out ${line.mark === frame ? "bg-tint text-background" : ""}`}
                            key={line.left}
                        >
                            <span className="truncate">{line.left}</span>
                            <span className="shrink-0 tabular-nums">{line.right}</span>
                        </p>
                    ))}
                </div>
                <dl className="border-foreground self-start border-t">
                    {fields.map((field) => (
                        <div className="border-border border-b py-2" key={field.id}>
                            <dt className="text-muted font-mono text-xs tracking-widest uppercase">{field.label}</dt>
                            <dd className="mt-0.5 truncate font-medium tabular-nums">
                                {frame >= field.shownAt ? (
                                    <span className={`inline-block ${FADE_IN}`}>{field.value}</span>
                                ) : (
                                    <Blank />
                                )}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
            {frame >= 5 ? <Logged amount={54.28} category="Shopping" merchant={STORE[locale]} /> : null}
        </Frame>
    );
}

function ImportPanel({ frame }: PanelProps) {
    const { importFootnote, importStatus } = useIntlayer("demo");
    const { locale } = useLocale();
    const nameOf = useNames();
    return (
        <Frame status={importStatus[frame] ?? importStatus[0]} tag={frame === 2 ? "Pro" : undefined}>
            <p className="text-muted border-border border-b pb-2 font-mono text-xs tracking-widest uppercase">
                {CSV_FILE[locale]}
            </p>
            <ol>
                {CSV_ROWS[locale].map((row) => (
                    <li
                        className="border-border grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-b py-2"
                        key={row.label}
                    >
                        <p className="truncate font-mono text-xs leading-5">
                            <span className="text-muted">{row.date}</span> {row.label}
                        </p>
                        <p className="text-right font-mono text-xs leading-5 tabular-nums">{row.amount}</p>
                        <p className="col-span-2 text-sm">
                            {frame >= row.matchedAt ? (
                                <span className={`inline-block ${FADE_IN}`}>{nameOf(row.category)}</span>
                            ) : (
                                <Blank />
                            )}
                        </p>
                    </li>
                ))}
            </ol>
            <p className="text-muted mt-auto text-xs">{importFootnote}</p>
        </Frame>
    );
}

function Blank() {
    return <span className="border-border inline-block h-3 w-10 border-b-2 border-dashed" />;
}

function MicGlyph() {
    return (
        <svg
            aria-hidden="true"
            className="text-muted size-9"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
        >
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
    );
}
