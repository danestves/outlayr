import { htmlToMarkdown } from "@mdream/js";
import { clean } from "@mdream/js/clean";
import { negotiateContent } from "@mdream/js/negotiate";
import { filterPlugin, frontmatterPlugin, isolateMainPlugin } from "@mdream/js/plugins";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import * as Effect from "effect/Effect";

import { SITE_URL } from "./lib/site";

const HIDDEN = [
    "aside",
    "embed",
    "fieldset",
    "footer",
    "iframe",
    "input",
    "nav",
    "object",
    "select",
    "textarea",
    '[aria-hidden="true"]',
    "[data-fields]",
    "[data-kicker]",
    ".dark-only",
];

const DEFINITION_LIST: readonly (readonly [RegExp, string])[] = [
    [/<\/?dl\b[^>]*>/gu, ""],
    [/<dt\b[^>]*>/gu, "<p><strong>"],
    [/<\/dt>/gu, "</strong></p>"],
    [/<dd\b[^>]*>/gu, "<p>"],
    [/<\/dd>/gu, "</p>"],
];

function flattenDefinitions(html: string): string {
    return DEFINITION_LIST.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), html);
}

function toMarkdown(html: string): string {
    return htmlToMarkdown(flattenDefinitions(html), {
        clean: clean(),
        origin: SITE_URL,
        plugins: [frontmatterPlugin(), isolateMainPlugin(), filterPlugin({ exclude: HIDDEN })],
    });
}

type ServerEntryFetch = typeof handler.fetch;

const respond = Effect.fn("Server.respond")(function* respond(request: Request, opts: Parameters<ServerEntryFetch>[1]) {
    const wanted = negotiateContent(request.headers.get("accept") ?? undefined);
    const bodiless = request.method === "GET" || request.method === "HEAD";
    if (wanted !== "markdown" || !bodiless) {
        return yield* Effect.promise(async () => handler.fetch(request, opts));
    }
    const htmlHeaders = new Headers(request.headers);
    htmlHeaders.set("accept", "text/html");
    const htmlRequest = new Request(request.url, {
        headers: htmlHeaders,
        method: request.method,
        signal: request.signal,
    });
    const response = yield* Effect.promise(async () => handler.fetch(htmlRequest, opts));
    if (!response.headers.get("content-type")?.startsWith("text/html")) {
        return response;
    }
    const headers = new Headers(response.headers);
    headers.set("content-type", "text/markdown; charset=utf-8");
    headers.delete("content-length");
    headers.append("vary", "Accept");
    const html = yield* Effect.promise(() => response.text());
    return new Response(toMarkdown(html), { headers, status: response.status });
});

export default createServerEntry({
    fetch: (request, opts) => Effect.runPromise(respond(request, opts)),
});
