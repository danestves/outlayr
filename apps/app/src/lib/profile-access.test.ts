import { describe, expect, it } from "vite-plus/test";

import { acceptedProfileId } from "./profile-access";

const JOINED = [{ profileId: "joined-1" }];

describe("acceptedProfileId", () => {
    it("opens an own profile named by the cookie", () => {
        expect(acceptedProfileId("own-1", true, [])).toBe("own-1");
    });

    it("opens a profile the viewer joined", () => {
        expect(acceptedProfileId("joined-1", false, JOINED)).toBe("joined-1");
    });

    it("refuses an id that is neither own nor joined", () => {
        expect(acceptedProfileId("other-1", false, JOINED)).toBeNull();
    });

    it("keeps Personal when the cookie names nothing", () => {
        expect(acceptedProfileId(null, false, JOINED)).toBeNull();
    });
});
