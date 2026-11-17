import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { serverTimingEntry } from "@/lib/server-timing";

const MODULE_PRELOAD = /rel=modulepreload/gu;

export default createServerEntry({
    async fetch(request) {
        const start = performance.now();
        const response = await handler.fetch(request, { responseLinkHeader: true });
        // A redirect's headers are immutable, so the response is rebuilt on a copy.
        const headers = new Headers(response.headers);
        const link = headers.get("link");
        if (link) {
            // Cloudflare sends these as a 103 Early Hints on the next visit, but only for preload and preconnect.
            headers.set("link", link.replaceAll(MODULE_PRELOAD, "rel=preload; crossorigin"));
        }
        headers.append("server-timing", serverTimingEntry("total", performance.now() - start));
        return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
    },
});
