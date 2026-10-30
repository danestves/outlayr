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
const MAX_PROVIDER_LENGTH = 40;
const MAX_YEARS_AWAY = 5;
const ANCHOR_AHEAD_DAYS = 45;
const DAY_MS = 86_400_000;

export type PlanContext = Omit<LedgerContext, "categoryTree">;

export function failure(status: Exclude<typeof ScanStatus.Type, "ok">): typeof InstallmentScanResult.Type {
    return { plan: null, status };
}

export const ModelOutput = Schema.Struct({
    accountName: Schema.NullOr(Schema.String),
    currency: Schema.NullOr(Schema.String),
    found: Schema.Boolean,
    provider: Schema.NullOr(Schema.String),
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

export type ModelOutput = typeof ModelOutput.Type;
type ModelRow = ModelOutput["rows"][number];

const modelOutputSchema = modelSchema(ModelOutput);

export function buildPrompt(context: PlanContext): string {
    return [
        "You read screenshots of an order paid in installments (a buy now, pay later app such as Cashea, Krece, Afterpay or Klarna, or a store's credit plan) for a person's expense tracker and answer one JSON object describing its payment schedule.",
        "found is false when the image is not an installment payment schedule (a receipt, a product, a chat, a blank screen) or its payments cannot be read; then every other field may be null or empty.",
        'provider is the app or lender running the plan, written the way it brands itself ("Cashea"), or null when it is not shown.',
        'rows are every payment of the plan shown, the down payment included, in the order shown. sequence is 0 for the down payment made at purchase ("Inicial", "Pago inicial", "Down payment") and 1, 2, 3 and so on for the installments ("Cuota 1"), by their printed number or else their position. A plan without a down payment has no row 0.',
        'month and day are the row\'s due date as printed ("8 de Jun" is month 6, day 8). year is the printed year, or null when the date prints none; never guess a year.',
        'amount is the payment\'s own amount without late fees, a positive number of major units. fee is the late fee or surcharge added to that row ("$25.00" over "$21.00 + $4.00" is amount 21 and fee 4), else 0. The installments of one plan are equal apart from a few cents of rounding: when an installment shows more than the others with no breakdown, the difference is a late fee already charged, so amount is the others\' amount and fee the difference. The down payment is never compared with the installments. Totals, remaining balances and banners are not rows.',
        'paid is true only for a payment marked as done ("Aprobado", "Pagado", "Paid", a check mark); an upcoming, pending or overdue one (often red) is false.',
        `The ledger's currency is ${context.currency}. currency is the ISO 4217 code of the plan's amounts: the code when one is printed; else the code a printed symbol most likely means${context.regionCode ? ` for a plan in ${context.regionCode}` : ""} ("$" is the dollar or peso of the country the plan comes from; Cashea and other Venezuelan apps charge in USD).`,
        context.accounts.length > 0
            ? `Their debt accounts are: ${context.accounts.join(", ")}. Set accountName verbatim only when one of them is clearly the account of this provider (it carries the provider's name); otherwise null.`
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

function resolveDay(row: ModelRow, previousMs: number | null, todayMs: number): number | null {
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

function validAmount(amount: number): boolean {
    return Number.isFinite(amount) && amount > 0 && amount <= MAX_AMOUNT;
}

export function normalizePlan(output: ModelOutput, context: PlanContext): typeof InstallmentPlanDraft.Type | null {
    const todayMs = Date.parse(`${context.today}T00:00:00Z`);
    const rows = output.rows.toSorted((a, b) => a.sequence - b.sequence);
    const first = rows[0]?.sequence === 0 ? 0 : 1;
    const installments = rows.length - 1 + first;
    if (
        !output.found ||
        Number.isNaN(todayMs) ||
        installments < 1 ||
        installments > MAX_INSTALLMENTS ||
        !rows.every((row, index) => row.sequence === first + index && validAmount(row.amount))
    ) {
        return null;
    }
    const planned: (typeof InstallmentPlanDraft.Type)["rows"][number][] = [];
    let previousMs: number | null = null;
    for (const row of rows) {
        const ms = resolveDay(row, previousMs, todayMs);
        if (ms === null || (previousMs !== null && ms < previousMs)) {
            return null;
        }
        previousMs = ms;
        planned.push({
            amount: row.amount,
            dueDate: new Date(ms).toISOString().slice(0, 10),
            fee: Number.isFinite(row.fee) && row.fee > 0 && row.fee <= MAX_AMOUNT ? row.fee : 0,
            paid: row.paid,
            sequence: row.sequence,
        });
    }
    return {
        accountName: pickKnown(output.accountName, context.accounts),
        currency: draftCurrency(output.currency, context.currency).currency,
        provider: trimTo(output.provider, MAX_PROVIDER_LENGTH),
        rows: planned,
    };
}

export const readInstallmentPlan = Effect.fn("InstallmentScan.readInstallmentPlan")(
    function* readInstallmentPlan(model: LanguageModel, image: ArrayBuffer, context: PlanContext) {
        const { output } = yield* Effect.tryPromise({
            catch: modelCallError,
            try: () =>
                generateText({
                    abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
                    maxRetries: 0,
                    messages: [
                        {
                            content: [
                                { data: new Uint8Array(image), mediaType: "image/jpeg", type: "file" },
                                { text: "Read this payment plan.", type: "text" },
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
        const plan = normalizePlan(output, context);
        return plan === null ? failure("unclear") : { plan, status: "ok" as const };
    },
    Effect.catchTags({
        ModelCallError: ({ reason }) =>
            Effect.succeed(failure(reason === "invalidResponse" ? "invalidResponse" : "providerError")),
    })
);
