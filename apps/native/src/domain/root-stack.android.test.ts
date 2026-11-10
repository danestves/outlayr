import { expect, test } from "vite-plus/test";

import { ROOT_STACK } from "./root-stack";

// Type-checked against the iOS file, so a detent `sheet-detents.android.ts` forgets crashes the sheet on open.
test("gives every form sheet a detent on Android", () => {
    const sheets = ROOT_STACK.flatMap((block) => block.screens).filter((screen) => screen.chrome === "sheet");
    for (const { detent, name } of sheets) {
        expect({ detent: detent > 0 && detent <= 1, name }).toStrictEqual({ detent: true, name });
    }
});
