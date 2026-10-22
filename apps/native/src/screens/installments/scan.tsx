import Image01Icon from "@hugeicons-pro/core-stroke-rounded/Image01Icon";
import { useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { AiConsentGate } from "@/components/ai-consent";
import { LimitToast } from "@/components/limit-toast";
import { PhotoStage } from "@/components/receipt/photo-stage";
import { useDatabase } from "@/contexts/local-data-context";
import { getAccountById } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import { useAiConsent } from "@/data/settings";
import { encodeInstallmentSeed, scannedOrder } from "@/domain/installment-scan";
import { useLocaleTag } from "@/hooks/use-locale-tag";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { useImageScan } from "@/hooks/use-receipt-scan";
import type { ScanFailure, ScanPhoto } from "@/hooks/use-receipt-scan";
import { useRegionCode } from "@/hooks/use-region-code";
import { isLimitRefusal, useLimitNotice } from "@/hooks/use-usage-limits";
import type { TranslatableKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { useAuthSession } from "@/lib/auth-session";
import { installmentScanTransport } from "@/lib/convex";
import type { InstallmentPlanDraft } from "@/lib/convex";
import {
    BottomBar,
    FAILURE_KEY,
    RETRYABLE,
    ScanGateScreen,
    ScanShell,
    StatusLine,
    useStageBox,
} from "@/screens/transaction/scan";
import type { BarAction } from "@/screens/transaction/scan";
import { useColors } from "@/theme/use-colors";

import { handedOffPhoto } from "./use-screenshot-import";

const FAILURES = {
    ...FAILURE_KEY,
    notConfigured: "installments.scan.notConfigured",
    provider: "installments.scan.provider",
    unauthenticated: "installments.scan.unauthenticated",
    unclear: "installments.scan.unclear",
} as const satisfies Record<ScanFailure, TranslatableKey>;

function ScanFlow({ account, photo }: { account: Account; photo: ScanPhoto | null }) {
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const entitled = useProEntitled();
    const localeTag = useLocaleTag();
    const regionCode = useRegionCode();
    const stageBox = useStageBox();
    const [api] = useState(installmentScanTransport);
    const { chooseFromLibrary, phase, reset, retry, scan } = useImageScan<null, InstallmentPlanDraft>({
        context: null,
        owner: "installment-scan",
        send: async (image, today) => {
            const { plan, status } = await api({
                accounts: [account.name],
                currency: account.currency,
                image,
                language: localeTag,
                regionCode,
                today,
            });
            return { draft: plan, status };
        },
    });
    const limit = useLimitNotice(
        "receiptScan",
        phase.kind === "failed" && isLimitRefusal(phase.reason) ? phase.reason : null
    );
    const limitToast = <LimitToast feature="receiptScan" {...limit} />;

    const plan = phase.kind === "review" ? phase.draft : null;
    const foreign = plan?.currency != null && plan.currency !== account.currency ? plan.currency : null;
    const order = useMemo(
        () => (plan === null || foreign !== null ? null : scannedOrder(plan, account.currency)),
        [account.currency, foreign, plan]
    );

    useLayoutEffect(() => {
        if (photo !== null) {
            scan(photo);
        }
    }, [photo, scan]);

    useEffect(() => {
        if (order === null) {
            return;
        }
        router.replace({
            params: {
                accountId: account.id,
                amount: String(order.price),
                currency: account.currency,
                date: String(order.purchaseDay.getTime()),
                installmentDraft: encodeInstallmentSeed(order),
                installments: "1",
            },
            pathname: "/transactions/create",
        });
    }, [account, order, router]);

    const close = () => router.back();
    const choose: BarAction = { icon: Image01Icon, label: t("installments.scan.choose"), onPress: chooseFromLibrary };
    const shown = phase.kind === "idle" || phase.kind === "picking" ? null : phase.photo;

    if (phase.kind === "scanning" || order !== null) {
        return (
            <ScanShell
                bottom={
                    <Button className="rounded-full" onPress={reset} size="md" variant="ghost">
                        {t("common.cancel")}
                    </Button>
                }
                onClose={close}
                overlay={limitToast}
            >
                {shown ? <PhotoStage box={stageBox(shown)} scanning tint={colors.tint} uri={shown.uri} /> : null}
                <StatusLine thinking waiting>
                    {t("installments.scan.reading")}
                </StatusLine>
            </ScanShell>
        );
    }

    if (phase.kind === "failed" || phase.kind === "review") {
        let primary: BarAction | null = choose;
        let secondary: BarAction | null = null;
        let message: string | null = null;
        if (phase.kind === "review") {
            message =
                foreign === null
                    ? t(FAILURES.unclear)
                    : t("installments.scan.currency", {
                          account: account.name,
                          currency: account.currency,
                          plan: foreign,
                      });
        } else {
            message = isLimitRefusal(phase.reason) ? null : t(FAILURES[phase.reason]);
            if (phase.reason === "notEntitled" && !entitled) {
                primary = { label: t("pro.action.see"), onPress: () => router.push("/paywall") };
            } else if (phase.reason === "quotaExceeded") {
                primary = null;
            } else if (phase.photo !== null && (phase.reason === "notEntitled" || RETRYABLE.has(phase.reason))) {
                primary = { label: t("receipt.action.retry"), onPress: retry };
                secondary = choose;
            }
        }
        return (
            <ScanShell
                bottom={<BottomBar primary={primary} secondary={secondary} />}
                onClose={close}
                overlay={limitToast}
            >
                {shown ? (
                    <PhotoStage box={stageBox(shown)} dimmed scanning={false} tint={colors.tint} uri={shown.uri} />
                ) : null}
                {message === null ? null : <StatusLine>{message}</StatusLine>}
            </ScanShell>
        );
    }

    return (
        <ScanShell
            bottom={<BottomBar disabled={phase.kind === "picking"} primary={choose} secondary={null} />}
            onClose={close}
            overlay={limitToast}
        >
            <Animated.View className="items-center gap-2 px-4" entering={FadeIn.duration(260)}>
                <Text className="font-sans-semibold text-foreground text-title text-center">
                    {t("installments.scan.import")}
                </Text>
                <Text className="text-muted text-center font-sans text-base">{t("installments.scan.intro")}</Text>
            </Animated.View>
        </ScanShell>
    );
}

export function InstallmentScanScreen({ accountId, photo }: { accountId?: string; photo?: string }) {
    const router = useRouter();
    const db = useDatabase();
    const { gate } = useAuthSession();
    const consent = useAiConsent(db, "aiConsentPlanScan");
    const [account] = useState(() => (accountId === undefined ? null : getAccountById(db, accountId)));
    const [picked] = useState(() => handedOffPhoto(photo));
    if (gate !== "signed-in") {
        return <ScanGateScreen failures={FAILURES} gate={gate} />;
    }
    if (consent !== "allowed") {
        return <AiConsentGate />;
    }
    if (account === null) {
        return (
            <ScanShell bottom={null} onClose={() => router.back()}>
                {null}
            </ScanShell>
        );
    }
    return <ScanFlow account={account} photo={picked} />;
}
