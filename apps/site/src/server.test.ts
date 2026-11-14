import { beforeEach, expect, it, vi } from "vite-plus/test";

const handlerFetch = vi.fn<(request: Request) => Promise<Response>>();

vi.mock("@tanstack/react-start/server-entry", () => ({
    createServerEntry: (entry: unknown) => entry,
    default: { fetch: (request: Request) => handlerFetch(request) },
}));

const { default: server } = await import("./server");

const PAGE = `<html><head><title>Outlayr</title></head><body>
<nav>Menu</nav>
<main><h1>Track every expense.</h1><span aria-hidden="true">Decoration</span><img class="dark-only" alt="Dark shot" src="/a.webp"/><dl class="grid"><dt class="label">Currencies</dt><dd>165, at the rate of the day</dd></dl><ul><li><div><p data-kicker>Calculators</p><h3><a href="/tools/split">Split expenses calculator</a></h3></div></li></ul></main>
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
