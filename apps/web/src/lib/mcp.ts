import { z } from "zod";

import llms from "../../public/llms.txt?raw";
import { PER_YEAR, installmentCost, settleUp, splitBudget, subscriptionCost } from "./calculators";
import { LEDGER_MCP_ORIGIN, SITE_URL } from "./site";

const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;
const LLMS_URI = `${SITE_URL}/llms.txt`;

const SERVER_INFO = { name: "com.tryoutlayr/outlayr", title: "Outlayr", version: "1.0.0" };
const CAPABILITIES = { resources: {}, tools: {} };

const ABOUT_TOOL = {
    annotations: { openWorldHint: false, readOnlyHint: true },
    description:
        "What the Outlayr expense tracker does, its free and Pro plans, how it handles data, and links to every guide and comparison on tryoutlayr.com.",
    inputSchema: { properties: {}, type: "object" },
    name: "about_outlayr",
    title: "About Outlayr",
};

type Outcome = { result: object } | { error: { code: number; message: string } };

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;
const Amount = z.number().min(0).max(1e12);
const UNITS = "Amounts are in currency units and come back rounded to cents.";

function calculator<S extends z.ZodType>(
    tool: { description: string; name: string; title: string },
    input: S,
    run: (args: z.output<S>) => object
) {
    const { $schema: _dialect, ...inputSchema } = z.toJSONSchema(input, { io: "input" });
    return {
        call: (params: JsonRpcRequest["params"]): Outcome => {
            const parsed = input.safeParse(params.arguments ?? {});
            if (!parsed.success) {
                return { result: { content: [{ text: z.prettifyError(parsed.error), type: "text" }], isError: true } };
            }
            const output = run(parsed.data);
            return { result: { content: [{ text: JSON.stringify(output), type: "text" }], structuredContent: output } };
        },
        tool: {
            ...tool,
            annotations: { openWorldHint: false, readOnlyHint: true },
            inputSchema,
        },
    };
}

const CALCULATORS = [
    calculator(
        {
            description: `Splits take home pay by the 50/30/20 rule into needs, wants, and savings, or by 60/20/20 or 70/20/10. Weekly, two weekly, and yearly pay become a month at 52 weeks a year. ${UNITS}`,
            name: "budget_split",
            title: "50/30/20 budget calculator",
        },
        z.object({
            every: z.enum(["week", "twoWeeks", "month", "year"]).default("month").describe("How often the pay arrives"),
            income: Amount.describe("Take home pay, after taxes"),
            split: z.enum(["50-30-20", "60-20-20", "70-20-10"]).default("50-30-20"),
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
        z.object({
            subscriptions: z
                .array(
                    z.object({
                        every: z.enum(["week", "month", "quarter", "year"]).default("month"),
                        name: z.string().max(100).optional(),
                        price: Amount,
                    })
                )
                .min(1)
                .max(100),
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
        z.object({
            cashPrice: Amount.describe("What the item costs paid in full today"),
            eachPayment: Amount,
            every: z.enum(["week", "twoWeeks", "month"]).default("month"),
            paidToday: Amount.default(0),
            payments: z.int().min(1).max(600).describe("Number of payments after today"),
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
        z.object({
            people: z
                .array(z.object({ name: z.string().trim().min(1).max(100), paid: Amount }))
                .min(2)
                .max(100)
                .refine((people) => new Set(people.map(({ name }) => name.toLowerCase())).size === people.length, {
                    message: "Each person needs a different name",
                })
                .describe("Everyone in the group, each with a different name"),
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

const LLMS_RESOURCE = {
    description: "Outlayr's features, plans, privacy, and pages, written for language models.",
    mimeType: "text/markdown",
    name: "llms.txt",
    title: "About Outlayr",
    uri: LLMS_URI,
};

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
    description: "An Outlayr user's own entries and monthly spending, after they sign in and approve.",
    icons: ICONS,
    name: "com.tryoutlayr/ledger",
    remotes: [{ type: "streamable-http", url: `${LEDGER_MCP_ORIGIN}/mcp` }],
    title: "Outlayr ledger",
    version: "0.1.0",
    websiteUrl: `${SITE_URL}/auth.md`,
};

const JsonRpcMessage = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    jsonrpc: z.literal("2.0"),
    method: z.string(),
    params: z
        .object({ arguments: z.unknown(), name: z.string(), protocolVersion: z.string(), uri: z.string() })
        .partial()
        .default({}),
});

type JsonRpcRequest = z.infer<typeof JsonRpcMessage>;

function reply(id: JsonRpcRequest["id"] | null, outcome: Outcome, status = 200): Response {
    return Response.json({ id, jsonrpc: "2.0", ...outcome }, { status });
}

function dispatch({ method, params }: JsonRpcRequest): Outcome {
    switch (method) {
        case "initialize": {
            const protocolVersion =
                PROTOCOL_VERSIONS.find((version) => version === params.protocolVersion) ?? PROTOCOL_VERSIONS[0];
            return { result: { capabilities: CAPABILITIES, protocolVersion, serverInfo: SERVER_INFO } };
        }
        case "ping": {
            return { result: {} };
        }
        case "tools/list": {
            return { result: { tools: [ABOUT_TOOL, ...CALCULATORS.map(({ tool }) => tool)] } };
        }
        case "tools/call": {
            if (params.name === ABOUT_TOOL.name) {
                return { result: { content: [{ text: llms, type: "text" }] } };
            }
            const found = CALCULATORS.find(({ tool }) => tool.name === params.name);
            return found ? found.call(params) : { error: { code: -32_602, message: `Unknown tool: ${params.name}` } };
        }
        case "resources/list": {
            return { result: { resources: [LLMS_RESOURCE] } };
        }
        case "resources/read": {
            return params.uri === LLMS_URI
                ? { result: { contents: [{ mimeType: LLMS_RESOURCE.mimeType, text: llms, uri: LLMS_URI }] } }
                : { error: { code: -32_002, message: `Resource not found: ${params.uri}` } };
        }
        default: {
            return { error: { code: -32_601, message: `Method not found: ${method}` } };
        }
    }
}

export async function handleMcp(request: Request): Promise<Response> {
    const message = JsonRpcMessage.safeParse(await request.json().catch(() => null));
    if (!message.success) {
        return reply(null, { error: { code: -32_600, message: "Expected one JSON-RPC request" } }, 400);
    }
    if (message.data.id === undefined) {
        return new Response(null, { status: 202 });
    }
    return reply(message.data.id, dispatch(message.data));
}
