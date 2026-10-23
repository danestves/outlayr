import { NOTIFICATION_PATTERNS } from "@/domain/parse-notification";
import { purchaseListener } from "@/lib/purchase-listener";
import type { publishWidgets as iosPublishWidgets } from "@/widgets/publish";

/** A sibling, not an early return, so the widget layouts stay out of the Android bundle. */
export const publishWidgets: typeof iosPublishWidgets = async () => {
    const { flags, source } = NOTIFICATION_PATTERNS.money;
    purchaseListener?.setMoneyPattern(source, flags.includes("i"));
};
