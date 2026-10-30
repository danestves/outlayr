import Constants from "expo-constants";
import { Platform } from "react-native";

import { APP_BUILD, APP_VERSION } from "@/lib/app-version";
import { supportMailto } from "@/lib/support-mailto";
import type { SupportDiagnostics } from "@/lib/support-mailto";

export const SUPPORT_EMAIL = "support@tryoutlayr.com";

export function supportDiagnostics(version: string = APP_VERSION, build: string = APP_BUILD): SupportDiagnostics {
    return {
        appBuild: build,
        appName: Constants.expoConfig?.name ?? "Outlayr",
        appVersion: version,
        deviceName: Constants.deviceName ?? "",
        osName: Platform.select({ android: "Android", ios: "iOS" }) ?? Platform.OS,
        osVersion: String(Platform.Version),
    };
}

export function supportMailURL(subject: string): string {
    return supportMailto(SUPPORT_EMAIL, subject, supportDiagnostics());
}
