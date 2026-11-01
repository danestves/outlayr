import { describe, expect, it } from "vite-plus/test";

import { groupStacklessExceptions } from "./exception-grouping";

const rejection = (value: string) => ({
    event: "$exception",
    properties: {
        $exception_list: [{ stacktrace: { frames: [], type: "raw" }, type: "Error", value }],
    },
});

const NATIVE_APPLY = { filename: "native", function: "apply", in_app: true, platform: "hermes" };
const BUNDLE_FRAME = { filename: "app:///main.jsbundle", function: "transition", in_app: true, platform: "hermes" };

describe("groupStacklessExceptions", () => {
    it("fingerprints stackless rejections by message so unrelated ones stop sharing an issue", () => {
        const mail = groupStacklessExceptions(rejection("Unable to open URL: mailto:support@tryoutlayr.com"));
        const other = groupStacklessExceptions(rejection("Network request failed"));

        expect(mail?.properties).toHaveProperty(
            "$exception_fingerprint",
            "Error: Unable to open URL: mailto:support@tryoutlayr.com"
        );
        expect(other?.properties).toHaveProperty("$exception_fingerprint", "Error: Network request failed");
    });

    it("counts native frames as library code, not as a JS stack", () => {
        const event = {
            event: "$exception",
            properties: {
                $exception_list: [
                    { stacktrace: { frames: [NATIVE_APPLY], type: "raw" }, type: "Error", value: "Boom" },
                ],
            },
        };

        expect(groupStacklessExceptions(event)?.properties).toStrictEqual({
            $exception_fingerprint: "Error: Boom",
            $exception_list: [
                {
                    stacktrace: { frames: [{ ...NATIVE_APPLY, in_app: false }], type: "raw" },
                    type: "Error",
                    value: "Boom",
                },
            ],
        });
    });

    it("leaves a JS stack to PostHog's frame grouping", () => {
        const event = {
            event: "$exception",
            properties: {
                $exception_list: [
                    {
                        stacktrace: { frames: [BUNDLE_FRAME, NATIVE_APPLY], type: "raw" },
                        type: "Error",
                        value: "Invalid start version: 1793549380912295851:11:2, transitioning from 0:0:0",
                    },
                ],
            },
        };

        const { properties } = groupStacklessExceptions(event) ?? event;
        expect(properties).not.toHaveProperty("$exception_fingerprint");
        expect(properties.$exception_list[0]?.stacktrace.frames).toStrictEqual([
            BUNDLE_FRAME,
            { ...NATIVE_APPLY, in_app: false },
        ]);
    });
});
