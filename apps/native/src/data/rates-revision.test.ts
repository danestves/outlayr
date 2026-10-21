import { describe, expect, it } from "@jest/globals";

import { bumpRatesRevision, ratesRevision, subscribeRatesRevision } from "./rates-revision";

describe("rates revision", () => {
    it("stops notifying once unsubscribed", () => {
        let seen = 0;
        const unsubscribe = subscribeRatesRevision(() => {
            seen += 1;
        });
        unsubscribe();
        bumpRatesRevision();
        expect(seen).toBe(0);
    });

    it("reads back the same value until something bumps it", () => {
        expect(ratesRevision()).toBe(ratesRevision());
    });
});
