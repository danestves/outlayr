import { decimalsFor } from "@outlayr/money/currency";
import { EVERY_OPTIONS, UPFRONT_SHARES } from "@outlayr/money/installment-draft";
import { splitTotal } from "@outlayr/money/installments";
import { generateText, Output } from "ai";
import type { LanguageModel } from "ai";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { InstallmentPlanDraft, InstallmentScanResult } from "./installmentScan.spec";
import { draftCurrency, pickKnown, trimTo } from "./lib/ledgerPrompt";
import type { LedgerContext } from "./lib/ledgerPrompt";
import { modelCallError, modelSchema } from "./lib/modelCall";
import { MAX_AMOUNT } from "./lib/sanitizeLimits";
import { REQUEST_TIMEOUT_MS } from "./receiptScan";
import type { ScanStatus } from "./receiptScan.spec";

export const MAX_INSTALLMENTS = 48;
const MAX_ORDERS = 20;
const MAX_PROVIDER_LENGTH = 40;
const MAX_NAME_LENGTH = 80;
const MIN_CADENCE_DAYS = 7;
const MAX_CADENCE_DAYS = 31;
const MAX_YEARS_AWAY = 5;
const ANCHOR_AHEAD_DAYS = 45;
const DAY_MS = 86_400_000;

export type PlanContext = Omit<LedgerContext, "categoryTree">;

export function failure(status: Exclude<typeof ScanStatus.Type, "ok">): typeof InstallmentScanResult.Type {
    return { plan: null, plans: [], skipped: [], status };
}

export const ModelOrder = Schema.Struct({
    accountName: Schema.NullOr(Schema.String),
    cuotaAmount: Schema.NullOr(Schema.Finite),
    cuotaCount: Schema.NullOr(Schema.Finite),
    cuotasLeft: Schema.NullOr(Schema.Finite),
    currency: Schema.NullOr(Schema.String),
    feeDue: Schema.NullOr(Schema.Finite),
    name: Schema.NullOr(Schema.String),
    paidSoFar: Schema.NullOr(Schema.Finite),
    price: Schema.NullOr(Schema.Finite),
    provider: Schema.NullOr(Schema.String),
    purchaseDay: Schema.NullOr(Schema.Finite),
    purchaseMonth: Schema.NullOr(Schema.Finite),
    purchaseYear: Schema.NullOr(Schema.Finite),
    rows: Schema.Array(
        Schema.Struct({
            amount: Schema.Finite,
            day: Schema.Finite,
            fee: Schema.Finite,
            month: Schema.Finite,
            paid: Schema.Boolean,
            sequence: Schema.Finite,
            year: Schema.NullOr(Schema.Finite),
        })
    ),
});

export const ModelOutput = Schema.Struct({ found: Schema.Boolean, orders: Schema.Array(ModelOrder) });

export type ModelOrder = typeof ModelOrder.Type;
export type ModelOutput = typeof ModelOutput.Type;
type ModelRow = ModelOrder["rows"][number];
type PlannedRow = (typeof InstallmentPlanDraft.Type)["rows"][number];

const modelOutputSchema = modelSchema(ModelOutput);

export function buildPrompt(context: PlanContext): string {
    return [
        "You read screenshots of orders paid in installments (a buy now, pay later app such as Cashea, Krece, Afterpay or Klarna, or a store's credit plan) for a person's expense tracker and answer one JSON object listing every order shown.",
        "found is false when the images show no installment order (a receipt, a product, a chat, a blank screen) or no order's payments or totals can be read; then orders may be empty.",
        'orders has one entry per distinct order. A screen of one order\'s detail is one order. A list of pending payments across orders ("Tus pagos", "Próximos pagos") is one order per purchase: when the same order appears on several rows or screenshots (its cuota 2 on one date, cuota 3 on another) it is one order holding all of those rows.',
        'name is the order\'s purchase as printed: the store, product or order title ("Crocs", "Movilmar"), or null when none is shown. provider is the app or lender running the plan, written the way it brands itself ("Cashea"), or null when it is not shown; on a list from one app, every order has that app as provider.',
        'rows are the payments of the order printed with a due date, the down payment included, in the order shown. sequence is 0 for the down payment made at purchase ("Inicial", "Pago inicial", "Down payment") and 1, 2, 3 and so on for the installments ("Cuota 1"), by their printed number ("Cuota 2 de 6" is 2) or else their position. An order without a down payment has no row 0.',
        'cuotaCount is the total number of installments the order has when printed ("Cuota 2 de 6" is 6), else null.',
        'month and day are the row\'s due date as printed ("8 de Jun" is month 6, day 8; a list grouped under "15 de noviembre" dates its rows November 15). year is the printed year, or null when the date prints none; never guess a year.',
        'amount is the payment\'s own amount without late fees, a positive number of major units. fee is the late fee or surcharge added to that row ("$25.00" over "$21.00 + $4.00" is amount 21 and fee 4), else 0. The installments of one order are equal apart from a few cents of rounding: when an installment shows more than the others with no breakdown, the difference is a late fee already charged, so amount is the others\' amount and fee the difference. The down payment is never compared with the installments. Totals, remaining balances, points or rewards ("Sumas 23") and banners are not rows.',
        'paid is true only for a payment marked as done ("Aprobado", "Pagado", "Paid", a check mark); an upcoming, pending, due today or overdue one (often red) is false.',
        'Some screens show an order\'s totals instead of its payments. That is still an order: rows holds only the payments printed with a due date, often none. Then price is the order\'s full price and paidSoFar what has been paid ("$253.58 de $316.99" is paidSoFar 253.58, price 316.99); cuotasLeft is the number of installments still to pay ("1 cuota", "Última cuota" is 1) and cuotaAmount the amount of one of them without late fees; feeDue is the late fees or surcharges owed on top of those installments (a total due above them is a fee), else 0; purchaseMonth, purchaseDay and purchaseYear are the purchase date ("Fecha de compra"), purchaseYear null when no year is printed. Each is null when the screen shows no such figure.',
        `The ledger's currency is ${context.currency}. currency is the ISO 4217 code of the order's amounts: the code when one is printed; else the code a printed symbol most likely means${context.regionCode ? ` for a plan in ${context.regionCode}` : ""} ("$" is the dollar or peso of the country the plan comes from; Cashea and other Venezuelan apps charge in USD).`,
        context.accounts.length > 0
            ? `Their debt accounts are: ${context.accounts.join(", ")}. Set accountName verbatim only when one of them is clearly the account of the order's provider (it carries the provider's name); otherwise null.`
            : "They have no debt accounts; accountName is null.",
    ].join(" ");
}

function calendarDay(year: number, month: number, day: number): number | null {
    if (![year, month, day].every(Number.isInteger)) {
        return null;
    }
    const ms = Date.UTC(year, month - 1, day);
    const date = new Date(ms);
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? ms : null;
}

function resolveDay(
    row: Pick<ModelRow, "day" | "month" | "year">,
    previousMs: number | null,
    todayMs: number
): number | null {
    const todayYear = new Date(todayMs).getUTCFullYear();
    if (row.year !== null) {
        return Math.abs(row.year - todayYear) <= MAX_YEARS_AWAY ? calendarDay(row.year, row.month, row.day) : null;
    }
    if (previousMs === null) {
        for (let year = todayYear + 1; year >= todayYear - MAX_YEARS_AWAY; year -= 1) {
            const ms = calendarDay(year, row.month, row.day);
            if (ms !== null && ms <= todayMs + ANCHOR_AHEAD_DAYS * DAY_MS) {
                return ms;
            }
        }
        return null;
    }
    const previousYear = new Date(previousMs).getUTCFullYear();
    for (const year of [previousYear, previousYear + 1]) {
        const ms = calendarDay(year, row.month, row.day);
        if (ms !== null && ms >= previousMs) {
            return ms;
        }
    }
    return null;
}

function isoDay(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10);
}

function validAmount(amount: number): boolean {
    return Number.isFinite(amount) && amount > 0 && amount <= MAX_AMOUNT;
}

function scheduleRows(order: ModelOrder, todayMs: number): PlannedRow[] | null {
    const rows = order.rows.toSorted((a, b) => a.sequence - b.sequence);
    const first = rows[0]?.sequence === 0 ? 0 : 1;
    const installments = rows.length - 1 + first;
    if (
        installments < 1 ||
        installments > MAX_INSTALLMENTS ||
        !rows.every((row, index) => row.sequence === first + index && validAmount(row.amount))
    ) {
        return null;
    }
    const planned: PlannedRow[] = [];
    let previousMs: number | null = null;
    for (const row of rows) {
        const ms = resolveDay(row, previousMs, todayMs);
        if (ms === null || (previousMs !== null && ms < previousMs)) {
            return null;
        }
        previousMs = ms;
        planned.push({
            amount: row.amount,
            dueDate: isoDay(ms),
            fee: validFee(row.fee),
            paid: row.paid,
            sequence: row.sequence,
        });
    }
    return planned;
}

function validFee(fee: number): number {
    return Number.isFinite(fee) && fee > 0 && fee <= MAX_AMOUNT ? fee : 0;
}

function printedCount(order: ModelOrder): number | null {
    const count = order.cuotaCount;
    return count !== null && Number.isInteger(count) && count >= 1 && count <= MAX_INSTALLMENTS ? count : null;
}

function coversEveryCuota(rows: readonly ModelRow[], count: number): boolean {
    const sequences = new Set(rows.filter((row) => row.sequence > 0).map((row) => row.sequence));
    return (
        sequences.size === count &&
        Array.from({ length: count }, (_, index) => index + 1).every((s) => sequences.has(s))
    );
}

function listRows(order: ModelOrder, count: number, todayMs: number): PlannedRow[] | null {
    const printed = order.rows.filter((row) => row.sequence > 0).toSorted((a, b) => a.sequence - b.sequence);
    const upfront = order.rows.find((row) => row.sequence === 0);
    if (
        printed.length === 0 ||
        !printed.every(
            (row, index) =>
                Number.isInteger(row.sequence) &&
                row.sequence <= count &&
                validAmount(row.amount) &&
                (index === 0 || row.sequence > (printed[index - 1]?.sequence ?? 0))
        ) ||
        (upfront !== undefined && !validAmount(upfront.amount))
    ) {
        return null;
    }
    const dated: { ms: number; row: ModelRow }[] = [];
    let previousMs: number | null = null;
    for (const row of upfront === undefined ? printed : [upfront, ...printed]) {
        const ms = resolveDay(row, previousMs, todayMs);
        if (ms === null || (previousMs !== null && ms < previousMs)) {
            return null;
        }
        previousMs = ms;
        dated.push({ ms, row });
    }
    const cuotas = dated.filter(({ row }) => row.sequence > 0);
    const [first] = cuotas;
    const last = cuotas.at(-1);
    if (first === undefined || last === undefined) {
        return null;
    }
    const spanDays =
        last.row.sequence > first.row.sequence
            ? Math.round((last.ms - first.ms) / DAY_MS / (last.row.sequence - first.row.sequence))
            : EVERY_OPTIONS.days14.every;
    const cadenceMs = Math.min(MAX_CADENCE_DAYS, Math.max(MIN_CADENCE_DAYS, spanDays)) * DAY_MS;
    const firstUnpaid = cuotas.find(({ row }) => !row.paid)?.row.sequence ?? count + 1;
    const planned = Array.from({ length: count }, (_, index): PlannedRow => {
        const sequence = index + 1;
        const exact = cuotas.find(({ row }) => row.sequence === sequence);
        if (exact !== undefined) {
            return {
                amount: exact.row.amount,
                dueDate: isoDay(exact.ms),
                fee: validFee(exact.row.fee),
                paid: exact.row.paid,
                sequence,
            };
        }
        const anchor = cuotas.findLast(({ row }) => row.sequence < sequence) ?? first;
        return {
            amount: anchor.row.amount,
            dueDate: isoDay(anchor.ms + (sequence - anchor.row.sequence) * cadenceMs),
            fee: 0,
            paid: sequence < firstUnpaid,
            sequence,
        };
    });
    const upfrontRow = dated.find(({ row }) => row.sequence === 0);
    return upfrontRow === undefined
        ? planned
        : [
              { amount: upfrontRow.row.amount, dueDate: isoDay(upfrontRow.ms), fee: 0, paid: true, sequence: 0 },
              ...planned,
          ];
}

const SUMMARY_SHARES = [...UPFRONT_SHARES, 0];

function positiveOrNull(amount: number | null): number | null {
    return amount !== null && validAmount(amount) ? amount : null;
}

function summaryRows(output: ModelOrder, todayMs: number, currency: string): PlannedRow[] | null {
    const price = positiveOrNull(output.price);
    if (price === null) {
        return null;
    }
    const scale = 10 ** decimalsFor(currency);
    const toMinor = (amount: number) => Math.round(amount * scale);
    const priceMinor = toMinor(price);
    const each = positiveOrNull(output.cuotaAmount);
    const printedLeft =
        output.cuotasLeft !== null && Number.isInteger(output.cuotasLeft) && output.cuotasLeft >= 1
            ? output.cuotasLeft
            : null;
    let owedMinor: number | null = null;
    if (output.paidSoFar !== null && Number.isFinite(output.paidSoFar)) {
        owedMinor = priceMinor - toMinor(output.paidSoFar);
    } else if (each !== null) {
        owedMinor = toMinor(each) * (printedLeft ?? 1);
    }
    if (owedMinor === null || owedMinor <= 0 || owedMinor > priceMinor) {
        return null;
    }
    const cuotasLeft = printedLeft ?? (each === null ? 1 : Math.max(1, Math.round(owedMinor / toMinor(each))));
    if (cuotasLeft > MAX_INSTALLMENTS) {
        return null;
    }
    const purchaseMs =
        output.purchaseDay !== null && output.purchaseMonth !== null
            ? (resolveDay(
                  { day: output.purchaseDay, month: output.purchaseMonth, year: output.purchaseYear },
                  null,
                  todayMs
              ) ?? todayMs)
            : todayMs;
    const cadenceMs = EVERY_OPTIONS.days14.every * DAY_MS;
    const dueByToday = Math.max(0, Math.floor((todayMs - purchaseMs) / cadenceMs));
    const counts = Array.from({ length: MAX_INSTALLMENTS - cuotasLeft + 1 }, (_, index) => cuotasLeft + index);
    const [best] = SUMMARY_SHARES.flatMap((share, shareRank) =>
        counts.map((count) => {
            const cuotas = splitTotal((priceMinor - Math.round(priceMinor * share)) / scale, count, currency).map(
                toMinor
            );
            const drift = owedMinor - cuotas.slice(-cuotasLeft).reduce((sum, amount) => sum + amount, 0);
            const fitted = cuotas.map((amount, index) => (index === count - 1 ? amount + drift : amount));
            const upfrontMinor = priceMinor - fitted.reduce((sum, amount) => sum + amount, 0);
            const lateness = Math.abs(count - cuotasLeft - Math.min(count, dueByToday));
            return { drift: Math.abs(drift), fitted, lateness, shareRank, upfrontMinor };
        })
    )
        .filter(({ fitted, upfrontMinor }) => upfrontMinor >= 0 && fitted.every((amount) => amount > 0))
        .toSorted((a, b) => a.drift - b.drift || a.lateness - b.lateness || a.shareRank - b.shareRank);
    if (best === undefined) {
        return null;
    }
    const fee = positiveOrNull(output.feeDue) ?? 0;
    const paidCuotas = best.fitted.length - cuotasLeft;
    const cuotas = best.fitted.map((amount, index) => ({
        amount: amount / scale,
        dueDate: isoDay(purchaseMs + (index + 1) * cadenceMs),
        fee: index === paidCuotas ? fee : 0,
        paid: index < paidCuotas,
        sequence: index + 1,
    }));
    return best.upfrontMinor > 0
        ? [
              { amount: best.upfrontMinor / scale, dueDate: isoDay(purchaseMs), fee: 0, paid: true, sequence: 0 },
              ...cuotas,
          ]
        : cuotas;
}

export function normalizePlan(order: ModelOrder, context: PlanContext): typeof InstallmentPlanDraft.Type | null {
    const todayMs = Date.parse(`${context.today}T00:00:00Z`);
    if (Number.isNaN(todayMs)) {
        return null;
    }
    const { currency } = draftCurrency(order.currency, context.currency);
    const count = printedCount(order);
    const printed =
        count !== null && !coversEveryCuota(order.rows, count)
            ? listRows(order, count, todayMs)
            : scheduleRows(order, todayMs);
    const rows = printed ?? summaryRows(order, todayMs, currency ?? context.currency);
    if (rows === null) {
        return null;
    }
    return {
        accountName: pickKnown(order.accountName, context.accounts),
        currency,
        name: trimTo(order.name, MAX_NAME_LENGTH),
        provider: trimTo(order.provider, MAX_PROVIDER_LENGTH),
        rows,
    };
}

function orderKey(order: ModelOrder): string | null {
    const name = order.name?.trim().toLowerCase();
    return name ? `${order.provider?.trim().toLowerCase() ?? ""}\u0000${name}` : null;
}

export function mergeOrders(orders: readonly ModelOrder[]): ModelOrder[] {
    const merged: ModelOrder[] = [];
    for (const order of orders) {
        const key = orderKey(order);
        const index = key === null ? -1 : merged.findIndex((seen) => orderKey(seen) === key);
        const seen = merged[index];
        const clashes =
            seen !== undefined &&
            order.rows.some((row) =>
                seen.rows.some((other) => other.sequence === row.sequence && other.amount !== row.amount)
            );
        if (seen === undefined || clashes) {
            merged.push(order);
            continue;
        }
        const added = order.rows.filter((row) => !seen.rows.some((other) => other.sequence === row.sequence));
        merged[index] = {
            ...seen,
            cuotaCount: Math.max(seen.cuotaCount ?? 0, order.cuotaCount ?? 0) || null,
            rows: [...seen.rows, ...added],
        };
    }
    return merged;
}

export function normalizePlans(output: ModelOutput, context: PlanContext): typeof InstallmentScanResult.Type {
    if (!output.found) {
        return failure("unclear");
    }
    const plans: (typeof InstallmentPlanDraft.Type)[] = [];
    const skipped: string[] = [];
    for (const order of mergeOrders(output.orders).slice(0, MAX_ORDERS)) {
        const plan = normalizePlan(order, context);
        const name = trimTo(order.name, MAX_NAME_LENGTH);
        if (plan !== null) {
            plans.push(plan);
        } else if (name !== null) {
            skipped.push(name);
        }
    }
    const [first] = plans;
    return first === undefined ? failure("unclear") : { plan: first, plans, skipped, status: "ok" };
}

export const readInstallmentPlan = Effect.fn("InstallmentScan.readInstallmentPlan")(
    function* readInstallmentPlan(model: LanguageModel, images: readonly ArrayBuffer[], context: PlanContext) {
        const { output } = yield* Effect.tryPromise({
            catch: modelCallError,
            try: () =>
                generateText({
                    abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                    maxRetries: 0,
                    messages: [
                        {
                            content: [
                                ...images.map((image) => ({
                                    data: new Uint8Array(image),
                                    mediaType: "image/jpeg",
                                    type: "file" as const,
                                })),
                                {
                                    text:
                                        images.length > 1
                                            ? "Read the payment plans across these screenshots."
                                            : "Read this payment plan.",
                                    type: "text",
                                },
                            ],
                            role: "user",
                        },
                    ],
                    model,
                    output: Output.object({ schema: modelOutputSchema }),
                    reasoning: "low",
                    system: buildPrompt(context),
                }),
        });
        return normalizePlans(output, context);
    },
    Effect.catchTags({
        ModelCallError: ({ reason }) =>
            Effect.succeed(failure(reason === "invalidResponse" ? "invalidResponse" : "providerError")),
    })
);
