import { Stack, useRouter } from "expo-router";

import { ScreenHeader } from "@/components/screen-header";
import { toolbarIcon } from "@/components/toolbar-icons";
import { useStageBack } from "@/components/transaction-form/stage/use-stage-back";
import { useTranslation } from "@/i18n/context";

import type { PurchaseToolbarProps } from "./new-purchase-toolbar";

// AppCompat's own arrow, already in every build: a new nano symbol would mean a native rebuild.
const BACK_ICON = { uri: "abc_ic_ab_back_material" };

// The modal's navigation icon is its X, so a later step swaps it for Back and moves Close to the right.
export function PurchaseToolbar({ onBack, title }: PurchaseToolbarProps) {
    const router = useRouter();
    const t = useTranslation();
    useStageBack(onBack);
    return (
        <>
            <Stack.Screen options={{ headerBackVisible: onBack === undefined }} />
            <ScreenHeader title={title} />
            {onBack === undefined ? null : (
                <>
                    <Stack.Toolbar placement="left">
                        <Stack.Toolbar.Button accessibilityLabel={t("common.back")} onPress={onBack}>
                            <Stack.Toolbar.Icon src={BACK_ICON} />
                        </Stack.Toolbar.Button>
                    </Stack.Toolbar>
                    <Stack.Toolbar placement="right">
                        <Stack.Toolbar.Button accessibilityLabel={t("common.close")} onPress={() => router.back()}>
                            <Stack.Toolbar.Icon {...toolbarIcon("close")} />
                        </Stack.Toolbar.Button>
                    </Stack.Toolbar>
                </>
            )}
        </>
    );
}
