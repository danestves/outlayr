import { LANGUAGES } from "@outlayr/shared/i18n";
import type { Locale } from "@outlayr/shared/i18n";
import type { ReactNode } from "react";
import { useLocale } from "react-intlayer";

import { formatMoney } from "@/components/demo/money";
import { formatMoney as wholeMoney, formatPercent, moneyParts } from "@/lib/money";

const LABEL = "text-muted font-mono text-xs tracking-widest uppercase";

function Plate({ children, side, title }: { children: ReactNode; side: string; title: string }) {
    return (
        <>
            <div className="border-border flex h-11 items-center justify-between gap-4 border-b">
                <p className="text-muted w-0 flex-1 truncate text-sm">{title}</p>
                <span className="text-muted shrink-0 font-mono text-xs">{side}</span>
            </div>
            <div className="pt-5">{children}</div>
        </>
    );
}

const text = (parts: Intl.NumberFormatPart[]) => parts.map(({ value }) => value).join("");

function Hero({ amount, label }: { amount: Intl.NumberFormatPart[]; label: string }) {
    const decimal = amount.findIndex(({ type }) => type === "decimal");
    return (
        <>
            <p className={LABEL}>{label}</p>
            <p className="mt-1.5 text-4xl font-semibold tracking-tight tabular-nums">
                {text(amount.slice(0, decimal))}
                <span className="text-muted text-lg">{text(amount.slice(decimal, decimal + 2))}</span>
                {text(amount.slice(decimal + 2))}
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
    de: {
        budgets: ["Lebensmittel", "Nahverkehr", "Essen gehen", "Telefon und Internet"],
        last: "64,20 $ bei Loblaws, getippt",
        left: "Übrig diesen Monat",
        month: "November · CAD",
        of: "von",
        side: "keine Bank verknüpft",
        today: "Heute",
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
    fr: {
        budgets: ["Épicerie", "Transport", "Restos", "Téléphone et internet"],
        last: "64,20 $ chez Loblaws, saisi",
        left: "Reste ce mois-ci",
        month: "Novembre · CAD",
        of: "sur",
        side: "aucune banque liée",
        today: "Aujourd'hui",
    },
    pt: {
        budgets: ["Mercado", "Transporte", "Comer fora", "Telefone e internet"],
        last: "$64.20 no Loblaws, digitado",
        left: "Resta este mês",
        month: "Novembro · CAD",
        of: "de",
        side: "nenhum banco conectado",
        today: "Hoje",
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
    const tag = locale === "fr" ? "fr-CA" : "en-CA";
    const cad = new Intl.NumberFormat(tag, { currency: "CAD", style: "currency" });
    const dollars = new Intl.NumberFormat(tag, { currency: "CAD", maximumFractionDigits: 0, style: "currency" });
    return (
        <Plate side={copy.side} title={copy.month}>
            <Hero amount={cad.formatToParts(1284.6)} label={copy.left} />
            <ul className="mt-4">
                {CANADA_BUDGETS.map(({ limit, spent }, index) => (
                    <li className="border-border border-t py-2.5" key={copy.budgets[index]}>
                        <div className="flex items-baseline justify-between gap-3">
                            <span>{copy.budgets[index]}</span>
                            <span className="text-muted font-mono text-xs uppercase tabular-nums">
                                {dollars.format(spent)} {copy.of} {dollars.format(limit)}
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

interface CasheaCopy {
    due: string;
    grace: string;
    interest: string;
    level: string;
    purchase: string;
    rows: readonly [string, string, string, string];
}

const CASHEA = {
    en: {
        due: "Installment 2 of 3 · due Fri, 21 Nov",
        grace: "2 days of grace, then $4 per installment",
        interest: "0% interest",
        level: "Level 1",
        purchase: "Fridge",
        rows: ["Upfront 60%", "Installment 1", "Installment 2", "Installment 3"],
    },
    de: {
        due: "Rate 2 von 3 · fällig Fr., 21. Nov.",
        grace: "2 Tage Frist, danach 4 $ pro Rate",
        interest: "0 % Zinsen",
        level: "Stufe 1",
        purchase: "Kühlschrank",
        rows: ["Anzahlung 60 %", "Rate 1", "Rate 2", "Rate 3"],
    },
    es: {
        due: "Cuota 2 de 3 · vence el vie, 21 nov",
        grace: "2 días de gracia, luego $4 por cuota",
        interest: "0% interés",
        level: "Nivel 1",
        purchase: "Nevera",
        rows: ["Inicial 60%", "Cuota 1", "Cuota 2", "Cuota 3"],
    },
    fr: {
        due: "Échéance 2 sur 3 · le ven. 21 nov.",
        grace: "2 jours de grâce, puis 4 $ par échéance",
        interest: "0 % d'intérêt",
        level: "Niveau 1",
        purchase: "Réfrigérateur",
        rows: ["Apport 60 %", "Échéance 1", "Échéance 2", "Échéance 3"],
    },
    pt: {
        due: "Parcela 2 de 3 · vence sex, 21 nov",
        grace: "2 dias de carência, depois $ 4 por parcela",
        interest: "0% de juros",
        level: "Nível 1",
        purchase: "Geladeira",
        rows: ["Entrada 60%", "Parcela 1", "Parcela 2", "Parcela 3"],
    },
} as const satisfies Record<Locale, CasheaCopy>;

const CASHEA_SCHEDULE = [
    { amount: 360, day: { en: "24 Oct", de: "24. Okt.", es: "24 oct", fr: "24 oct.", pt: "24 out" }, state: "paid" },
    { amount: 80, day: { en: "7 Nov", de: "7. Nov.", es: "7 nov", fr: "7 nov.", pt: "7 nov" }, state: "paid" },
    { amount: 80, day: { en: "21 Nov", de: "21. Nov.", es: "21 nov", fr: "21 nov.", pt: "21 nov" }, state: "next" },
    { amount: 80, day: { en: "5 Dec", de: "5. Dez.", es: "5 dic", fr: "5 déc.", pt: "5 dez" }, state: "later" },
] as const satisfies readonly { amount: number; day: Record<Locale, string>; state: string }[];

export function CasheaPlate() {
    const { locale } = useLocale();
    const copy = CASHEA[locale];
    return (
        <Plate side={copy.level} title={`${copy.purchase} · ${formatMoney(600, "USD", locale)}`}>
            <p className="text-4xl font-semibold tracking-tight tabular-nums">{formatMoney(80, "USD", locale)}</p>
            <p className="text-muted mt-1">{copy.due}</p>
            <ol className="mt-3">
                {CASHEA_SCHEDULE.map(({ amount, day, state }, index) => (
                    <li
                        className={`border-border grid grid-cols-[4.5rem_1fr_auto] items-baseline gap-2 border-b py-2.5 last:border-b-0 ${state === "next" ? "font-semibold" : ""}`}
                        key={copy.rows[index]}
                    >
                        <span className="text-muted font-mono text-xs">{day[locale]}</span>
                        <span className={state === "later" ? "text-muted" : ""}>{copy.rows[index]}</span>
                        <span
                            className={`tabular-nums ${state === "paid" ? "text-income" : ""} ${state === "later" ? "text-muted" : ""}`}
                        >
                            {formatMoney(amount, "USD", locale)}
                            {state === "paid" ? " ✓" : ""}
                        </span>
                    </li>
                ))}
            </ol>
            <p className="border-border text-muted flex justify-between gap-3 border-t pt-3 text-xs">
                <span>{copy.grace}</span>
                <span className="shrink-0 font-mono">{copy.interest}</span>
            </p>
        </Plate>
    );
}

interface CouplesCopy {
    earns: string;
    note: string;
    pays: string;
    share: string;
    shared: string;
    side: string;
    title: string;
}

const COUPLES = {
    en: {
        earns: "Earns",
        note: "Rent, groceries, utilities. The rest stays personal.",
        pays: "Pays",
        share: "Share",
        shared: "Shared this month",
        side: "by income",
        title: "Shared bills",
    },
    de: {
        earns: "Verdient",
        note: "Miete, Einkäufe, Nebenkosten. Der Rest bleibt privat.",
        pays: "Zahlt",
        share: "Anteil",
        shared: "Gemeinsam diesen Monat",
        side: "nach Einkommen",
        title: "Gemeinsame Kosten",
    },
    es: {
        earns: "Gana",
        note: "Alquiler, supermercado, servicios. El resto es personal.",
        pays: "Paga",
        share: "Parte",
        shared: "Compartido este mes",
        side: "según ingresos",
        title: "Cuentas en común",
    },
    fr: {
        earns: "Gagne",
        note: "Loyer, courses, charges. Le reste reste personnel.",
        pays: "Paie",
        share: "Part",
        shared: "En commun ce mois-ci",
        side: "selon les revenus",
        title: "Dépenses communes",
    },
    pt: {
        earns: "Ganha",
        note: "Aluguel, mercado, contas da casa. O resto fica pessoal.",
        pays: "Paga",
        share: "Parte",
        shared: "Compartilhado este mês",
        side: "pela renda",
        title: "Contas em comum",
    },
} as const satisfies Record<Locale, CouplesCopy>;

const SHARED_BILLS = 2500;
const PARTNERS = [
    { earns: 4200, name: "Ana" },
    { earns: 2800, name: "Luis" },
] as const;
const PARTNERS_TOTAL = PARTNERS.reduce((sum, partner) => sum + partner.earns, 0);

export function CouplesPlate() {
    const { locale } = useLocale();
    const copy = COUPLES[locale];
    const tag = LANGUAGES[locale].date;
    const [first] = PARTNERS;
    return (
        <Plate side={copy.side} title={copy.title}>
            <Hero amount={moneyParts(SHARED_BILLS, "USD", tag, 2)} label={copy.shared} />
            <div aria-hidden="true" className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full">
                <div className="bg-foreground" style={{ width: `${(first.earns / PARTNERS_TOTAL) * 100}%` }} />
                <div className="bg-muted/45 flex-1" />
            </div>
            <table className="mt-4 w-full tabular-nums">
                <thead>
                    <tr className="text-muted font-mono text-xs uppercase">
                        <th className="pb-2 text-left font-normal" scope="col">
                            <span className="sr-only">{copy.side}</span>
                        </th>
                        <th className="pb-2 text-right font-normal" scope="col">
                            {copy.earns}
                        </th>
                        <th className="pb-2 text-right font-normal" scope="col">
                            {copy.share}
                        </th>
                        <th className="pb-2 text-right font-normal" scope="col">
                            {copy.pays}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {PARTNERS.map((partner) => {
                        const share = partner.earns / PARTNERS_TOTAL;
                        return (
                            <tr className="border-border border-t" key={partner.name}>
                                <th className="py-2.5 text-left font-normal" scope="row">
                                    {partner.name}
                                </th>
                                <td className="py-2.5 text-right">{wholeMoney(partner.earns, "USD", tag, 0)}</td>
                                <td className="py-2.5 text-right">{formatPercent(share * 100, tag)}</td>
                                <td className="py-2.5 text-right">
                                    {formatMoney(SHARED_BILLS * share, "USD", locale)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <p className="border-border text-muted border-t pt-3 text-xs">{copy.note}</p>
        </Plate>
    );
}
