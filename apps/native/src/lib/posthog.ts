import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useSegments } from "expo-router";
import PostHog from "posthog-react-native";
import { useEffect } from "react";
import { Platform } from "react-native";

import { SETTING_DEFAULTS } from "@/data/settings-core";
import { groupStacklessExceptions } from "@/domain/exception-grouping";
import { scrubQueryParams } from "@/domain/exception-scrub";
import { ENV } from "@/env";
import { purchaseListener } from "@/lib/purchase-listener";

export const posthog =
    !__DEV__ && ENV.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN
        ? new PostHog(ENV.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN, {
              before_send: [scrubQueryParams, groupStacklessExceptions],
              customAppProperties: (properties) => ({
                  ...properties,
                  $os_name: Platform.select({ android: "Android", ios: "iOS" }),
              }),
              defaultOptIn: SETTING_DEFAULTS.shareAnalytics,
              errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true } },
          })
        : null;

if (purchaseListener) {
    posthog?.setPersonProperties({ autolog_enabled: purchaseListener.apps().length > 0 });
}

const PAYWALL_FLAG = "paywall-redesign";

export const PaywallVariant = Schema.Literals(["control", "redesign"]);

const readVariant = Schema.decodeUnknownOption(PaywallVariant);

/**
 * Control until the flag loads and for anyone opted out, so an unmeasured user keeps the shipped paywall. The read
 * is the experiment's exposure event, so call it once per paywall shown. Dev builds have no client: `?variant=` picks.
 */
export function paywallVariant(devOverride?: string | string[]): typeof PaywallVariant.Type {
    let flag: unknown = devOverride;
    if (!__DEV__) {
        flag = posthog === null || posthog.optedOut ? undefined : posthog.getFeatureFlag(PAYWALL_FLAG);
    }
    return Option.getOrElse(readVariant(flag), () => "control");
}

export function useScreenTracking() {
    const screen = useSegments().join("/");
    // oxlint-disable-next-line outlayr/react-effect-budget -- reports the current screen to the PostHog client
    useEffect(() => {
        if (screen) {
            posthog?.screen(screen);
        }
    }, [screen]);
}
