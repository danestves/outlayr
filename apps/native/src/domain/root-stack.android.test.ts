import { expect, test } from "@jest/globals";

import { SHEET_SCREENS } from "./root-stack";

// Type-checked against the iOS file, so a detent `sheet-detents.android.ts` forgets crashes the sheet on open.
test("gives every form sheet a detent on Android", () => {
    for (const { detent, name } of SHEET_SCREENS) {
        expect({ detent: detent > 0 && detent <= 1, name }).toStrictEqual({ detent: true, name });
    }
});
