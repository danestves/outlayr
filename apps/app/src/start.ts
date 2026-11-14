import { redirect } from "@tanstack/react-router";
import { createMiddleware, createStart } from "@tanstack/react-start";

const WWW = /^www\./u;
const LEGACY_PREFIX = /^\/app(?=\/|$)/u;
const LEADING_SLASHES = /^[/\\]+/u;

const canonicalUrl = createMiddleware().server(({ next, request }) => {
    const url = new URL(request.url);
    const host = request.headers.get("host") ?? url.host;
    const insecure = request.headers.get("cf-visitor")?.includes('"scheme":"http"') ?? false;
    const path = (url.pathname.replace(LEGACY_PREFIX, "") || "/").replace(LEADING_SLASHES, "/");
    if (!insecure && !WWW.test(host) && path === url.pathname) {
        return next();
    }
    const origin = insecure || WWW.test(host) ? `https://${host.replace(WWW, "")}` : "";
    throw redirect({ href: `${origin}${path}${url.search}`, statusCode: 301 });
});

export const startInstance = createStart(() => ({ requestMiddleware: [canonicalUrl] }));
