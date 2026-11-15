import { expect, it } from "vite-plus/test";

import { sessionRows } from "./account-state";

it("keeps other sessions' tokens out of the query cache, which the server sends to the page", () => {
    const listed = [{ id: "s1", token: "secret", updatedAt: "2026-11-10T12:00:00.000Z", userAgent: "Firefox" }];

    expect(sessionRows(listed)).toStrictEqual([
        { id: "s1", updatedAt: Date.UTC(2026, 10, 10, 12), userAgent: "Firefox" },
    ]);
});
