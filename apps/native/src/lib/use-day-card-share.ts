import { useCallback } from "react";

import { dayCardContent, dayCardFileName } from "@/domain/day-card-content";
import type { CardableSection, DayCardOptions } from "@/domain/day-card-content";
import { translateNow } from "@/i18n/runtime";
import { notifyFailure } from "@/lib/notify";
import { runTransferCommand, shareDayCardCommand } from "@/state/transfer-commands";

import { TransferError } from "./data-transfer";

// The share sheet instead of a photo-album write, so the feature needs no photo-library permission.
export function useDayCardShare(options: DayCardOptions): (section: CardableSection) => void {
    return useCallback(
        (section: CardableSection) => {
            runTransferCommand(shareDayCardCommand, {
                fileName: dayCardFileName(section.day),
                input: dayCardContent(section, options),
            }).catch((cause: unknown) => {
                notifyFailure({
                    body:
                        cause instanceof TransferError
                            ? translateNow(cause.key)
                            : translateNow("alerts.dayCard.failedBody"),
                    title: translateNow("alerts.dayCard.failedTitle"),
                });
            });
        },
        [options]
    );
}
