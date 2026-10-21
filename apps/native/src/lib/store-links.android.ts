import { Linking } from "react-native";

import { expectHandoff } from "@/lib/app-handoff";
import type { openStoreReview as iosOpenStoreReview } from "@/lib/store-links";

const PLAY_STORE_LISTING = "market://details?id=com.tryoutlayr.app";
const PLAY_WEB_LISTING = "https://play.google.com/store/apps/details?id=com.tryoutlayr.app";

/** A device without the Play Store has nothing to take `market://`, so it gets the web listing instead. */
export const openStoreReview: typeof iosOpenStoreReview = async () => {
    expectHandoff();
    try {
        await Linking.openURL(PLAY_STORE_LISTING);
    } catch {
        await Linking.openURL(PLAY_WEB_LISTING);
    }
};
