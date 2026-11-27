import { linkPrefix, localeFromParam } from "@outlayr/shared/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { validatePrefix } from "intlayer";

import { downloadTarget } from "@/lib/download";

const HEADERS = { "cache-control": "no-store", vary: "User-Agent", "x-robots-tag": "noindex" };

export const Route = createFileRoute("/{-$locale}/download")({
    server: {
        handlers: {
            GET: ({ params, request }) => {
                const { isValid, localePrefix } = validatePrefix(params.locale);
                if (!isValid || localePrefix !== params.locale) {
                    return new Response(null, { status: 404 });
                }
                const { searchParams } = new URL(request.url);
                const prefix = linkPrefix("/", localeFromParam(params.locale));
                const home = prefix === undefined ? "/" : `/${prefix}`;
                const location = downloadTarget(request.headers.get("user-agent") ?? "", searchParams, home);
                return new Response(null, { headers: { ...HEADERS, location }, status: 302 });
            },
        },
    },
});
