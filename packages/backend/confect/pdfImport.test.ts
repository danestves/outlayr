/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import { MockLanguageModelV3 } from "ai/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { perUserBurst } from "./lib/limits";
import { runEdge } from "./lib/runEdge";
import { chunkPages, joinPageLines, rateLimiter, readStatement, redactStatementText } from "./pdfImport";
import { PDF_CONTENT_TYPE } from "./pdfImport.spec";
import { authenticatedAs, grantPro, seedAuthUser, statementPdf } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

const STATEMENT = statementPdf([
    ["BANCO EJEMPLO", "Cuenta ES91 2100 0418 4502 0005 1332", "Tarjeta 4111 1111 1111 1234"],
    ["Periodo", "01/03/2026 - 31/03/2026", "Saldo anterior 1.250,00"],
    ["03/03", "STARBUCKS CENTRO REF 998877665544", "-12,50"],
    ["05/03", "NOMINA ACME", "2.000,00"],
    ["09/03", "FARMACIA SAAS", "-8,20"],
    ["12/03", "SUPERMERCADO LA PLAZA", "-41,95"],
    ["15/03", "CORPOELEC FACTURA", "-20,00"],
    ["Pagina 1 de 1", "Saldo final 3.067,35", ""],
]);

const ROWS = [
    { amount: -12.5, currency: "EUR", date: "2026-03-03", label: "STARBUCKS CENTRO" },
    { amount: 2000, currency: null, date: "2026-03-05", label: "NOMINA ACME" },
];

function generate(text: string) {
    return {
        content: [{ text, type: "text" as const }],
        finishReason: { raw: undefined, unified: "stop" as const },
        usage: {
            inputTokens: { cacheRead: undefined, cacheWrite: undefined, noCache: undefined, total: undefined },
            outputTokens: { reasoning: undefined, text: undefined, total: undefined },
        },
        warnings: [],
    };
}

function mockModel(text: string) {
    return new MockLanguageModelV3({ doGenerate: async () => generate(text) });
}

const CONTEXT = { regionCode: "ES", today: "2026-04-02" };

const read = (model: MockLanguageModelV3, bytes: Uint8Array = STATEMENT) =>
    runEdge(readStatement(model, new Uint8Array(bytes), CONTEXT));

function promptOf(model: MockLanguageModelV3, call = 0): string {
    return JSON.stringify(model.doGenerateCalls[call]?.prompt);
}

describe(redactStatementText, () => {
    it.each([
        ["an IBAN", "IBAN ES91 2100 0418 4502 0005 1332 titular", "IBAN ****1332 titular"],
        ["a compact IBAN", "DE89370400440532013000", "****3000"],
        ["an IBAN with text glued to it", "ES91 2100 0418 4502 0005 1332Tarjeta", "****1332Tarjeta"],
        ["an IBAN followed by a word", "ES91 2100 0418 4502 0005 1332 COMPRA", "****1332 COMPRA"],
        ["a card with text glued to it", "4111 1111 1111 1234Visa", "****1234Visa"],
        ["a card", "Tarjeta 4111 1111 1111 1234", "Tarjeta ****1234"],
        ["a dashed card", "4111-1111-1111-1234", "****1234"],
        ["an Amex card", "3782 822463 10005", "****0005"],
        ["a long reference", "REF 998877665544", "REF ****5544"],
    ])("masks %s and keeps its last four", (_name, input, expected) => {
        expect(redactStatementText(input)).toBe(expected);
    });

    it.each([
        "03/03/2026 COMPRA -12,50",
        "20260303 TRANSFERENCIA",
        "1.234.567,89",
        "1234567890,50",
        "123456789.00",
        "AB12 FOOD MART",
        "12 345 678,90",
    ])("leaves %s alone, since the model needs dates and amounts", (input) => {
        expect(redactStatementText(input)).toBe(input);
    });
});

describe(joinPageLines, () => {
    it("rebuilds table rows from separately positioned cells, top to bottom", () => {
        const lines = joinPageLines([
            { str: "NOMINA", width: 30, x: 100, y: 680 },
            { str: "-12,50", width: 20, x: 300, y: 700 },
            { str: "03/03", width: 20, x: 40, y: 700.5 },
            { str: "STARBUCKS", width: 50, x: 100, y: 700 },
            { str: "Banco", width: 30, x: 40, y: 760 },
        ]).split("\n");

        expect(lines.map((line) => line.trim().split(/\s+/).join(" "))).toStrictEqual([
            "Banco",
            "03/03 STARBUCKS -12,50",
            "NOMINA",
        ]);
    });

    it("keeps an amount under its column, so a debit and a credit read differently", () => {
        const row = (column: number) =>
            joinPageLines([
                { str: "03/03", width: 20, x: 40, y: 700 },
                { str: "12,50", width: 20, x: column, y: 700 },
            ]);
        const debitAt = 300;
        const creditAt = 400;

        expect(row(debitAt).indexOf("12,50")).toBeLessThan(row(creditAt).indexOf("12,50"));
    });

    it("keeps a word whose glyphs were drawn in two runs whole", () => {
        expect(
            joinPageLines([
                { str: "STAR", width: 20, x: 100, y: 700 },
                { str: "BUCKS", width: 20, x: 120, y: 700 },
            ]).trim()
        ).toBe("STARBUCKS");
    });
});

describe(chunkPages, () => {
    it("keeps a page whole and never drops one", () => {
        const pages = ["a".repeat(8000), "b".repeat(8000), "c".repeat(20_000), "d".repeat(10)];
        const chunks = chunkPages(pages);
        expect(chunks).toHaveLength(4);
        expect(chunks.join("\n").replaceAll("\n", "")).toBe(pages.join(""));
    });
});

describe(readStatement, () => {
    it("sends the statement's lines with long numbers masked", async () => {
        const model = mockModel(JSON.stringify({ rows: ROWS }));

        await read(model);

        const prompt = promptOf(model);
        expect(prompt).toMatch(/03\/03\s+STARBUCKS CENTRO REF \*{4}5544\s+-12,50/);
        expect(prompt).toContain("****1332");
        expect(prompt).toContain("****1234");
        for (const leak of ["2100 0418", "4111 1111", "998877665544"]) {
            expect(prompt).not.toContain(leak);
        }
    });

    it("returns the rows it could read and drops the rest", async () => {
        const model = mockModel(
            JSON.stringify({
                rows: [
                    ...ROWS,
                    { amount: -1, currency: null, date: "2026-02-31", label: "Impossible day" },
                    { amount: -1, currency: null, date: "2027-01-01", label: "Future" },
                    { amount: 0, currency: null, date: "2026-03-09", label: "Saldo anterior" },
                    { amount: null, currency: null, date: "2026-03-09", label: "No amount" },
                    { amount: -5, currency: null, date: "2026-03-09", label: "   " },
                    { amount: -5, currency: "euro", date: "2026-03-09", label: "Bad currency" },
                ],
            })
        );

        await expect(read(model)).resolves.toStrictEqual({
            rows: [...ROWS, { amount: -5, currency: null, date: "2026-03-09", label: "Bad currency" }],
            status: "ok",
        });
    });

    it("refuses a statement over the row cap instead of importing part of it", async () => {
        const rows = Array.from({ length: 2001 }, () => ROWS[0]);

        await expect(read(mockModel(JSON.stringify({ rows })))).resolves.toStrictEqual({ status: "invalid" });
    });

    it("answers invalidResponse when the model's output has the wrong shape", async () => {
        await expect(read(mockModel(JSON.stringify({ transactions: [] })))).resolves.toStrictEqual({
            status: "invalidResponse",
        });
        await expect(read(mockModel("not json"))).resolves.toStrictEqual({ status: "invalidResponse" });
    });

    it("answers providerError when the model call fails", async () => {
        const model = new MockLanguageModelV3({
            doGenerate: async () => {
                throw new Error("overloaded");
            },
        });

        await expect(read(model)).resolves.toStrictEqual({ status: "providerError" });
    });

    it("fails the whole read when one chunk fails, since a partial statement looks complete", async () => {
        let calls = 0;
        const model = new MockLanguageModelV3({
            doGenerate: async () => {
                calls += 1;
                if (calls === 2) {
                    throw new Error("overloaded");
                }
                return generate(JSON.stringify({ rows: ROWS }));
            },
        });
        const fullPage = Array.from({ length: 50 }, (_, line) => [
            `0${(line % 9) + 1}/03`,
            `COMERCIO NUMERO ${line} CON UNA DESCRIPCION BASTANTE LARGA PARA LLENAR LA PAGINA ENTERA DEL EXTRACTO`,
            "-1,00",
        ]);

        await expect(read(model, statementPdf(fullPage, 3))).resolves.toStrictEqual({ status: "providerError" });
        expect(calls).toBeGreaterThan(1);
    });

    it("gives a later chunk the statement's header, so its yearless dates can resolve", async () => {
        const model = mockModel(JSON.stringify({ rows: ROWS }));
        const fullPage = Array.from({ length: 50 }, (_, line) => [
            `0${(line % 9) + 1}/03`,
            `COMERCIO NUMERO ${line} CON UNA DESCRIPCION BASTANTE LARGA PARA LLENAR LA PAGINA ENTERA DEL EXTRACTO`,
            "-1,00",
        ]);

        await read(model, statementPdf(fullPage, 3));

        expect(model.doGenerateCalls.length).toBeGreaterThan(1);
        expect(promptOf(model, 0)).not.toContain("statement_header");
        expect(promptOf(model, 1)).toContain("statement_header");
    });

    it("answers extractionFailed when the text layer is too thin to be a statement", async () => {
        const model = mockModel(JSON.stringify({ rows: ROWS }));

        await expect(read(model, statementPdf([["Scanned page"]]))).resolves.toStrictEqual({
            status: "extractionFailed",
        });
        expect(model.doGenerateCalls).toHaveLength(0);
    });

    it("answers extractionFailed for a file that is not a PDF", async () => {
        const model = mockModel(JSON.stringify({ rows: ROWS }));

        await expect(read(model, new TextEncoder().encode("date,amount\n"))).resolves.toStrictEqual({
            status: "extractionFailed",
        });
    });

    it("answers extractionFailed when the model finds no transaction", async () => {
        await expect(read(mockModel(JSON.stringify({ rows: [] })))).resolves.toStrictEqual({
            status: "extractionFailed",
        });
    });
});

const CATEGORY_TREE = [{ children: ["Coffee"], name: "Food" }];

function anthropicReply(payload: unknown) {
    return Response.json({
        content: [{ text: JSON.stringify(payload), type: "text" }],
        id: "msg",
        model: "test",
        role: "assistant",
        stop_reason: "end_turn",
        type: "message",
        usage: { input_tokens: 1, output_tokens: 1 },
    });
}

/** Answers a statement chunk with `rows` and a classification with `mapping`, recording each request body. */
function stubAnthropic(rows: unknown[], mapping: unknown[]) {
    const bodies: string[] = [];
    vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: string, init?: RequestInit) => {
            const body = String(init?.body);
            bodies.push(body);
            return anthropicReply(body.includes("<statement>") ? { rows } : { mapping });
        })
    );
    return bodies;
}

async function setup({ pro = true } = {}) {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
    vi.stubEnv("POSTHOG_API_KEY", "");
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    const identity = await seedAuthUser(t);
    if (pro) {
        await grantPro(t, identity);
    }
    const asUser = authenticatedAs(t, identity);
    const upload = (bytes: Uint8Array = STATEMENT, type = PDF_CONTENT_TYPE) =>
        t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(bytes)], { type })));
    const args = (storageId: Awaited<ReturnType<typeof upload>>) => ({
        aiConsent: AI_CONSENT_VERSION,
        categoryTree: CATEGORY_TREE,
        storageId,
        today: "2026-04-02",
    });
    const stored = (storageId: Awaited<ReturnType<typeof upload>>) =>
        t.run(async (ctx) => (await ctx.storage.get(storageId)) !== null);
    return { args, asUser, identity, stored, t, upload };
}

describe("pdfImport.extract", () => {
    it("reads the statement, suggests categories and deletes the file", async () => {
        const { args, asUser, stored, upload } = await setup();
        const bodies = stubAnthropic(ROWS, [{ categoryName: "Coffee", label: "STARBUCKS CENTRO" }]);
        const storageId = await upload();

        await expect(asUser.action(api.pdfImport.extract, args(storageId))).resolves.toStrictEqual({
            rows: ROWS,
            status: "ok",
            suggestions: [{ categoryName: "Coffee", domain: null, label: "STARBUCKS CENTRO" }],
        });
        await expect(stored(storageId)).resolves.toBeFalsy();
        expect(bodies).toHaveLength(2);
    });

    it("answers a known merchant from merchantKnowledge on a second import, without classifying", async () => {
        const { args, asUser, t, upload } = await setup();
        await t.run(async (ctx) => {
            for (const key of ["starbucks centro", "nomina acme"]) {
                await ctx.db.insert("merchantKnowledge", {
                    categoryName: "Coffee",
                    domain: "example.com",
                    emoji: "☕",
                    key,
                    modelId: "test-model",
                    parentCategoryName: null,
                    resolvedAt: Date.now(),
                    tags: [],
                });
            }
        });
        const bodies = stubAnthropic(ROWS, []);

        const reply = await asUser.action(api.pdfImport.extract, args(await upload()));

        expect(reply.status).toBe("ok");
        expect(reply.suggestions).toHaveLength(2);
        expect(bodies).toHaveLength(1);
    });

    it("keeps the rows and flags degraded when only the classification fails", async () => {
        const { args, asUser, upload } = await setup();
        vi.stubGlobal(
            "fetch",
            vi.fn(async (_url: string, init?: RequestInit) =>
                String(init?.body).includes("<statement>")
                    ? anthropicReply({ rows: ROWS })
                    : new Response("overloaded", { status: 529 })
            )
        );

        await expect(asUser.action(api.pdfImport.extract, args(await upload()))).resolves.toStrictEqual({
            degraded: true,
            rows: ROWS,
            status: "ok",
            suggestions: [],
        });
    });

    it("deletes the statement when the read fails too", async () => {
        const { args, asUser, stored, upload } = await setup();
        stubAnthropic([], []);
        const storageId = await upload();

        await expect(asUser.action(api.pdfImport.extract, args(storageId))).resolves.toMatchObject({
            status: "extractionFailed",
        });
        await expect(stored(storageId)).resolves.toBeFalsy();
    });

    it("refuses another stored file without deleting it", async () => {
        const { args, asUser, stored, upload } = await setup();
        const fetch = vi.fn();
        vi.stubGlobal("fetch", fetch);
        const photo = await upload(new Uint8Array([1, 2, 3]), "image/jpeg");

        await expect(asUser.action(api.pdfImport.extract, args(photo))).resolves.toMatchObject({ status: "invalid" });
        await expect(stored(photo)).resolves.toBeTruthy();
        expect(fetch).not.toHaveBeenCalled();
    });

    it("refuses a signed-out caller", async () => {
        const { args, t, upload } = await setup();

        await expect(t.action(api.pdfImport.extract, args(await upload()))).resolves.toMatchObject({
            status: "unauthenticated",
        });
    });

    it("sends nothing from a build without the current AI consent", async () => {
        const { args, asUser, upload } = await setup();
        const fetch = vi.fn();
        vi.stubGlobal("fetch", fetch);
        const { aiConsent: _consent, ...oldBuild } = args(await upload());

        await expect(asUser.action(api.pdfImport.extract, oldBuild)).resolves.toMatchObject({
            status: "notConfigured",
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it("refuses a free user before a token is spent", async () => {
        const { args, asUser, upload } = await setup({ pro: false });
        const limitSpy = vi.spyOn(rateLimiter, "limit");

        await expect(asUser.action(api.pdfImport.extract, args(await upload()))).resolves.toMatchObject({
            status: "notEntitled",
        });
        expect(limitSpy).not.toHaveBeenCalled();
    });

    it("stops at the per-user bucket, whose refill is a fraction of a token an hour", async () => {
        const { args, asUser, upload } = await setup();
        const bodies = stubAnthropic(ROWS, []);
        const burst = await runEdge(perUserBurst("pdfImport", true));

        for (let index = 0; index < burst.capacity; index += 1) {
            const reply = await asUser.action(api.pdfImport.extract, args(await upload()));
            expect(reply.status).toBe("ok");
        }
        const spent = bodies.length;

        await expect(asUser.action(api.pdfImport.extract, args(await upload()))).resolves.toMatchObject({
            status: "rateLimited",
        });
        expect(bodies).toHaveLength(spent);
    });

    it("stops at the global window", async () => {
        const { args, asUser, upload } = await setup();
        const limitSpy = vi
            .spyOn(rateLimiter, "limit")
            .mockImplementation(async (_ctx, name) =>
                name === "pdfImportGlobal" ? { ok: false, retryAfter: 1000 } : { ok: true, retryAfter: undefined }
            );

        await expect(asUser.action(api.pdfImport.extract, args(await upload()))).resolves.toMatchObject({
            status: "rateLimited",
        });
        expect(limitSpy).not.toHaveBeenCalledWith(expect.anything(), "pdfImportPerUser", expect.anything());
    });
});

describe("pdfImport.requestUpload", () => {
    it("gives a Pro user a url and schedules the sweep for an abandoned upload", async () => {
        const { asUser, t } = await setup();

        await expect(asUser.mutation(api.pdfImport.requestUpload, {})).resolves.toMatchObject({ status: "ok" });

        const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
        expect(scheduled.filter((row) => row.name.includes("sweepUploads"))).toHaveLength(1);
    });

    it("stops minting urls for a client that keeps uploading without extracting", async () => {
        const { asUser } = await setup();

        for (let index = 0; index < 30; index += 1) {
            const ticket = await asUser.mutation(api.pdfImport.requestUpload, {});
            expect(ticket.status).toBe("ok");
        }

        await expect(asUser.mutation(api.pdfImport.requestUpload, {})).resolves.toStrictEqual({
            status: "rateLimited",
            url: null,
        });
    });

    it("refuses a free user before anything can be uploaded", async () => {
        const { asUser } = await setup({ pro: false });

        await expect(asUser.mutation(api.pdfImport.requestUpload, {})).resolves.toStrictEqual({
            status: "notEntitled",
            url: null,
        });
    });
});

describe("pdfImport.sweepUploads", () => {
    it("deletes abandoned statements in the window and no other file", async () => {
        const { stored, t, upload } = await setup();
        const statement = await upload();
        const photo = await upload(new Uint8Array([1]), "image/jpeg");

        await t.mutation(internal.pdfImport.sweepUploads, { from: 0, to: Date.now() + 1000 });

        await expect(stored(statement)).resolves.toBeFalsy();
        await expect(stored(photo)).resolves.toBeTruthy();
    });

    it("leaves a statement uploaded outside its window", async () => {
        const { stored, t, upload } = await setup();
        const statement = await upload();

        await t.mutation(internal.pdfImport.sweepUploads, { from: 0, to: 1000 });

        await expect(stored(statement)).resolves.toBeTruthy();
    });
});
