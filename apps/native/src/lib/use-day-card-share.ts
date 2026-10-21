import { useCallback } from "react";

import { dayCardContent, dayCardFileName } from "@/domain/day-card-content";
import type { CardableSection, DayCardOptions } from "@/domain/day-card-content";
import { translateNow } from "@/i18n/runtime";
import { notifyFailure } from "@/lib/notify";

import { TransferError } from "./data-transfer";
import { shareDayCard } from "./day-card-image";

// The share sheet instead of a photo-album write, so the feature needs no photo-library permission.
export function useDayCardShare(options: DayCardOptions): (section: CardableSection) => void {
    return useCallback(
        (section: CardableSection) => {
            shareDayCard(dayCardContent(section, options), dayCardFileName(section.day)).catch((cause: unknown) => {
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
