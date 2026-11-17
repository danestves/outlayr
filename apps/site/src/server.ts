import { htmlToMarkdown } from "@mdream/js";
import type { ElementNode } from "@mdream/js";
import { clean } from "@mdream/js/clean";
import { negotiateContent } from "@mdream/js/negotiate";
import { createPlugin, filterPlugin, frontmatterPlugin, isolateMainPlugin } from "@mdream/js/plugins";
import { SITE_URL } from "@outlayr/shared/urls";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

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

const LAYOUT = /(?:^|\s)(?:[a-z0-9]+:)*(?:inline-)?(?:flex|grid)(?=\s|$)/u;
const INLINE = new Set([
    "a",
    "abbr",
    "b",
    "code",
    "data",
    "em",
    "i",
    "kbd",
    "label",
    "mark",
    "s",
    "small",
    "span",
    "strong",
    "sub",
    "sup",
    "time",
    "u",
]);
const OPENS_WITH_GAP = /^[\s.,;:!?)]/u;
const ENDS_WITH_GAP = /\s$/u;

function isLayout(element: ElementNode | null | undefined) {
    return LAYOUT.test(element?.attributes.class ?? "");
}

// A flex or grid container lays out "<span>Accounts</span><span>3</span>" as two cells, but markdown would join them.
// Links are left alone because the space would land inside their brackets.
const layoutGaps = createPlugin(() => {
    const pending = new WeakSet<ElementNode>();
    const holdsText = new WeakSet<ElementNode>();
    let last = "";
    return {
        processAttributes(node) {
            if (node.index > 0 && node.name !== "a" && INLINE.has(node.name) && isLayout(node.parent)) {
                pending.add(node);
            }
        },
        processTextNode(node) {
            let item: ElementNode | undefined;
            for (let element = node.parent; element && !item; element = element.parent) {
                if (pending.delete(element)) {
                    item = element;
                }
            }
            const gap =
                item?.parent != null &&
                holdsText.has(item.parent) &&
                !ENDS_WITH_GAP.test(last) &&
                !OPENS_WITH_GAP.test(node.value);
            let inline = true;
            for (let element = node.parent; element && inline; element = element.parent) {
                if (isLayout(element)) {
                    holdsText.add(element);
                }
                inline = INLINE.has(element.name);
            }
            if (node.value !== "") {
                last = node.value;
            }
            return gap ? { content: ` ${node.value}`, skip: false } : undefined;
        },
    };
});

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

const LD_JSON = /<script\b[^>]*type="application\/ld\+json"[^>]*>([^<]*)<\/script>/gu;

const LinkedNode = Schema.Struct({
    "@id": Schema.optional(Schema.String),
    author: Schema.optional(Schema.Struct({ "@id": Schema.String })),
    dateModified: Schema.optional(Schema.String),
    name: Schema.optional(Schema.String),
});

const decodeLinkedData = Schema.decodeUnknownOption(
    Schema.fromJsonString(Schema.Union([Schema.Struct({ "@graph": Schema.Array(LinkedNode) }), LinkedNode]))
);

// The byline and date render in the body, which the front matter never sees, so read them from the page's JSON-LD.
function bylineFields(html: string) {
    const nodes = [...html.matchAll(LD_JSON)]
        .flatMap(([, json]) => Option.toArray(decodeLinkedData(json)))
        .flatMap((block) => ("@graph" in block ? block["@graph"] : [block]));
    const authorId = nodes.find((node) => node.author)?.author?.["@id"];
    const author = authorId === undefined ? undefined : nodes.find((node) => node["@id"] === authorId)?.name;
    const updated = nodes.find((node) => node.dateModified)?.dateModified;
    const fields: Record<string, string> = {};
    if (author !== undefined) {
        fields.author = author;
    }
    if (updated !== undefined) {
        fields.updated = updated;
    }
    return fields;
}

function toMarkdown(html: string): string {
    return htmlToMarkdown(flattenDefinitions(html), {
        clean: clean(),
        origin: SITE_URL,
        plugins: [
            frontmatterPlugin({ additionalFields: bylineFields(html) }),
            isolateMainPlugin(),
            filterPlugin({ exclude: HIDDEN }),
            layoutGaps,
        ],
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
