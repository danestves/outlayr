import { toolDefinition } from "@tanstack/ai";
import { createMCPServer, resourceDefinition } from "@tanstack/ai-mcp/server";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaRepresentation from "effect/SchemaRepresentation";
import * as SchemaTransformation from "effect/SchemaTransformation";

import llms from "../../public/llms.txt?raw";
import { PER_YEAR, installmentCost, settleUp, splitBudget, subscriptionCost } from "./calculators";
import { LEDGER_MCP_ORIGIN, SITE_URL } from "./site";

const PROTOCOL_VERSIONS = ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26"] as const;
const LLMS_URI = `${SITE_URL}/llms.txt`;

const SERVER_INFO = { name: "com.tryoutlayr/outlayr", title: "Outlayr", version: "1.0.0" };
const READ_ONLY = { openWorldHint: false, readOnlyHint: true } as const;
const CAPABILITIES = { resources: {}, tools: {} };

const aboutOutlayr = toolDefinition({
    description:
        "What the Outlayr expense tracker does, its free and Pro plans, how it handles data, and links to every guide and comparison on tryoutlayr.com.",
    metadata: { annotations: READ_ONLY, title: "About Outlayr" },
    name: "about_outlayr",
}).server(() => llms);

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;
const Amount = Schema.Finite.check(Schema.isBetween({ maximum: 1e12, minimum: 0 }));
const UNITS = "Amounts are in currency units and come back rounded to cents.";

const withDefault = <A extends string | number>(schema: Schema.Codec<A>, value: A) =>
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

function calculator<S extends Schema.ConstraintDecoder<unknown>>(
    { title, ...tool }: { description: string; name: string; title: string },
    input: S,
    run: (args: S["Type"]) => object
) {
    const decode = Schema.decodeUnknownSync(input, { errors: "all" });
    return toolDefinition({
        ...tool,
        inputSchema: SchemaRepresentation.toJsonSchemaDocument(Schema.toRepresentation(input)).schema,
        metadata: { annotations: READ_ONLY, title },
    }).server((args) => run(decode(args)));
}

const CALCULATORS = [
    calculator(
        {
            description: `Splits take home pay by the 50/30/20 rule into needs, wants, and savings, or by 60/20/20 or 70/20/10. Weekly, two weekly, and yearly pay become a month at 52 weeks a year. ${UNITS}`,
            name: "budget_split",
            title: "50/30/20 budget calculator",
        },
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
    calculator(
        {
            description: `What a list of subscriptions costs a month and a year. A weekly charge counts 52 times a year, a monthly one 12, a quarterly one 4. ${UNITS}`,
            name: "subscription_cost",
            title: "Subscription cost calculator",
        },
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
    calculator(
        {
            description: `The real cost of an installment or buy now, pay later plan: the total paid, the extra over the cash price, and the effective annual rate. Anything paid at checkout goes in paidToday; the payments start one period later. Late fees are not included. ${UNITS}`,
            name: "installment_cost",
            title: "Installment calculator",
        },
        Schema.Struct({
            cashPrice: Amount.annotate({ description: "What the item costs paid in full today" }),
            eachPayment: Amount,
            every: withDefault(Schema.Literals(["week", "twoWeeks", "month"]), "month"),
            paidToday: withDefault(Amount, 0),
            payments: Schema.Int.check(Schema.isBetween({ maximum: 600, minimum: 1 })).annotate({
                description: "Number of payments after today",
            }),
        }),
        ({ cashPrice, eachPayment, every, paidToday, payments }) => {
            const cost = installmentCost({
                cadence: every,
                count: payments,
                down: toCents(paidToday),
                payment: toCents(eachPayment),
                price: toCents(cashPrice),
            });
            return {
                effectiveAnnualRatePercent:
                    cost.annualRate === null ? null : Math.round(cost.annualRate * 10_000) / 100,
                extraOverCash: fromCents(cost.extra),
                total: fromCents(cost.total),
            };
        }
    ),
    calculator(
        {
            description: `Splits what a group paid equally and lists who pays whom to settle it, in at most one payment fewer than the number of people. ${UNITS}`,
            name: "split_expenses",
            title: "Split expenses calculator",
        },
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
];

const llmsResource = resourceDefinition({
    description: "Outlayr's features, plans, privacy, and pages, written for language models.",
    mimeType: "text/markdown",
    name: "llms.txt",
    title: "About Outlayr",
    uri: LLMS_URI,
}).read(() => ({ text: llms }));

export const SERVER_CARD_TYPE = "application/mcp-server-card+json";
const CARD_SCHEMA = "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json";
const ICONS = [{ mimeType: "image/png", sizes: ["180x180"], src: `${SITE_URL}/apple-touch-icon.png` }];

export const SERVER_CARD = {
    $schema: CARD_SCHEMA,
    ...SERVER_INFO,
    capabilities: CAPABILITIES,
    description:
        "Read-only facts about the Outlayr expense tracker: features, plans, privacy, and guides, plus free money calculators.",
    icons: ICONS,
    remotes: [{ supportedProtocolVersions: PROTOCOL_VERSIONS, type: "streamable-http", url: `${SITE_URL}/mcp` }],
    serverInfo: SERVER_INFO,
    transport: { endpoint: "/mcp", type: "streamable-http" },
    websiteUrl: SITE_URL,
};

export const LEDGER_SERVER_CARD = {
    $schema: CARD_SCHEMA,
    description:
        "An Outlayr user's own entries and monthly spending, and adding entries, after they sign in and approve.",
    icons: ICONS,
    name: "com.tryoutlayr/ledger",
    remotes: [{ type: "streamable-http", url: `${LEDGER_MCP_ORIGIN}/mcp` }],
    title: "Outlayr ledger",
    version: "0.1.0",
    websiteUrl: `${SITE_URL}/auth.md`,
};

export const server = createMCPServer({
    name: SERVER_INFO.name,
    resources: [llmsResource],
    tools: [aboutOutlayr, ...CALCULATORS],
    version: SERVER_INFO.version,
});
