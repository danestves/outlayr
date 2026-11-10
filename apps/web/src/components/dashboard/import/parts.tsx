import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import Download04Icon from "@hugeicons/core-free-icons/Download04Icon";
import File01Icon from "@hugeicons/core-free-icons/File01Icon";
import Note01Icon from "@hugeicons/core-free-icons/Note01Icon";
import Notion01Icon from "@hugeicons/core-free-icons/Notion01Icon";
import Pdf01Icon from "@hugeicons/core-free-icons/Pdf01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import Upload04Icon from "@hugeicons/core-free-icons/Upload04Icon";
import Wallet01Icon from "@hugeicons/core-free-icons/Wallet01Icon";
import type { IconSvgElement } from "@hugeicons/react";
import { Frame } from "panelui-web/frame";
import { useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";

import type { ImportSource } from "./store";

export const STEPS = ["upload", "match", "review", "done"] as const;
export type Step = (typeof STEPS)[number];

const STEP_CHIP = "dash-figure flex size-5 flex-none items-center justify-center rounded-full text-[11px] font-medium";

function chipTone(on: boolean, done: boolean) {
    if (on) {
        return "bg-primary text-primary-foreground";
    }
    return done ? "bg-app-income/15 text-app-income" : "bg-app-fill text-muted-foreground";
}

export function Stepper({ step }: { step: Step }) {
    const { steps } = useIntlayer("dashboard-import");
    const current = STEPS.indexOf(step);
    return (
        <ol className="flex min-w-0 items-center gap-2 max-lg:hidden">
            {STEPS.map((name, index) => {
                const done = index < current;
                const on = index === current;
                return (
                    <li className="flex items-center gap-2" key={name}>
                        {index === 0 ? null : <span aria-hidden className="bg-border h-px w-[22px]" />}
                        <span
                            aria-current={on ? "step" : undefined}
                            className={`flex items-center gap-[7px] text-[13px] font-medium whitespace-nowrap ${on ? "text-foreground" : "text-muted-foreground"}`}
                        >
                            <span className={`${STEP_CHIP} ${chipTone(on, done)}`}>
                                {done ? <Glyph icon={Tick02Icon} size={12} strokeWidth={2} /> : index + 1}
                            </span>
                            {steps[name]}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

export function ImportBar({ children, step }: { children?: ReactNode; step?: Step }) {
    const { title } = useIntlayer("dashboard-import");
    return (
        <div className="flex min-h-16 flex-wrap items-center gap-x-6 gap-y-2 py-3">
            <h1 className="text-lg leading-6 font-semibold tracking-[-0.02em]">{title}</h1>
            {step ? <Stepper step={step} /> : null}
            <div className="ml-auto flex items-center gap-2">{children}</div>
        </div>
    );
}

export function ImportPage({ children }: { children: ReactNode }) {
    return <main className="@container flex min-h-full min-w-0 flex-col px-4 pb-5 sm:px-6">{children}</main>;
}

/** The main column and the 320px rail; the last card in each column runs to the bottom of the page. */
export function Columns({ children, rail }: { children: ReactNode; rail: ReactNode }) {
    return (
        <div className={`grid flex-1 grid-cols-1 gap-4 ${rail ? "@5xl:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
            <div className="flex min-w-0 flex-col gap-4 @5xl:*:last:flex-1">{children}</div>
            {rail ? <div className="flex min-w-0 flex-col gap-4 @5xl:*:last:flex-1">{rail}</div> : null}
        </div>
    );
}

export function Card({
    action,
    children,
    className = "",
    footer,
    head,
    title,
}: {
    action?: ReactNode;
    children?: ReactNode;
    className?: string;
    footer?: ReactNode;
    /** Replaces the title row, for tabs that sit where the title would. */
    head?: ReactNode;
    title?: ReactNode;
}) {
    return (
        <Frame className={`min-w-0 ${className}`}>
            <Frame.Header className={head ? "min-h-10 py-0 ps-0" : ""}>
                {head ?? (
                    <Frame.Title as="h2" className={action ? "row-span-2 self-center" : ""}>
                        {title}
                    </Frame.Title>
                )}
                {action ? <Frame.Action className="justify-self-end">{action}</Frame.Action> : null}
            </Frame.Header>
            {children ? <Frame.Panel className="relative flex flex-1 flex-col">{children}</Frame.Panel> : null}
            {footer ? (
                <Frame.Footer className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                    {footer}
                </Frame.Footer>
            ) : null}
        </Frame>
    );
}

export const SOURCE_ICON: Record<ImportSource, IconSvgElement> = {
    csv: Note01Icon,
    moneyManager: Wallet01Icon,
    notion: Notion01Icon,
    pdf: Pdf01Icon,
};

export function SourceTile({ size = "md", source }: { size?: "md" | "sm"; source: ImportSource }) {
    return (
        <span
            className={`bg-app-fill flex flex-none items-center justify-center ${size === "sm" ? "size-6 rounded-md" : "size-10 rounded-[10px]"} ${source === "pdf" ? "text-primary" : "text-muted-foreground"}`}
        >
            <Glyph icon={SOURCE_ICON[source]} size={size === "sm" ? 13 : 18} />
        </span>
    );
}

const tileTone = (bad: boolean, source: ImportSource) => {
    if (bad) {
        return "text-destructive";
    }
    return source === "pdf" ? "text-primary" : "text-muted-foreground";
};

export function FileHead({
    bad = false,
    name,
    note,
    source,
}: {
    bad?: boolean;
    name: ReactNode;
    note: ReactNode;
    source: ImportSource;
}) {
    return (
        <div className="flex min-w-0 items-center gap-3 px-5 pb-[18px]">
            <span
                className={`bg-app-fill flex h-12 w-10 flex-none items-center justify-center rounded-lg ${tileTone(bad, source)}`}
            >
                <Glyph icon={bad ? File01Icon : SOURCE_ICON[source]} size={20} />
            </span>
            <div className="min-w-0">
                <b className="block truncate text-sm leading-5 font-medium">{name}</b>
                <small className="text-muted-foreground block truncate text-xs leading-4">{note}</small>
            </div>
        </div>
    );
}

export function FileStats({
    className = "mb-4",
    columns,
    dates,
    rows,
}: {
    className?: string;
    columns: ReactNode;
    dates: ReactNode;
    rows: ReactNode;
}) {
    const { upload } = useIntlayer("dashboard-import");
    const cells = [
        [upload.rows, rows],
        [upload.columns, columns],
        [upload.dates, dates],
    ] as const;
    return (
        <dl className={`mx-4 grid grid-cols-3 border-t ${className}`}>
            {cells.map(([label, value], index) => (
                <div className="min-w-0 border-s ps-3 pt-3 first:border-s-0 first:ps-0" key={index}>
                    <dt className="text-muted-foreground text-xs leading-4">{label}</dt>
                    <dd className="dash-figure mt-0.5 truncate text-sm font-medium">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

export function Line({
    children,
    label,
    plain = false,
    tone = "",
}: {
    children: ReactNode;
    label: ReactNode;
    plain?: boolean;
    tone?: string;
}) {
    return (
        <div className="flex min-h-9 items-center gap-3 border-b px-4 text-[13px] last:border-0">
            <span className="text-muted-foreground min-w-0 truncate">{label}</span>
            <span className={`${plain ? "" : "dash-figure "}ml-auto whitespace-nowrap ${tone}`}>{children}</span>
        </div>
    );
}

export const NOTE = "text-muted-foreground px-4 py-3 text-[13px] leading-5";

const WORKS_WITH = ["CSV", "PDF", "Money Manager", "Notion"] as const;

export function WorksWith({ children }: { children?: ReactNode }) {
    const { upload } = useIntlayer("dashboard-import");
    return (
        <Card title={upload.worksWith}>
            <div className="flex flex-wrap gap-1.5 px-4 pt-4">
                {WORKS_WITH.map((name) => (
                    <span
                        className="dash-figure inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium"
                        key={name}
                    >
                        {name}
                    </span>
                ))}
            </div>
            {children ?? <p className={NOTE}>{upload.worksWithNote}</p>}
        </Card>
    );
}

const BANNER = {
    bad: "border-destructive/25 bg-destructive/12 text-[color-mix(in_oklab,var(--color-destructive),var(--color-foreground)_30%)]",
    ok: "border-app-income/25 bg-app-income/12 text-[color-mix(in_oklab,var(--color-app-income),var(--color-foreground)_30%)]",
    warn: "border-app-warn/25 bg-app-warn/12 text-[color-mix(in_oklab,var(--color-app-warn),var(--color-foreground)_30%)]",
} as const;

export function Banner({
    action,
    children,
    title,
    tone,
}: {
    action?: ReactNode;
    children?: ReactNode;
    title: ReactNode;
    tone: "bad" | "ok" | "warn";
}) {
    return (
        <output
            className={`mx-5 my-4 flex gap-2.5 rounded-[10px] border p-3 text-[13px] leading-[18px] ${action ? "items-center" : "items-start"} ${BANNER[tone]}`}
        >
            <Glyph
                className={action ? "flex-none" : "mt-px flex-none"}
                icon={tone === "ok" ? CheckmarkCircle02Icon : AlertCircleIcon}
                size={17}
            />
            <div className="min-w-0 flex-1">
                <b className="font-medium">{title}</b> {children ? <span>{children}</span> : null}
            </div>
            {action}
        </output>
    );
}

const hasFiles = (event: DragEvent) => event.dataTransfer.types.includes("Files");

/** Counts enter and leave, since dragging across a child fires a leave on the parent. */
export function useFileDrop(onFile: (file: File) => void) {
    const depth = useRef(0);
    const [over, setOver] = useState(false);
    return {
        over,
        props: {
            onDragEnter: (event: DragEvent) => {
                if (hasFiles(event)) {
                    event.preventDefault();
                    depth.current += 1;
                    setOver(true);
                }
            },
            onDragLeave: () => {
                depth.current = Math.max(0, depth.current - 1);
                if (depth.current === 0) {
                    setOver(false);
                }
            },
            onDragOver: (event: DragEvent) => {
                if (hasFiles(event)) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                }
            },
            onDrop: (event: DragEvent) => {
                event.preventDefault();
                depth.current = 0;
                setOver(false);
                const [file] = event.dataTransfer.files;
                if (file) {
                    onFile(file);
                }
            },
        },
    };
}

export function FilePicker({
    accept,
    children,
    onFile,
}: {
    accept: string;
    children: (open: () => void) => ReactNode;
    onFile: (file: File) => void;
}) {
    const [input, setInput] = useState<HTMLInputElement | null>(null);
    return (
        <>
            {children(() => input?.click())}
            <input
                accept={accept}
                className="hidden"
                onChange={(event) => {
                    const [file] = event.target.files ?? [];
                    event.target.value = "";
                    if (file) {
                        onFile(file);
                    }
                }}
                ref={setInput}
                type="file"
            />
        </>
    );
}

export function DropTile({
    bad = false,
    icon = Upload04Icon,
    over = false,
}: {
    bad?: boolean;
    icon?: IconSvgElement;
    over?: boolean;
}) {
    let tone = "bg-app-fill text-muted-foreground";
    let shown = icon;
    if (over) {
        tone = "bg-primary/18 text-primary";
        shown = Download04Icon;
    } else if (bad) {
        tone = "bg-app-fill text-destructive";
        shown = File01Icon;
    }
    return (
        <span className={`mb-3 flex size-11 items-center justify-center rounded-[14px] ${tone}`}>
            <Glyph icon={shown} size={20} />
        </span>
    );
}

export const DROPZONE =
    "flex flex-col items-center justify-center rounded-xl border border-dashed border-[color:var(--color-border-strong,var(--border))] px-4 text-center transition-colors";

const KILO = 1024;

export function fileSize(bytes: number) {
    return bytes < KILO * KILO
        ? `${Math.max(1, Math.round(bytes / KILO))} KB`
        : `${(bytes / KILO / KILO).toFixed(1)} MB`;
}
