import type { platformCopy as iosPlatformCopy } from "./platform-copy";

const TWIN = ".android";

/**
 * A string that names iOS has a `<key>.android` twin in the same dictionary. Android reads the twin under the base
 * key, so no call site has to ask which platform it is.
 */
export const platformCopy: typeof iosPlatformCopy = (catalog) => ({
    ...catalog,
    ...Object.fromEntries(
        Object.entries(catalog)
            .filter(([key]) => key.endsWith(TWIN))
            .map(([key, text]) => [key.slice(0, -TWIN.length), text])
    ),
});
