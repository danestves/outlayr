import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { intlayer } from "vite-intlayer";
import { defineConfig } from "vite-plus";

const ENTRY = "virtual:replicas";
const RESOLVED_ENTRY = `\0${ENTRY}`;

const PAGE = `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Replicas</title>
        <style>
            body { margin: 0; font: 14px system-ui, sans-serif; }
            nav { display: grid; gap: 4px; padding: 16px; }
        </style>
    </head>
    <body>
        <main id="replica"></main>
        <script type="module" src="/@id/__x00__${ENTRY}"></script>
    </body>
</html>`;

const ENTRY_SOURCE = `
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const modules = import.meta.glob("/src/components/app-ui/*.viewer.tsx", { eager: true });
const SCREENS = Object.assign({}, ...Object.values(modules).map((module) => module.screens));
const LOCALES = ["en", "de", "es", "pt", "fr"];
const THEMES = ["light", "dark"];

const params = new URLSearchParams(location.search);
const screen = SCREENS[params.get("screen")];
const mount = document.getElementById("replica");

if (screen) {
    const props = { locale: params.get("locale") ?? "en", theme: params.get("theme") ?? "light" };
    if (params.has("scale")) props.scale = Number(params.get("scale"));
    if (params.has("scrollY")) props.scrollY = Number(params.get("scrollY"));
    if (params.has("fit")) {
        props.fit = true;
        mount.style.width = params.get("fit") + "px";
    }
    document.documentElement.style.background = props.theme === "dark" ? "#000" : "#fff";
    mount.innerHTML = renderToStaticMarkup(createElement(screen, props));
} else {
    const links = Object.keys(SCREENS).flatMap((name) =>
        THEMES.flatMap((theme) =>
            LOCALES.map((locale) => \`<a href="?screen=\${name}&theme=\${theme}&locale=\${locale}">\${name} \${theme} \${locale}</a>\`)
        )
    );
    mount.innerHTML = \`<nav>\${links.join("")}</nav>\`;
}
`;

const viewer: Plugin = {
    configureServer(server) {
        server.middlewares.use((request, response, next) => {
            const url = request.url ?? "/";
            if (url !== "/" && !url.startsWith("/?")) {
                next();
                return;
            }
            response.setHeader("content-type", "text/html");
            server
                .transformIndexHtml(url, PAGE)
                .then((html) => response.end(html))
                .catch((error: Error) => {
                    response.statusCode = 500;
                    response.end(error.message);
                });
        });
    },
    load: (id) => (id === RESOLVED_ENTRY ? ENTRY_SOURCE : undefined),
    name: "replicas",
    resolveId: (id) => (id === ENTRY ? RESOLVED_ENTRY : undefined),
};

export default defineConfig({
    plugins: [tailwindcss(), intlayer(), viteReact(), viewer],
    resolve: { tsconfigPaths: true },
    server: { port: 4320, strictPort: true },
});
