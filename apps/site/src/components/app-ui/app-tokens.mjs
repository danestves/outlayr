import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const NATIVE_PACKAGE = new URL("../../../../native/package.json", import.meta.url);
const NATIVE_CSS = new URL("../../../../native/global.css", import.meta.url);
const FONT_VARIABLE = /^--font-/;
const keep = ([name]) => !FONT_VARIABLE.test(name);

function stripComments(css) {
    return css.replaceAll(/\/\*[\s\S]*?\*\//g, "");
}

function blockAfter(css, header, from = 0) {
    const start = css.indexOf(header, from);
    if (start === -1) {
        return null;
    }
    const open = css.indexOf("{", start);
    let depth = 0;
    for (let index = open; index < css.length; index += 1) {
        if (css[index] === "{") {
            depth += 1;
        } else if (css[index] === "}") {
            depth -= 1;
            if (depth === 0) {
                return { body: css.slice(open + 1, index), end: index + 1 };
            }
        }
    }
    throw new Error(`Unbalanced braces after ${header}`);
}

function withoutNestedBlocks(body) {
    let flat = "";
    let depth = 0;
    let header = "";
    for (const char of body) {
        if (char === "{") {
            depth += 1;
            header = "";
        } else if (char === "}") {
            depth -= 1;
        } else if (depth === 0) {
            if (char === ";") {
                flat += `${header};`;
                header = "";
            } else {
                header += char;
            }
        }
    }
    return flat;
}

function declarations(body) {
    const entries = [];
    for (const line of withoutNestedBlocks(body).split(";")) {
        const colon = line.indexOf(":");
        const name = line.slice(0, colon).trim();
        if (colon > 0 && name.startsWith("--")) {
            entries.push([name, line.slice(colon + 1).trim()]);
        }
    }
    return entries;
}

function variant(root, name, file) {
    const block = blockAfter(root, `@variant ${name}`);
    const entries = block ? declarations(block.body) : [];
    if (entries.length === 0) {
        throw new Error(`No @variant ${name} tokens in ${file}`);
    }
    return entries;
}

function rootOf(css, file) {
    const block = blockAfter(css, ":root");
    if (!block) {
        throw new Error(`No :root block in ${file}`);
    }
    return block.body;
}

function staticTheme(css, file) {
    let from = 0;
    for (;;) {
        const start = css.indexOf("@theme", from);
        if (start === -1) {
            throw new Error(`No @theme block with type sizes in ${file}`);
        }
        const isInline = css.startsWith("@theme inline", start);
        const block = blockAfter(css, "@theme", start);
        if (!isInline && block.body.includes("--text-")) {
            return declarations(block.body).filter(([name]) => !FONT_VARIABLE.test(name));
        }
        from = block.end;
    }
}

export function readAppTokens() {
    const nativeFile = fileURLToPath(NATIVE_CSS);
    const panelFile = createRequire(NATIVE_PACKAGE).resolve("panelui-native/theme.css");
    const native = stripComments(readFileSync(nativeFile, "utf-8"));
    const panel = stripComments(readFileSync(panelFile, "utf-8"));
    const nativeRoot = rootOf(native, nativeFile);
    const panelRoot = rootOf(panel, panelFile);
    return {
        dark: [...variant(panelRoot, "dark", panelFile), ...variant(nativeRoot, "dark", nativeFile)].filter(keep),
        light: [...variant(panelRoot, "light", panelFile), ...variant(nativeRoot, "light", nativeFile)].filter(keep),
        shared: staticTheme(native, nativeFile),
    };
}

export default function appTokens({ addBase }) {
    const { dark, light, shared } = readAppTokens();
    addBase({
        "[data-app-replica]": Object.fromEntries(shared),
        '[data-app-replica][data-app-theme="dark"]': Object.fromEntries(dark),
        '[data-app-replica][data-app-theme="light"]': Object.fromEntries(light),
    });
}
