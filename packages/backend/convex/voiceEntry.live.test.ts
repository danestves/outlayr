/// <reference types="vite/client" />

// Opt-in: RUN_LIVE_MODEL_TESTS=1 plus ANTHROPIC_API_KEY and ELEVENLABS_API_KEY from `npx convex env get`. Record
// /tmp/voice-clip.m4a with `say --data-format=aac "Twelve fifty at Starbucks yesterday on the Amex"` and
// /tmp/voice-fix.m4a with "No, that was today, and put it under groceries".

import { readFile } from "node:fs/promises";

import agentTest from "@convex-dev/agent/test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vite-plus/test";

import { api } from "./_generated/api";
import { AI_CONSENT_VERSION } from "./lib/models";
import schema from "./schema";
import { authenticatedAs, seedProUser } from "./test.helpers";
import { PROPOSE_DRAFT_TOOL } from "./voiceEntry";
import type { ProposedDraft } from "./voiceEntry";

const modules = import.meta.glob("./**/*.ts");

const live =
    process.env.RUN_LIVE_MODEL_TESTS === "1" &&
    Boolean(process.env.ANTHROPIC_API_KEY) &&
    Boolean(process.env.ELEVENLABS_API_KEY);
const CLIP_PATH = process.env.VOICE_CLIP_PATH ?? "/tmp/voice-clip.m4a";
const FIX_PATH = process.env.VOICE_FIX_PATH ?? "/tmp/voice-fix.m4a";

async function clipBytes(path: string): Promise<ArrayBuffer> {
    const bytes = await readFile(path);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

interface Turn {
    order: number;
    parts: { output?: unknown; state?: string; type: string }[];
    role: string;
}

function draftAt(turns: Turn[], order: number): ProposedDraft | null {
    const answer = turns.find((turn) => turn.role === "assistant" && turn.order === order);
    const part = answer?.parts.find((p) => p.type === `tool-${PROPOSE_DRAFT_TOOL}` && p.state === "output-available");
    // SAFETY: the tool's `execute` returns a ProposedDraft; the part carries it as `output`.
    return (part?.output as ProposedDraft | undefined) ?? null;
}

describe.skipIf(!live)("voice thread, live", () => {
    it("a clip becomes a draft, and the next sentence corrects it in place", async () => {
        const t = convexTest(schema, modules);
        agentTest.register(t);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const asUser = authenticatedAs(t, await seedProUser(t));
        const { threadId } = await asUser.mutation(api.voiceEntry.startThread, {});
        if (threadId === null) {
            throw new Error("Expected a thread");
        }
        const context = {
            accounts: ["Amex", "Checking"],
            aiConsent: AI_CONSENT_VERSION,
            categoryTree: [
                { children: ["Coffee"], name: "Food" },
                { children: [], name: "Groceries" },
            ],
            currency: "USD",
            language: "en-US",
            threadId,
            today: "2026-09-03",
        };
        const page = { cursor: null, numItems: 20 };

        const first = await asUser.action(api.voiceEntry.speak, { ...context, audio: await clipBytes(CLIP_PATH) });
        expect(first.status).toBe("ok");
        expect(first.transcript?.toLowerCase()).toContain("starbucks");
        if (first.order === null) {
            return;
        }
        const afterFirst = await asUser.query(api.voiceEntry.listTurns, { paginationOpts: page, threadId });
        expect(draftAt(afterFirst.page, first.order)?.draft).toMatchObject({
            accountName: "Amex",
            amount: 12.5,
            date: "2026-09-02",
            domain: "starbucks.com",
            kind: "entry",
        });
        expect(draftAt(afterFirst.page, first.order)?.quotes).toContainEqual(
            expect.objectContaining({ field: "amount" })
        );

        const second = await asUser.action(api.voiceEntry.speak, { ...context, audio: await clipBytes(FIX_PATH) });
        expect(second.status).toBe("ok");
        if (second.order === null) {
            return;
        }
        const afterSecond = await asUser.query(api.voiceEntry.listTurns, { paginationOpts: page, threadId });
        expect(draftAt(afterSecond.page, second.order)?.draft).toMatchObject({
            accountName: "Amex",
            amount: 12.5,
            categoryName: "Groceries",
            date: "2026-09-03",
            kind: "entry",
        });
    }, 120_000);
});
