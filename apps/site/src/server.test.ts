import { beforeEach, expect, it, vi } from "vite-plus/test";

const handlerFetch = vi.fn<(request: Request) => Promise<Response>>();

vi.mock("@tanstack/react-start/server-entry", () => ({
    createServerEntry: (entry: unknown) => entry,
    default: { fetch: (request: Request) => handlerFetch(request) },
}));

const { default: server } = await import("./server");

const PAGE = `<html><head><title>Outlayr</title></head><body>
<nav>Menu</nav>
<main><h1>Track every expense.</h1><span aria-hidden="true">Decoration</span><img class="dark-only" alt="Dark shot" src="/a.webp"/><dl class="grid"><dt class="label">Currencies</dt><dd>165, at the rate of the day</dd></dl><ul><li><div><p data-kicker>Calculators</p><h3><a href="/tools/split">Split expenses calculator</a></h3></div></li></ul><ul><li class="flex justify-between"><span class="flex gap-3"><svg></svg>Accounts</span><span class="font-mono">3</span></li></ul><p class="flex flex-wrap gap-2"><span>Spent</span> <span>$42.00</span><span>.</span></p><p class="flex"><span>Read</span><span><a href="/terms">Terms</a></span><span>Run</span><code>vp check</code></p></main>
<footer>Legal</footer>
</body></html>`;

beforeEach(() => {
    handlerFetch.mockReset();
    handlerFetch.mockImplementation(
        async () => new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } })
    );
});

it("serves the main content as markdown to a client that prefers it, even on a navigation", async () => {
    const response = await server.fetch(
        new Request("https://tryoutlayr.com/", {
            headers: { accept: "text/markdown", "sec-fetch-dest": "document" },
        })
    );
    const markdown = await response.text();

    expect(handlerFetch.mock.calls[0]?.[0].headers.get("accept")).toBe("text/html");
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("vary")).toContain("Accept");
    expect(markdown).toContain("# Track every expense.");
    expect(markdown).toContain("**Currencies**");
    expect(markdown).toContain("165, at the rate of the day");
    expect(markdown).not.toMatch(/<\/?d[dlt]\b/u);
    expect(markdown).toContain("### [Split expenses calculator](https://tryoutlayr.com/tools/split)");
    expect(markdown).not.toContain("Calculators");
    expect(markdown).toContain("- Accounts 3");
    expect(markdown).toContain("Spent $42.00.");
    expect(markdown).toContain("[Terms](https://tryoutlayr.com/terms)");
    expect(markdown).toContain("`vp check`");
    for (const hidden of ["Menu", "Decoration", "Dark shot", "Legal"]) {
        expect(markdown).not.toContain(hidden);
    }
});

it.each(["text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "*/*"])(
    "hands %s to the app untouched",
    async (accept) => {
        const request = new Request("https://tryoutlayr.com/", { headers: { accept } });
        await server.fetch(request);

        expect(handlerFetch).toHaveBeenCalledWith(request);
    }
);

it("keeps a page drawn for the visitor's country out of shared caches, unless the route set its own policy", async () => {
    const page = await server.fetch(new Request("https://tryoutlayr.com/", { headers: { accept: "text/html" } }));
    handlerFetch.mockImplementation(
        async () =>
            new Response(PAGE, {
                headers: { "cache-control": "public, max-age=3600", "content-type": "text/html; charset=utf-8" },
            })
    );
    const cached = await server.fetch(new Request("https://tryoutlayr.com/", { headers: { accept: "text/html" } }));

    expect(page.headers.get("cache-control")).toBe("private, no-cache");
    expect(await page.text()).toBe(PAGE);
    expect(cached.headers.get("cache-control")).toBe("public, max-age=3600");
});

it("puts the page's author and last update in the markdown front matter", async () => {
    const graph = JSON.stringify({
        "@graph": [{ "@id": "https://tryoutlayr.com/about#daniel-esteves", "@type": "Person", name: "Daniel Esteves" }],
    });
    const article = JSON.stringify({
        "@type": "Article",
        author: { "@id": "https://tryoutlayr.com/about#daniel-esteves" },
        dateModified: "2026-11-10",
    });
    handlerFetch.mockImplementation(
        async () =>
            new Response(
                PAGE.replace(
                    "</head>",
                    `<script type="application/ld+json">${graph}</script><script type="application/ld+json">${article}</script></head>`
                ),
                { headers: { "content-type": "text/html; charset=utf-8" } }
            )
    );
    const response = await server.fetch(
        new Request("https://tryoutlayr.com/guides/budget-planner", { headers: { accept: "text/markdown" } })
    );
    const [, frontMatter] = (await response.text()).split("---\n");

    expect(frontMatter).toContain("author: Daniel Esteves\n");
    expect(frontMatter).toContain("updated: 2026-11-10\n");
});
