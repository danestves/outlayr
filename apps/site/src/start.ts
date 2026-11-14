import { APP_URL } from "@outlayr/shared/urls";
import { redirect } from "@tanstack/react-router";
import { createMiddleware, createStart } from "@tanstack/react-start";

const WWW = /^www\./u;
const TRAILING_SLASH = /(.)\/+$/u;
const SERVER_FN_PREFIX = "/_serverFn/";
const APP_PAGE = /^\/(?:app(?:\/|$)|login$|connect$)/u;
const APP_PREFIX = /^\/app/u;

const canonicalUrl = createMiddleware().server(({ next, request }) => {
    const url = new URL(request.url);
    if (APP_PAGE.test(url.pathname)) {
        throw redirect({
            href: `${APP_URL}${url.pathname.replace(APP_PREFIX, "") || "/"}${url.search}`,
            statusCode: 301,
        });
    }
    const host = request.headers.get("host") ?? url.host;
    const insecure = request.headers.get("cf-visitor")?.includes('"scheme":"http"') ?? false;
    const lower = url.pathname.toLowerCase().replace(TRAILING_SLASH, "$1");
    const canonicalPath = lower === "/policy" ? "/privacy" : lower;
    const path = url.pathname.startsWith(SERVER_FN_PREFIX) ? url.pathname : canonicalPath;
    if (!insecure && !WWW.test(host) && path === url.pathname) {
        return next();
    }
    const origin = insecure || WWW.test(host) ? `https://${host.replace(WWW, "")}` : "";
    throw redirect({ href: `${origin}${path}${url.search}`, statusCode: 301 });
});

export const startInstance = createStart(() => ({ requestMiddleware: [canonicalUrl] }));
