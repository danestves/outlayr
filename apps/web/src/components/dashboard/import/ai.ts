import { api } from "@outlayr/backend/convex/_generated/api";
import type { Id } from "@outlayr/backend/convex/_generated/dataModel";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { liveCategories } from "@/lib/category-writes";
import { convexClient } from "@/lib/convex";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import type { Suggestion } from "@/lib/import-file";

export const MAX_ASKED = 200;

export type AiRefusal = "aiOff" | "offline" | "providerError" | "rateLimited" | "timeout";

export type AiAnswer = { ok: true; suggestions: readonly Suggestion[] } | { ok: false; reason: AiRefusal };

export function categoryTree(books: Ledger["books"]) {
    const live = liveCategories(books.categories).filter((row) => row.name !== null);
    return live
        .filter((row) => row.parentId === null)
        .map((row) => ({
            children: live.flatMap((child) => (child.parentId === row.localId && child.name ? [child.name] : [])),
            name: row.name ?? "",
        }));
}

const offline = () => globalThis.navigator?.onLine === false;

function refusal(status: string): AiRefusal {
    if (status === "rateLimited") {
        return "rateLimited";
    }
    return status === "notConfigured" ? "aiOff" : "providerError";
}

export async function askSuggestions(labels: readonly string[], books: Ledger["books"]): Promise<AiAnswer> {
    if (offline()) {
        return { ok: false, reason: "offline" };
    }
    try {
        const reply = await convexClient().action(api.csvImport.csvImport, {
            aiConsent: AI_CONSENT_VERSION,
            categoryTree: categoryTree(books),
            labels: [...labels],
        });
        return reply.status === "ok"
            ? { ok: true, suggestions: reply.suggestions ?? [] }
            : { ok: false, reason: refusal(reply.status) };
    } catch {
        return { ok: false, reason: offline() ? "offline" : "providerError" };
    }
}

const decodeReceipt = Schema.decodeUnknownOption(Schema.Struct({ storageId: Schema.String }));

export type PdfRefusal = "aiOff" | "notRead" | "offline" | "overLimit" | "service";

export type PdfAnswer =
    | {
          ok: true;
          rows: readonly { amount: number; currency: string | null; date: string; label: string }[];
          suggestions: readonly Suggestion[];
      }
    | { ok: false; reason: PdfRefusal };

function pdfRefusal(status: string): PdfRefusal {
    switch (status) {
        case "rateLimited": {
            return "overLimit";
        }
        case "notConfigured": {
            return "aiOff";
        }
        case "extractionFailed":
        case "invalid": {
            return "notRead";
        }
        default: {
            return "service";
        }
    }
}

const PDF_TYPE = "application/pdf";

export async function readStatement(
    file: File,
    books: Ledger["books"],
    today: string,
    onPhase: (phase: "reading" | "uploading") => void
): Promise<PdfAnswer> {
    if (offline()) {
        return { ok: false, reason: "offline" };
    }
    try {
        const client = convexClient();
        onPhase("uploading");
        const ticket = await client.mutation(api.pdfImport.requestUpload, {});
        if (ticket.status !== "ok" || ticket.url === null) {
            return { ok: false, reason: ticket.status === "rateLimited" ? "overLimit" : "service" };
        }
        const sent = await fetch(ticket.url, { body: file, headers: { "Content-Type": PDF_TYPE }, method: "POST" });
        const receipt = sent.ok ? decodeReceipt(await sent.json()) : Option.none();
        const storageId = Option.getOrNull(receipt)?.storageId ?? null;
        if (storageId === null) {
            return { ok: false, reason: "service" };
        }
        onPhase("reading");
        const reply = await client.action(api.pdfImport.extract, {
            aiConsent: AI_CONSENT_VERSION,
            categoryTree: categoryTree(books),
            // SAFETY: the upload URL answers with the id of the file it stored, in Convex's own `_storage` table.
            storageId: storageId as Id<"_storage">,
            today,
        });
        if (reply.status !== "ok" || reply.rows === null) {
            return { ok: false, reason: pdfRefusal(reply.status) };
        }
        return { ok: true, rows: reply.rows, suggestions: reply.suggestions ?? [] };
    } catch {
        return { ok: false, reason: offline() ? "offline" : "service" };
    }
}
