import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";

import type { CalculatorName } from "./calculator-specs";
import { PER_YEAR, installmentCost, loanSchedule, settleUp, splitBudget, subscriptionCost } from "./calculators";

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;
const Amount = Schema.Finite.check(Schema.isBetween({ maximum: 1e12, minimum: 0 }));
const Discount = Schema.Finite.check(Schema.isBetween({ maximum: 100, minimum: 0 }));
const Inflation = Schema.Finite.check(Schema.isBetween({ maximum: 1000, minimum: 0 }));

const withDefault = <A extends string | number | boolean>(schema: Schema.Codec<A>, value: A) =>
    schema.annotate({ default: value }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(value)));

const TrimmedName = Schema.String.check(
    Schema.makeFilter(
        (name: string) => {
            const { length } = [...name.trim()];
            return length >= 1 && length <= 100;
        },
        { expected: "a name of 1 to 100 characters", toJsonSchema: () => ({ maxLength: 100, minLength: 1 }) }
    )
).pipe(Schema.decodeTo(Schema.String, SchemaTransformation.trim()));

function calculator<S extends Schema.ConstraintDecoder<unknown>>(input: S, compute: (args: S["Type"]) => object) {
    return { input, run: flow(Schema.decodeUnknownSync(input, { errors: "all" }), compute) };
}

export const CALCULATORS = {
    budget_split: calculator(
        Schema.Struct({
            every: withDefault(
                Schema.Literals(["week", "twoWeeks", "month", "year"]).annotate({
                    description: "How often the pay arrives",
                }),
                "month"
            ),
            income: Amount.annotate({ description: "Take home pay, after taxes" }),
            split: withDefault(Schema.Literals(["50-30-20", "60-20-20", "70-20-10"]), "50-30-20"),
        }),
        ({ every, income, split }) => {
            const yearly = toCents(income) * PER_YEAR[every];
            const parts = (total: number) => {
                const [needs = 0, wants = 0, savings = 0] = splitBudget(total, split).map(fromCents);
                return { needs, savings, wants };
            };
            return { monthly: parts(Math.round(yearly / 12)), yearly: parts(yearly) };
        }
    ),
    subscription_cost: calculator(
        Schema.Struct({
            subscriptions: Schema.Array(
                Schema.Struct({
                    every: withDefault(Schema.Literals(["week", "month", "quarter", "year"]), "month"),
                    name: Schema.optionalKey(Schema.String.check(Schema.isMaxCodePoints(100))),
                    price: Amount,
                })
            ).check(Schema.isMinLength(1), Schema.isMaxLength(100)),
        }),
        ({ subscriptions }) => {
            const cost = subscriptionCost(
                subscriptions.map((item) => ({ amount: toCents(item.price), cadence: item.every }))
            );
            return {
                monthly: fromCents(cost.monthly),
                subscriptions: subscriptions.map((item, index) => ({
                    name: item.name,
                    yearly: fromCents(cost.yearly[index] ?? 0),
                })),
                yearly: fromCents(cost.total),
            };
        }
    ),
    installment_cost: calculator(
        Schema.Struct({
            cashDiscountPercent: withDefault(
                Discount.annotate({
                    description: "Percent off cashPrice when paying in full today. 0 if there is none",
                }),
                0
            ),
            cashPrice: Amount.annotate({
                description: "What the item costs paid in full today, before any cash discount: the list price",
            }),
            eachPayment: Amount,
            every: withDefault(Schema.Literals(["week", "twoWeeks", "month"]), "month"),
            monthlyInflationPercent: withDefault(
                Inflation.annotate({ description: "Expected inflation per month, in percent. 0 to ignore inflation" }),
                0
            ),
            paidToday: withDefault(Amount, 0),
            payments: Schema.Int.check(Schema.isBetween({ maximum: 600, minimum: 1 })).annotate({
                description: "Number of payments after today",
            }),
        }),
        ({ cashDiscountPercent, cashPrice, eachPayment, every, monthlyInflationPercent, paidToday, payments }) => {
            const cost = installmentCost({
                cadence: every,
                cashDiscountPercent,
                count: payments,
                down: toCents(paidToday),
                monthlyInflationPercent,
                payment: toCents(eachPayment),
                price: toCents(cashPrice),
            });
            return {
                cashPriceAfterDiscount: fromCents(cost.cash),
                cheaper: cost.verdict,
                effectiveAnnualRatePercent:
                    cost.annualRate === null ? null : Math.round(cost.annualRate * 10_000) / 100,
                extraOverCash: fromCents(cost.extra),
                total: fromCents(cost.total),
                totalInTodaysMoney: fromCents(cost.present),
            };
        }
    ),
    split_expenses: calculator(
        Schema.Struct({
            people: Schema.Array(Schema.Struct({ name: TrimmedName, paid: Amount }))
                .annotate({ description: "Everyone in the group, each with a different name" })
                .check(
                    Schema.isMinLength(2),
                    Schema.isMaxLength(100),
                    Schema.makeFilter(
                        (people) =>
                            new Set(people.map(({ name }) => name.toLowerCase())).size === people.length ||
                            "Each person needs a different name"
                    )
                ),
        }),
        ({ people }) => {
            const { share, total, transfers } = settleUp(people.map((person) => toCents(person.paid)));
            const nameOf = (index: number) => people[index]?.name ?? "";
            return {
                shares: people.map((person, index) => ({ name: person.name, share: fromCents(share[index] ?? 0) })),
                total: fromCents(total),
                transfers: transfers.map((transfer) => ({
                    amount: fromCents(transfer.amount),
                    from: nameOf(transfer.from),
                    to: nameOf(transfer.to),
                })),
            };
        }
    ),
    loan_cost: calculator(
        Schema.Struct({
            amount: Amount.annotate({ description: "What is borrowed" }),
            annualRatePercent: Schema.Finite.check(Schema.isBetween({ maximum: 999, minimum: 0 })).annotate({
                description: "Nominal annual interest rate, in percent",
            }),
            months: Schema.Int.check(Schema.isBetween({ maximum: 600, minimum: 1 })),
            schedule: withDefault(
                Schema.Boolean.annotate({ description: "Also return the month by month amortization schedule" }),
                false
            ),
            upfrontFeePercent: withDefault(
                Discount.annotate({ description: "Fee charged once, as a percent of amount" }),
                0
            ),
        }),
        ({ amount, annualRatePercent, months, schedule, upfrontFeePercent }) => {
            const principal = toCents(amount);
            const loan = loanSchedule({ amount: principal, annualPercent: annualRatePercent, months });
            const upfrontFee = Math.round((principal * upfrontFeePercent) / 100);
            return {
                interest: fromCents(loan.interest),
                monthlyPayment: fromCents(loan.payment),
                schedule: schedule
                    ? loan.schedule.map((row) => ({
                          balance: fromCents(row.balance),
                          interest: fromCents(row.interest),
                          payment: fromCents(row.payment),
                          principal: fromCents(row.principal),
                      }))
                    : undefined,
                totalPaid: fromCents(loan.total + upfrontFee),
                upfrontFee: fromCents(upfrontFee),
            };
        }
    ),
} satisfies Record<CalculatorName, ReturnType<typeof calculator>>;

export function runCalculator(name: CalculatorName, args: Schema.JsonObject) {
    try {
        return CALCULATORS[name].run(args);
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
}
