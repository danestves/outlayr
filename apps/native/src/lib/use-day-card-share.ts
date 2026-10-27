import * as Cause from "effect/Cause";
import { useCallback } from "react";

import { dayCardContent, dayCardFileName } from "@/domain/day-card-content";
import type { CardableSection, DayCardOptions } from "@/domain/day-card-content";
import { translateNow } from "@/i18n/runtime";
import { notifyFailure } from "@/lib/notify";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { shareDayCardCommand } from "@/state/transfer-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

import { TransferError } from "./data-transfer";

// The share sheet instead of a photo-album write, so the feature needs no photo-library permission.
export function useDayCardShare(options: DayCardOptions): (section: CardableSection) => void {
    return useCallback(
        (section: CardableSection) => {
            fireAtomCommand(
                appAtomRegistry,
                shareDayCardCommand,
                { fileName: dayCardFileName(section.day), input: dayCardContent(section, options) },
                {
                    onFailure: (cause) => {
                        const failure = Cause.squash(cause);
                        notifyFailure({
                            body:
                                failure instanceof TransferError
                                    ? translateNow(failure.key)
                                    : translateNow("alerts.dayCard.failedBody"),
                            title: translateNow("alerts.dayCard.failedTitle"),
                        });
                    },
                },
                SILENT
            );
        },
        [options]
    );
}
