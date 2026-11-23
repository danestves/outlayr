import { Stack } from "expo-router";

import { CloseToolbar } from "@/components/close-toolbar";
import { ScreenHeader } from "@/components/screen-header";
import { useTranslation } from "@/i18n/context";

export interface PurchaseToolbarProps {
    onBack?: () => void;
    title: string;
}

export function PurchaseToolbar({ onBack, title }: PurchaseToolbarProps) {
    const t = useTranslation();
    return (
        <>
            <ScreenHeader title={title} />
            {onBack === undefined ? (
                <CloseToolbar placement="left" />
            ) : (
                <>
                    <Stack.Toolbar placement="left">
                        <Stack.Toolbar.Button accessibilityLabel={t("common.back")} onPress={onBack}>
                            <Stack.Toolbar.Icon sf="chevron.left" />
                        </Stack.Toolbar.Button>
                    </Stack.Toolbar>
                    <CloseToolbar placement="right" />
                </>
            )}
        </>
    );
}
