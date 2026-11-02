import { describe, expect, it } from "vite-plus/test";

import { dropLaunchUrl } from "./launch-url-scrub";

describe("dropLaunchUrl", () => {
    it("drops the launch URL, where a backup file link carries its file name", () => {
        const event = {
            event: "Application Opened",
            properties: { $app_version: "1.4.0", url: "file:///private/var/Inbox/Daniel-gastos.outlayr" },
        };

        expect(dropLaunchUrl(event)?.properties).toStrictEqual({ $app_version: "1.4.0" });
    });

    it("keeps a url property on other events", () => {
        const event = { event: "$screen", properties: { url: "outlayr://insights" } };

        expect(dropLaunchUrl(event)?.properties).toStrictEqual({ url: "outlayr://insights" });
    });
});
