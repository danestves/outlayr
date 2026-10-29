import { useRouter } from "expo-router";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";

import { NoticeSlip } from "@/components/notice-slip";
import { formatSentenceDate } from "@/domain/dates";
import { paywallHref } from "@/domain/paywall-trigger";
import { formatWait } from "@/domain/usage-limits";
import type { CaptureFeature, LimitNotice } from "@/hooks/use-usage-limits";
import { useLanguage, useTranslation } from "@/i18n/context";

const COPY = {
    receiptScan: { last: "receipt.limit.last", next: "receipt.limit.next", paused: "receipt.limit.paused" },
    voiceEntry: { last: "voice.limit.last", next: "voice.limit.next", paused: "voice.limit.paused" },
} as const;

const TOP_OFFSET = 72;

export function LimitToast({
    feature,
    notice,
    now,
    pro,
}: {
    feature: CaptureFeature;
    notice: LimitNotice | null;
    now: number;
    pro: boolean;
}) {
    const t = useTranslation();
    const { language } = useLanguage();
    const router = useRouter();

    if (notice === null) {
        return null;
    }

    const copy = COPY[feature];
    const toPro = !pro && (notice.kind === "capturesEmpty" || notice.kind === "capturesLast");
    let title: string;
    let description: string | null = null;
    if (notice.kind === "paused" || notice.kind === "last") {
        title = t(notice.kind === "paused" ? copy.paused : copy.last);
        if (notice.nextAt !== null) {
            description = t(copy.next, { time: formatWait(notice.nextAt - now) });
        }
    } else {
        title = t(notice.kind === "capturesEmpty" ? "settings.usage.toast.empty" : "settings.usage.toast.last");
        if (notice.resetsAt !== null) {
            description = t("settings.usage.toast.moreOn", {
                count: notice.capacity,
                date: formatSentenceDate(new Date(notice.resetsAt), language),
            });
        }
    }

    return (
        <Animated.View
            entering={SlideInUp.duration(320)}
            exiting={SlideOutUp.duration(260)}
            pointerEvents="box-none"
            style={{ left: 16, position: "absolute", right: 16, top: TOP_OFFSET }}
        >
            <NoticeSlip
                actionLabel={t(toPro ? "settings.usage.toast.pro" : "settings.usage.toast.usage")}
                body={description ?? undefined}
                onAction={() => router.push(toPro ? paywallHref("captures") : "/settings/usage")}
                title={title}
                tone={{ kind: notice.kind === "paused" || notice.kind === "capturesEmpty" ? "failure" : "warning" }}
            />
        </Animated.View>
    );
}
