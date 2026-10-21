import type { publishWidgets as iosPublishWidgets } from "@/widgets/publish";

/** A sibling, not an early return, so the widget layouts stay out of the Android bundle. */
export const publishWidgets: typeof iosPublishWidgets = async () => undefined;
