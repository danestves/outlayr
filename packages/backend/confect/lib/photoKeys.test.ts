import { describe, expect, it } from "vite-plus/test";

import { isPhotoName, ownsPhotoKey, PHOTO_KEY_PREFIX, photoKeyFor, photoNameFromKey } from "./photoKeys";

const USER = "user-aaaa";
const OTHER = "user-bbbb";

describe(isPhotoName, () => {
    it("accepts the ids the device mints", () => {
        expect(isPhotoName("k7q2x9f1.jpg")).toBeTruthy();
        expect(isPhotoName("A-b_c.1.jpeg")).toBeTruthy();
    });

    it("rejects anything that could add or climb a path segment", () => {
        expect(isPhotoName("..")).toBeFalsy();
        expect(isPhotoName("../secret.jpg")).toBeFalsy();
        expect(isPhotoName("nested/photo.jpg")).toBeFalsy();
        expect(isPhotoName(".hidden.jpg")).toBeFalsy();
        expect(isPhotoName("")).toBeFalsy();
    });

    it("rejects a name long enough to be a payload", () => {
        expect(isPhotoName(`a${"b".repeat(127)}`)).toBeTruthy();
        expect(isPhotoName(`a${"b".repeat(128)}`)).toBeFalsy();
    });
});

describe(photoKeyFor, () => {
    it("namespaces the object under the account", () => {
        expect(photoKeyFor(USER, "a.jpg")).toBe(`${PHOTO_KEY_PREFIX}/${USER}/a.jpg`);
    });
});

describe(ownsPhotoKey, () => {
    it("accepts a key this account minted", () => {
        expect(ownsPhotoKey(USER, photoKeyFor(USER, "a.jpg"))).toBeTruthy();
    });

    it("refuses another account's key", () => {
        expect(ownsPhotoKey(USER, photoKeyFor(OTHER, "a.jpg"))).toBeFalsy();
    });

    it("refuses a key that smuggles the owner into the name half", () => {
        expect(ownsPhotoKey(USER, `${PHOTO_KEY_PREFIX}/${OTHER}/../${USER}/a.jpg`)).toBeFalsy();
    });

    it("refuses a key outside the photo prefix", () => {
        expect(ownsPhotoKey(USER, `other-prefix/${USER}/a.jpg`)).toBeFalsy();
    });
});

describe(photoNameFromKey, () => {
    it("answers the device file name a key was minted from", () => {
        expect(photoNameFromKey(photoKeyFor(USER, "a.jpg"))).toBe("a.jpg");
    });

    it("answers null for a malformed key", () => {
        expect(photoNameFromKey("a.jpg")).toBeNull();
        expect(photoNameFromKey(`${PHOTO_KEY_PREFIX}/${USER}/a/b.jpg`)).toBeNull();
    });
});
