import { expect, it } from "vite-plus/test";

import appUi from "@/content/app-ui.content";

interface Translation {
    translation: Readonly<Record<string, string>>;
}

const nativeDictionaries = import.meta.glob<{ content: Record<string, unknown> }>(
    "../../../../native/src/content/*.content.ts",
    { eager: true, import: "default" }
);

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
