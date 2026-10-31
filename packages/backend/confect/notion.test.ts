/// <reference types="vite/client" />

import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { authenticatedAs, grantPro, linkNotionAccount, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

const LEDGER = "ledger-source";
const CATEGORIES = "categories-source";

const title = (text: string) => ({ title: [{ plain_text: text }], type: "title" });

const ledgerSource = {
    id: LEDGER,
    object: "data_source",
    properties: {
        Amount: { type: "number" },
        Category: { relation: { data_source_id: CATEGORIES }, type: "relation" },
        Date: { type: "date" },
        Name: { type: "title" },
        Total: { type: "formula" },
    },
    title: [{ plain_text: "Expenses" }],
};

const ledgerPage = {
    id: "page-1",
    object: "page",
    properties: {
        Amount: { number: -86.42, type: "number" },
        Category: { relation: [{ id: "category-groceries" }], type: "relation" },
        Date: { date: { end: null, start: "2026-10-03T19:30:00.000-04:00" }, type: "date" },
        Name: title("Trader Joe's"),
        Total: { formula: { number: 86.42, type: "number" }, type: "formula" },
    },
};

const list = (results: unknown[]) => ({ has_more: false, next_cursor: null, object: "list", results });

function stubNotion(status = 200) {
    const fetchMock = vi.fn(async (input: URL | string) => {
        const url = String(input);
        if (status !== 200) {
            return Response.json({ code: "unauthorized" }, { status });
        }
        if (url.endsWith(`/data_sources/${LEDGER}`)) {
            return Response.json(ledgerSource);
        }
        if (url.endsWith(`/data_sources/${LEDGER}/query`)) {
            return Response.json(list([ledgerPage]));
        }
        if (url.endsWith(`/data_sources/${CATEGORIES}/query`)) {
            return Response.json(
                list([{ id: "category-groceries", object: "page", properties: { Name: title("Groceries") } }])
            );
        }
        return Response.json({ code: "object_not_found" }, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

async function connectedOwner({ pro }: { pro: boolean }) {
    vi.stubEnv("NOTION_CLIENT_ID", "notion-client");
    vi.stubEnv("NOTION_CLIENT_SECRET", "notion-secret");
    const t = convexTest(schema, modules);
    revenuecatTest.register(t);
    const owner = await seedAuthUser(t);
    if (pro) {
        await grantPro(t, owner);
    }
    await linkNotionAccount(t, owner.userId);
    return { asOwner: authenticatedAs(t, owner), t };
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("Notion tables", () => {
    it("turns Notion rows into the cells the import reads, related names included", async () => {
        stubNotion();
        const { asOwner } = await connectedOwner({ pro: true });

        const [table] = await asOwner.action(api.notion.tables, { ids: [LEDGER] });

        expect(table).toStrictEqual({
            header: ["Name", "Amount", "Category", "Date", "Total"],
            rows: [["Trader Joe's", "-86.42", "Groceries", "2026-10-03 19:30:00", "86.42"]],
            title: "Expenses",
            truncated: false,
        });
    });

    it("asks a free account for Pro before it calls Notion", async () => {
        const fetchMock = stubNotion();
        const { asOwner } = await connectedOwner({ pro: false });

        await expect(asOwner.action(api.notion.tables, { ids: [LEDGER] })).rejects.toThrow("PRO_REQUIRED");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("drops a connection Notion no longer honors, so the app shows it disconnected", async () => {
        stubNotion(401);
        const { asOwner } = await connectedOwner({ pro: true });

        await expect(asOwner.action(api.notion.tables, { ids: [LEDGER] })).rejects.toThrow("NOTION_REVOKED");
        await expect(asOwner.query(api.notion.connected, {})).resolves.toBeFalsy();
    });
});
