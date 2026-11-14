import type { JSONSchema } from "@tanstack/ai";

const spec = <Name extends string>(
    name: Name,
    { description, inputSchema, title }: { description: string; inputSchema: JSONSchema; title: string }
) => ({ description, inputSchema, name, title });

export const CALCULATOR_SPECS = [
    spec("budget_split", {
        title: "50/30/20 budget calculator",
        description:
            "Splits take home pay by the 50/30/20 rule into needs, wants, and savings, or by 60/20/20 or 70/20/10. Weekly, two weekly, and yearly pay become a month at 52 weeks a year. Amounts are in currency units and come back rounded to cents.",
        inputSchema: {
            type: "object",
            properties: {
                every: {
                    type: "string",
                    enum: ["week", "twoWeeks", "month", "year"],
                    description: "How often the pay arrives",
                    default: "month",
                },
                income: {
                    type: "number",
                    minimum: 0,
                    maximum: 1_000_000_000_000,
                    description: "Take home pay, after taxes",
                },
                split: { type: "string", enum: ["50-30-20", "60-20-20", "70-20-10"], default: "50-30-20" },
            },
            required: ["income"],
            additionalProperties: true,
        },
    }),
    spec("subscription_cost", {
        title: "Subscription cost calculator",
        description:
            "What a list of subscriptions costs a month and a year. A weekly charge counts 52 times a year, a monthly one 12, a quarterly one 4. Amounts are in currency units and come back rounded to cents.",
        inputSchema: {
            type: "object",
            properties: {
                subscriptions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            every: { type: "string", enum: ["week", "month", "quarter", "year"], default: "month" },
                            name: { type: "string", maxLength: 100 },
                            price: { type: "number", minimum: 0, maximum: 1_000_000_000_000 },
                        },
                        required: ["price"],
                        additionalProperties: true,
                    },
                    minItems: 1,
                    maxItems: 100,
                },
            },
            required: ["subscriptions"],
            additionalProperties: true,
        },
    }),
    spec("installment_cost", {
        title: "Installment calculator",
        description:
            "The real cost of an installment or buy now, pay later plan: the total paid, the extra over the cash price (after any cash discount), and the effective annual rate. Set monthlyInflationPercent to also get the plan's total in today's money and whether installments or cash is cheaper; set cashDiscountPercent when the store takes a percentage off the list price for paying cash. Anything paid at checkout goes in paidToday; the payments start one period later. Late fees are not included. Amounts are in currency units and come back rounded to cents.",
        inputSchema: {
            type: "object",
            properties: {
                cashDiscountPercent: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    description: "Percent off cashPrice when paying in full today. 0 if there is none",
                    default: 0,
                },
                cashPrice: {
                    type: "number",
                    minimum: 0,
                    maximum: 1_000_000_000_000,
                    description: "What the item costs paid in full today, before any cash discount: the list price",
                },
                eachPayment: { type: "number", minimum: 0, maximum: 1_000_000_000_000 },
                every: { type: "string", enum: ["week", "twoWeeks", "month"], default: "month" },
                monthlyInflationPercent: {
                    type: "number",
                    minimum: 0,
                    maximum: 1000,
                    description: "Expected inflation per month, in percent. 0 to ignore inflation",
                    default: 0,
                },
                paidToday: { type: "number", minimum: 0, maximum: 1_000_000_000_000, default: 0 },
                payments: { type: "integer", minimum: 1, maximum: 600, description: "Number of payments after today" },
            },
            required: ["cashPrice", "eachPayment", "payments"],
            additionalProperties: true,
        },
    }),
    spec("split_expenses", {
        title: "Split expenses calculator",
        description:
            "Splits what a group paid equally and lists who pays whom to settle it, in at most one payment fewer than the number of people. Amounts are in currency units and come back rounded to cents.",
        inputSchema: {
            type: "object",
            properties: {
                people: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", maxLength: 100, minLength: 1 },
                            paid: { type: "number", minimum: 0, maximum: 1_000_000_000_000 },
                        },
                        required: ["name", "paid"],
                        additionalProperties: true,
                    },
                    description: "Everyone in the group, each with a different name",
                    minItems: 2,
                    maxItems: 100,
                },
            },
            required: ["people"],
            additionalProperties: true,
        },
    }),
    spec("loan_cost", {
        title: "Loan calculator",
        description:
            "The fixed monthly payment of a loan, the total interest, and the total paid with an optional upfront fee. Set schedule for the month by month amortization, where the last payment absorbs the rounding. Amounts are in currency units and come back rounded to cents.",
        inputSchema: {
            type: "object",
            properties: {
                amount: { type: "number", minimum: 0, maximum: 1_000_000_000_000, description: "What is borrowed" },
                annualRatePercent: {
                    type: "number",
                    minimum: 0,
                    maximum: 999,
                    description: "Nominal annual interest rate, in percent",
                },
                months: { type: "integer", minimum: 1, maximum: 600 },
                schedule: {
                    type: "boolean",
                    description: "Also return the month by month amortization schedule",
                    default: false,
                },
                upfrontFeePercent: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    description: "Fee charged once, as a percent of amount",
                    default: 0,
                },
            },
            required: ["amount", "annualRatePercent", "months"],
            additionalProperties: true,
        },
    }),
];

export type CalculatorName = (typeof CALCULATOR_SPECS)[number]["name"];
