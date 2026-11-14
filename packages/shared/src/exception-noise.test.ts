import type { CaptureResult } from "posthog-js";
import { expect, test } from "vite-plus/test";

import { dropNoiseExceptions } from "./exception-noise";

const SCANNER =
    "Non-Error promise rejection captured with value: Object Not Found Matching Id:1, MethodName:update, ParamCount:4";

function exception(...values: string[]): CaptureResult {
    return {
        event: "$exception",
        properties: { $exception_list: values.map((value) => ({ type: "UnhandledRejection", value })) },
        uuid: "event",
    };
}

test("drops the link scanner rejection as posthog-js captures it", () => {
    expect(dropNoiseExceptions(exception(SCANNER, SCANNER))).toBeNull();
});

test("drops the Instagram in-app browser bridge error on unload", () => {
    expect(dropNoiseExceptions(exception("Error invoking postMessage: Java object is gone"))).toBeNull();
});

test("keeps an event when a real error rides along with the noise", () => {
    const event = exception(SCANNER, "TypeError: Cannot read properties of undefined (reading 'amount')");
    expect(dropNoiseExceptions(event)).toBe(event);
});

test("keeps a rejection that only mentions the scanner text", () => {
    const event = exception(`Sync failed: ${SCANNER}`);
    expect(dropNoiseExceptions(event)).toBe(event);
});
