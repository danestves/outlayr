import { createFileRoute } from "@tanstack/react-router";

import { LEDGER_SERVER_CARD, SERVER_CARD_TYPE } from "@/lib/mcp";
import { COMPANY, SITE_URL } from "@/lib/site";

const CATALOG_TYPE = "application/ai-catalog+json";

const catalog = {
    entries: [
        {
            displayName: "Outlayr product facts",
            identifier: "urn:air:tryoutlayr.com:mcp:outlayr",
            representativeQueries: [
                "What does Outlayr cost?",
                "Is Outlayr on Android?",
                "How much do my subscriptions cost per month?",
                "What does an installment plan really cost?",
            ],
            type: SERVER_CARD_TYPE,
            url: `${SITE_URL}/.well-known/mcp/server-card.json`,
        },
        {
            data: LEDGER_SERVER_CARD,
            displayName: LEDGER_SERVER_CARD.title,
            identifier: "urn:air:tryoutlayr.com:mcp:ledger",
            representativeQueries: [
                "How much did I spend on groceries this month?",
                "Show my latest entries",
                "How does this month's spending compare with last month?",
            ],
            type: SERVER_CARD_TYPE,
        },
        {
            displayName: "Outlayr answers agent",
            identifier: "urn:air:tryoutlayr.com:a2a:outlayr",
            representativeQueries: [
                "Is Outlayr a good YNAB alternative?",
                "Does Outlayr track more than one currency?",
                "Can Outlayr import a bank CSV?",
            ],
            type: "application/a2a-agent-card+json",
            url: `${SITE_URL}/.well-known/agent-card.json`,
        },
        {
            displayName: "Outlayr CSV import",
            identifier: "urn:air:tryoutlayr.com:skill:outlayr",
            representativeQueries: [
                "Turn my bank export into a file Outlayr can import",
                "Which columns does an Outlayr CSV need?",
            ],
            type: 'text/markdown; profile="urn:air:agent-skills"',
            url: `${SITE_URL}/.well-known/agent-skills/outlayr/SKILL.md`,
        },
    ],
    host: { displayName: COMPANY, identifier: "tryoutlayr.com" },
    specVersion: "1.0",
};

export const Route = createFileRoute("/.well-known/ai-catalog.json")({
    server: {
        handlers: {
            GET: () =>
                Response.json(catalog, {
                    headers: {
                        "access-control-allow-origin": "*",
                        "cache-control": "public, max-age=3600",
                        "content-type": CATALOG_TYPE,
                    },
                }),
        },
    },
});
