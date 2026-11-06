// `transaction-photos/<userId>/<name>`. The server writes the user id from the session, never from an argument, so
// a client cannot name its way into another account; `<name>` is the device file name, so a retry re-derives it.
export const PHOTO_KEY_PREFIX = "transaction-photos";

// No slashes, so a name never adds a path segment; no leading dot, so `..` cannot escape the prefix.
const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function isPhotoName(name: string): boolean {
    return NAME_PATTERN.test(name);
}

export function photoKeyFor(userId: string, name: string): string {
    return `${PHOTO_KEY_PREFIX}/${userId}/${name}`;
}

// Compared against a freshly derived key rather than parsing the incoming one, so a merely well-formed key fails.
export function ownsPhotoKey(userId: string, key: string): boolean {
    const name = photoNameFromKey(key);
    return name !== null && photoKeyFor(userId, name) === key;
}

// A shared `merchants/…` logo must never pass as an owned photo, even if either prefix changes.
const MERCHANT_KEY_PREFIX = "merchants/";
const MERCHANT_LOGOS_ORIGIN = "https://logos.tryoutlayr.com";
const MERCHANT_DOMAIN = /^[a-z0-9][a-z0-9.-]{0,252}$/;

export function merchantLogoUrl(key: string): string | null {
    if (!key.startsWith(MERCHANT_KEY_PREFIX)) {
        return null;
    }
    const domain = key.slice(MERCHANT_KEY_PREFIX.length);
    return MERCHANT_DOMAIN.test(domain) ? `${MERCHANT_LOGOS_ORIGIN}/${key}` : null;
}

export function photoNameFromKey(key: string): string | null {
    if (key.startsWith(MERCHANT_KEY_PREFIX)) {
        return null;
    }
    const segments = key.split("/");
    if (segments.length !== 3 || segments[0] !== PHOTO_KEY_PREFIX) {
        return null;
    }
    const name = segments.at(-1);
    return name !== undefined && isPhotoName(name) ? name : null;
}

// Bookkeeping on an already trusted key only. Never authorize with this; `ownsPhotoKey` checks the session's owner.
export function photoOwnerFromKey(key: string): string | null {
    const [, userId] = key.split("/");
    const name = photoNameFromKey(key);
    if (name === null) {
        return null;
    }
    return userId !== undefined && userId !== "" && photoKeyFor(userId, name) === key ? userId : null;
}
