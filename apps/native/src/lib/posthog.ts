import { useGlobalSearchParams, useSegments } from "expo-router";
import PostHog from "posthog-react-native";
import { useEffect } from "react";
import { Platform } from "react-native";

import { SETTING_DEFAULTS } from "@/data/settings-core";
import { scrubQueryParams } from "@/domain/exception-scrub";
import { paywallTriggerOf } from "@/domain/paywall-trigger";
import { ENV } from "@/env";
import { purchaseListener } from "@/lib/purchase-listener";

export const posthog =
    !__DEV__ && ENV.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN
        ? new PostHog(ENV.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN, {
              before_send: scrubQueryParams,
              customAppProperties: (properties) => ({
                  ...properties,
                  $os_name: Platform.select({ android: "Android", ios: "iOS" }),
              }),
              defaultOptIn: SETTING_DEFAULTS.shareAnalytics,
              disableRemoteFeatureFlags: true,
              errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true } },
          })
        : null;

if (purchaseListener) {
    posthog?.setPersonProperties({ autolog_enabled: purchaseListener.apps().length > 0 });
}

export function useScreenTracking() {
    const screen = useSegments().join("/");
    const { trigger: triggerParam } = useGlobalSearchParams<{ trigger?: string }>();
    const trigger = screen === "paywall" ? paywallTriggerOf(triggerParam) : null;
    // oxlint-disable-next-line outlayr/react-effect-budget -- reports the current screen to the PostHog client
    useEffect(() => {
        if (screen) {
            posthog?.screen(screen);
        }
        if (trigger !== null) {
            posthog?.capture("paywall_viewed", { trigger });
        }
    }, [screen, trigger]);
}
