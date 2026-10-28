import { describe, expect, it } from "vite-plus/test";

import { CATALOGS } from "./catalog";
import { SUPPORTED_LANGUAGES } from "./languages";
import { platformCopy } from "./platform-copy";

describe("platformCopy on Android", () => {
    it("reads each `.android` twin under its base key and leaves the rest as written", () => {
        expect(
            platformCopy({ about: "About", rate: "Rate on the App Store", "rate.android": "Rate on Google Play" })
        ).toStrictEqual({
            about: "About",
            rate: "Rate on Google Play",
            "rate.android": "Rate on Google Play",
        });
    });

    it("is how the shipped catalogs read", () => {
        for (const language of SUPPORTED_LANGUAGES) {
            const catalog = CATALOGS[language];
            const twins = Object.keys(catalog).filter((key) => key.endsWith(".android"));
            expect(twins.length).toBeGreaterThan(0);
            for (const twin of twins) {
                expect(catalog[twin.replace(/\.android$/, "")]).toBe(catalog[twin]);
            }
        }
    });
});
