import { describe, expect, it } from "vite-plus/test";

import { profileAccess } from "./profile-access";

const JOINED = [{ profileId: "joined-1" }];

describe("profileAccess", () => {
    it("names the viewer's own profile", () => {
        expect(profileAccess("own-1", true, [])).toBe("own");
    });

    it("names a profile the viewer joined", () => {
        expect(profileAccess("joined-1", false, JOINED)).toBe("joined");
    });

    it("refuses an id that is neither own nor joined", () => {
        expect(profileAccess("other-1", false, JOINED)).toBe("unknown");
    });

    it("has no profile when the cookie names nothing", () => {
        expect(profileAccess(null, false, JOINED)).toBe("none");
    });
});
