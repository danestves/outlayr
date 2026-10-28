import { describe, expect, it } from "vite-plus/test";

import { createDraftStash } from "./draft-stash";

describe("createDraftStash", () => {
    it("hands a draft back once, to the key it was put under", () => {
        const stash = createDraftStash<{ amount: string }>();
        stash.put("t1", { amount: "12" });

        expect(stash.take("t2")).toBeUndefined();
        expect(stash.take("t1")).toStrictEqual({ amount: "12" });
        expect(stash.take("t1")).toBeUndefined();
    });
});
