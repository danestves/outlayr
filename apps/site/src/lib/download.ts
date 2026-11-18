import { APP_STORE_URL, PLAY_STORE_URL } from "@outlayr/shared/urls";

const IOS = /\b(?:iPhone|iPad|iPod)\b/u;
const ANDROID = /\bAndroid\b/u;

export const GET_APP_ID = "get-app";

export function opensStore(userAgent: string): boolean {
    return IOS.test(userAgent) || ANDROID.test(userAgent);
}

export function downloadTarget(userAgent: string, search: URLSearchParams, home: string): string {
    if (IOS.test(userAgent)) {
        return APP_STORE_URL;
    }
    if (ANDROID.test(userAgent)) {
        const url = new URL(PLAY_STORE_URL);
        const utm = [...search].filter(([key]) => key.startsWith("utm_"));
        if (utm.length > 0) {
            url.searchParams.set("referrer", new URLSearchParams(utm).toString());
        }
        return url.toString();
    }
    const query = search.toString();
    return `${home}${query === "" ? "" : `?${query}`}#${GET_APP_ID}`;
}
