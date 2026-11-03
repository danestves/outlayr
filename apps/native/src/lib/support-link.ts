import Constants from "expo-constants";
import { Platform, Share } from "react-native";

import { translateNow } from "@/i18n/runtime";
import { expectHandoff } from "@/lib/app-handoff";
import { APP_BUILD, APP_VERSION } from "@/lib/app-version";
import { notifyFailure } from "@/lib/notify";
import { supportMailto } from "@/lib/support-mailto";
import type { SupportDiagnostics } from "@/lib/support-mailto";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { emailSupportCommand } from "@/state/link-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

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

function showSupportAddress(): void {
    notifyFailure({
        actionLabel: translateNow("settings.support.shareAddress"),
        body: translateNow("settings.support.noMailBody", { address: SUPPORT_EMAIL }),
        onActionPress: () => {
            expectHandoff();
            Share.share({ message: SUPPORT_EMAIL });
        },
        title: translateNow("settings.support.noMailTitle"),
    });
}

export function emailSupport(subject: string): void {
    expectHandoff();
    fireAtomCommand(
        appAtomRegistry,
        emailSupportCommand,
        supportMailURL(subject),
        { onFailure: showSupportAddress },
        SILENT
    );
}
