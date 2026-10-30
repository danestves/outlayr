import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/badges/product-hunt.svg")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const theme = new URL(request.url).searchParams.get("theme") === "dark" ? "dark" : "light";
                const upstream = await fetch(
                    `https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1297830&theme=${theme}`
                );
                if (!upstream.ok) {
                    return new Response(null, { status: 502 });
                }
                return new Response(await upstream.text(), { headers: { "content-type": "image/svg+xml" } });
            },
        },
    },
});
