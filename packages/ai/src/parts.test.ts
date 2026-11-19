import { describe, expect, it } from "vite-plus/test";

import { toBase64 } from "./parts";

describe(toBase64, () => {
    it("encodes every byte value, across the chunk seam, like the platform encoder", () => {
        const bytes = Uint8Array.from({ length: 70_000 }, (_, index) => (index * 7) % 256);

        expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString("base64"));
    });
});
