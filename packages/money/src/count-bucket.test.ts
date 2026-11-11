import { describe, expect, it } from "vite-plus/test";

import { countBucket } from "./count-bucket";

describe("countBucket", () => {
    it("puts each count in its order-of-magnitude bucket", () => {
        expect([0, 1, 9, 10, 99, 100, 999, 1000, 52_000].map(countBucket)).toStrictEqual([
            "0",
            "1-9",
            "1-9",
            "10-99",
            "10-99",
            "100-999",
            "100-999",
            "1000+",
            "1000+",
        ]);
    });
});
