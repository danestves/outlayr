import { Alert } from "react-native";

import { translateNow } from "@/i18n/runtime";
import { expectHandoff } from "@/lib/app-handoff";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { openWebLinkCommand } from "@/state/link-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

export function openWebLink(url: string): void {
    expectHandoff();
    fireAtomCommand(
        appAtomRegistry,
        openWebLinkCommand,
        url,
        { onFailure: () => Alert.alert(translateNow("settings.link.openFailed")) },
        SILENT
    );
}
