import { DrizzleQueryError } from "drizzle-orm/errors";
import { describe, expect, it } from "vite-plus/test";

import { scrubQueryParams } from "./exception-scrub";

describe("scrubQueryParams", () => {
    it("drops a failed query's bound values and keeps the statement", () => {
        const { message } = new DrizzleQueryError("insert into transactions (amount, note) values (?, ?)", [
            4200,
            "Costco",
        ]);
        const event = {
            event: "$exception",
            properties: {
                $exception_list: [
                    { type: "Error", value: message },
                    { type: "Error", value: "Timeout" },
                ],
            },
        };

        expect(scrubQueryParams(event)?.properties.$exception_list).toStrictEqual([
            { type: "Error", value: "Failed query: insert into transactions (amount, note) values (?, ?)" },
            { type: "Error", value: "Timeout" },
        ]);
    });

    it("passes events without exceptions through", () => {
        const event = { event: "$screen", properties: { $screen_name: "log" } };
        expect(scrubQueryParams(event)).toStrictEqual({ event: "$screen", properties: { $screen_name: "log" } });
        expect(scrubQueryParams(null)).toBeNull();
    });
});
