import { LEDGER_MCP_ORIGIN, SITE_URL } from "@outlayr/shared/urls";
import { toolDefinition } from "@tanstack/ai";
import { createMCPServer, resourceDefinition } from "@tanstack/ai-mcp/server";
import * as Schema from "effect/Schema";
import * as SchemaRepresentation from "effect/SchemaRepresentation";

import llms from "../../public/llms.txt?raw";
import { CALCULATOR_SPECS } from "./calculator-specs";
import { CALCULATORS } from "./calculator-tools";

const PROTOCOL_VERSIONS = ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26"] as const;
const LLMS_URI = `${SITE_URL}/llms.txt`;

const SERVER_INFO = { name: "com.tryoutlayr/outlayr", title: "Outlayr", version: "1.0.0" };
const READ_ONLY = { openWorldHint: false, readOnlyHint: true } as const;
const CAPABILITIES = { resources: {}, tools: {} };

const SECTIONS = new Map(
    llms
        .split(/^(?=## )/mu)
        .slice(1)
        .map((block) => [block.slice("## ".length, block.indexOf("\n")), block.trim()])
);
const AboutInput = Schema.Struct({
    section: Schema.optional(
        Schema.Literals([...SECTIONS.keys()]).annotate({
            description: "One section of llms.txt, such as Plans or Privacy. Omit it for the whole file.",
        })
    ),
});
const decodeAbout = Schema.decodeUnknownSync(AboutInput, { errors: "all" });

const aboutOutlayr = toolDefinition({
    description:
        "What the Outlayr expense tracker does, its free and Pro plans, how it handles data, and links to every guide and comparison on tryoutlayr.com.",
    inputSchema: SchemaRepresentation.toJsonSchemaDocument(Schema.toRepresentation(AboutInput)).schema,
    metadata: { annotations: READ_ONLY, title: "About Outlayr" },
    name: "about_outlayr",
}).server((input) => {
    const { section } = decodeAbout(input);
    return section ? (SECTIONS.get(section) ?? llms) : llms;
});

const CALCULATOR_TOOLS = CALCULATOR_SPECS.map(({ title, ...tool }) =>
    toolDefinition({ ...tool, metadata: { annotations: READ_ONLY, title } }).server((args) =>
        CALCULATORS[tool.name].run(args)
    )
);

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
    instructions: `Read-only facts about the Outlayr expense tracker and five money calculators. Call about_outlayr for features, plans, prices, and privacy; pass section to read one part. The calculators take amounts in currency units and store nothing. A user's own entries live on the ledger server, described at ${SITE_URL}/auth.md.`,
    name: SERVER_INFO.name,
    resources: [llmsResource],
    tools: [aboutOutlayr, ...CALCULATOR_TOOLS],
    version: SERVER_INFO.version,
});
