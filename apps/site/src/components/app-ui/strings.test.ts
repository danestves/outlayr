import { expect, it } from "vite-plus/test";

import appUi from "@/content/app-ui.content";
import { glanceWatch } from "@/content/app-ui/glance";

interface Translation {
    translation: Readonly<Record<string, string>>;
}

const nativeDictionaries = import.meta.glob<{ content: Record<string, unknown> }>(
    "../../../../native/src/content/*.content.ts",
    { eager: true, import: "default" }
);

const WATCH = "../../../../native/targets/watch";
const STRINGS_ENTRY = /^"(.+)" = "(.+)";$/gm;

const watchStrings = import.meta.glob<string>("../../../../native/targets/watch/*.lproj/Localizable.strings", {
    eager: true,
    import: "default",
    query: "?raw",
});

const watchSwift = Object.values(
    import.meta.glob<string>("../../../../native/targets/watch/*.swift", {
        eager: true,
        import: "default",
        query: "?raw",
    })
).join("\n");

function watchTranslations(locale: string): Map<string, string> {
    const entries = new Map<string, string>();
    for (const [, key, value] of (watchStrings[`${WATCH}/${locale}.lproj/Localizable.strings`] ?? "").matchAll(
        STRINGS_ENTRY
    )) {
        if (key !== undefined && value !== undefined) {
            entries.set(key, value);
        }
    }
    return entries;
}

const isTranslation = (node: unknown): node is Translation =>
    typeof node === "object" && node !== null && "translation" in node;

function nativeTranslation(key: string): Translation | undefined {
    for (const dictionary of Object.values(nativeDictionaries)) {
        const node = dictionary.content[key];
        if (isTranslation(node)) {
            return node;
        }
    }
    return undefined;
}

it("replica strings match the native app's copy in every site locale", () => {
    const drift = Object.entries(appUi.content.native).flatMap(([key, node]) => {
        const native = nativeTranslation(key);
        if (!native) {
            return [`${key}: not in apps/native/src/content`];
        }
        return Object.entries(node.translation)
            .filter(([locale, copy]) => copy !== native.translation[locale])
            .map(([locale, copy]) => `${key} [${locale}]: "${copy}" vs native "${native.translation[locale]}"`);
    });
    expect(drift).toEqual([]);
});

it("watch-only strings match the watch app's Swift copy and its translations", () => {
    const drift = Object.entries(glanceWatch).flatMap(([name, node]) =>
        Object.entries(node.translation).flatMap(([locale, copy]) => {
            const native =
                locale === "en"
                    ? watchSwift.includes(`"${copy}"`) && copy
                    : watchTranslations(locale).get(node.translation.en);
            return native === copy ? [] : [`${name} [${locale}]: "${copy}" vs watch "${native}"`];
        })
    );
    expect(drift).toEqual([]);
});
