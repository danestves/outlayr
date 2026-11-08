import { expect, it } from "vite-plus/test";

import { pageQueryOf } from "./search";

it("drops date bounds that are not real calendar days", () => {
    expect(pageQueryOf({ from: "2026-99-99", to: "2026-02-30" }).custom).toStrictEqual({});
    expect(pageQueryOf({ from: "2024-02-29", to: "2026-11-08" }).custom).toStrictEqual({
        from: "2024-02-29",
        to: "2026-11-08",
    });
});
