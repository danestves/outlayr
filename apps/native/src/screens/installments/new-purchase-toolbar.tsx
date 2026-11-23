import { Stack } from "expo-router";
import { useWindowDimensions } from "react-native";

import { CloseToolbar } from "@/components/close-toolbar";
import { HEADER_HEIGHT } from "@/components/editor-style";
import { ScreenHeader } from "@/components/screen-header";
import { useTranslation } from "@/i18n/context";
import { heightDetent, LARGE_ONLY } from "@/lib/sheet-detents";

export interface PurchaseToolbarProps {
    contentHeight: number | null;
    onBack?: () => void;
    title: string;
}

export function PurchaseToolbar({ contentHeight, onBack, title }: PurchaseToolbarProps) {
    const t = useTranslation();
    const { height: windowHeight } = useWindowDimensions();
    // A single detent, re-declared per step: UIKit applies a selected detent only once.
    const detents = contentHeight === null ? LARGE_ONLY : [heightDetent(HEADER_HEIGHT + contentHeight, windowHeight)];
    return (
        <>
            <Stack.Screen options={{ sheetAllowedDetents: detents }} />
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
