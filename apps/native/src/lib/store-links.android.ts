import * as Effect from "effect/Effect";

import { expectHandoff } from "@/lib/app-handoff";
import type { openStoreReview as iosOpenStoreReview } from "@/lib/store-links";

import { openUrl } from "./open-url";

const PLAY_STORE_LISTING = "market://details?id=com.tryoutlayr.app";
const PLAY_WEB_LISTING = "https://play.google.com/store/apps/details?id=com.tryoutlayr.app";

/** A device without the Play Store has nothing to take `market://`, so it gets the web listing instead. */
export const openStoreReview: typeof iosOpenStoreReview = () =>
    Effect.sync(expectHandoff).pipe(
        Effect.andThen(openUrl(PLAY_STORE_LISTING)),
        Effect.catchTags({ OpenUrlError: () => openUrl(PLAY_WEB_LISTING) })
    );
