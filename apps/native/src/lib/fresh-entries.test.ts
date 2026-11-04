import { afterEach, expect, test } from "vite-plus/test";

import { freshEntries } from "./fresh-entries";

const DAY_MS = 86_400_000;

afterEach(() => {
    freshEntries.settle("today");
    freshEntries.settle("tomorrow");
});

test("never waits on an entry the Log cannot show yet", () => {
    freshEntries.mark("tomorrow", new Date(Date.now() + DAY_MS));
    expect(freshEntries.arriving()).toBe(false);

    freshEntries.mark("today", new Date());
    expect(freshEntries.arriving()).toBe(true);
});
