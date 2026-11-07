import type { ReactNode } from "react";
import { useLocale } from "react-intlayer";

import { formatMoney } from "@/components/demo/money";
import type { Locale } from "@/lib/i18n";

const LABEL = "text-muted font-mono text-xs tracking-widest uppercase";

function Plate({ children, side, title }: { children: ReactNode; side: string; title: string }) {
    return (
        <>
            <div className="border-border flex h-11 items-center justify-between gap-4 border-b">
                <p className="text-muted truncate text-sm">{title}</p>
                <span className="text-muted shrink-0 font-mono text-xs">{side}</span>
            </div>
            <div className="pt-5">{children}</div>
        </>
    );
}

function Hero({ amount, label }: { amount: string; label: string }) {
    const [whole, cents] = amount.split(".");
    return (
        <>
            <p className={LABEL}>{label}</p>
            <p className="mt-1.5 text-4xl font-semibold tracking-tight tabular-nums">
                {whole}
                <span className="text-muted text-lg">.{cents}</span>
            </p>
        </>
    );
}

interface CanadaCopy {
    budgets: readonly [string, string, string, string];
    last: string;
    left: string;
    month: string;
    of: string;
    side: string;
    today: string;
}

const CANADA = {
    en: {
        budgets: ["Groceries", "Transit", "Eating out", "Phone and internet"],
        last: "$64.20 at Loblaws, typed",
        left: "Left this month",
        month: "November · CAD",
        of: "of",
        side: "no bank linked",
        today: "Today",
    },
    es: {
        budgets: ["Supermercado", "Transporte", "Comer fuera", "Teléfono e internet"],
        last: "$64.20 en Loblaws, escrito",
        left: "Queda este mes",
        month: "Noviembre · CAD",
        of: "de",
        side: "sin banco vinculado",
        today: "Hoy",
    },
} as const satisfies Record<Locale, CanadaCopy>;

const CANADA_BUDGETS = [
    { limit: 600, spent: 412 },
    { limit: 156, spent: 128 },
    { limit: 150, spent: 171 },
    { limit: 120, spent: 65 },
] as const;

export function CanadaPlate() {
    const { locale } = useLocale();
    const copy = CANADA[locale];
    return (
        <Plate side={copy.side} title={copy.month}>
            <Hero amount={formatMoney(1284.6, "CAD")} label={copy.left} />
            <ul className="mt-4">
                {CANADA_BUDGETS.map(({ limit, spent }, index) => (
                    <li className="border-border border-t py-2.5" key={copy.budgets[index]}>
                        <div className="flex items-baseline justify-between gap-3">
                            <span>{copy.budgets[index]}</span>
                            <span className="text-muted font-mono text-xs uppercase tabular-nums">
                                ${spent} {copy.of} ${limit}
                            </span>
                        </div>
                        <div className="bg-surface mt-2 h-1 overflow-hidden rounded-full">
                            <div
                                className={`h-full rounded-full ${spent > limit ? "bg-spend" : "bg-foreground"}`}
                                style={{ width: `${Math.min(100, (spent / limit) * 100)}%` }}
                            />
                        </div>
                    </li>
                ))}
            </ul>
            <p className="border-border text-muted flex justify-between border-t pt-3 text-xs">
                <span>{copy.last}</span>
                <span>{copy.today}</span>
            </p>
        </Plate>
    );
}
