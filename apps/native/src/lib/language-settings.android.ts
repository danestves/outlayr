import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { applicationId } from "expo-application";
import { openSettings } from "expo-linking";
import { Platform } from "react-native";

import type {
    hasSystemLanguageSettings as iosHasSystemLanguageSettings,
    openLanguageSettings as iosOpenLanguageSettings,
} from "@/lib/language-settings";

/** Android 13 added per-app languages. Before it the system has nothing to pick, so the row is hidden. */
const PER_APP_LANGUAGE_API = 33;

export const hasSystemLanguageSettings: typeof iosHasSystemLanguageSettings = () =>
    Number(Platform.Version) >= PER_APP_LANGUAGE_API;

const openAppInfo = Effect.ignore(Effect.tryPromise(() => openSettings()));

class LanguagePageError extends Schema.TaggedError<LanguagePageError>()("LanguagePageError", {
    cause: Schema.optional(Schema.Defect()),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "The app language page could not be opened";
    }
}

/**
 * The page only registers for an intent whose data names the package, which `Linking.sendIntent` can't set.
 * expo-intent-launcher is required lazily: it loads its native module on import, which older builds lack.
 */
const openAppLanguagePage = Effect.fn("LanguageSettings.openAppLanguagePage")(function* openAppLanguagePage() {
    if (applicationId === null) {
        return yield* new LanguagePageError();
    }
    const { ActivityAction, startActivityAsync } = yield* Effect.try({
        catch: (cause) => new LanguagePageError({ cause }),
        // SAFETY: untyped `require`, asserted to that module's own type.
        try: () => require("expo-intent-launcher") as typeof import("expo-intent-launcher"),
    });
    yield* Effect.tryPromise({
        catch: (cause) => new LanguagePageError({ cause }),
        try: () => startActivityAsync(ActivityAction.APP_LOCALE_SETTINGS, { data: `package:${applicationId}` }),
    });
});

/** A system without the page, or a build without the module, gets App info, which lists Language on Android 13+. */
export const openLanguageSettings: typeof iosOpenLanguageSettings = () =>
    openAppLanguagePage().pipe(Effect.catchTags({ LanguagePageError: () => openAppInfo }));
