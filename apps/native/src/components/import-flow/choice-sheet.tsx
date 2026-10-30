import { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useImperativeHandle, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { Platform, ScrollView, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { SheetHeader } from "@/components/import-sheet/sheet-header";
import { Text } from "@/components/text";

export interface ChoiceSheetHandle {
    dismiss: () => void;
    present: () => void;
}

interface ChoiceSheetProps {
    children: ReactNode;
    detail?: string;
    leading?: ReactNode;
    onDismiss?: () => void;
    ref?: Ref<ChoiceSheetHandle>;
    title: string;
}

/** The same sheet the CSV import uses, so every picker in the import flow looks and dismisses alike. */
export function ChoiceSheet({ children, detail, leading, onDismiss, ref, title }: ChoiceSheetProps) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const [presented, setPresented] = useState(false);
    // SAFETY: declared in global.css for both schemes, as in `import-sheet`.
    const backgroundColor = useCSSVariable("--background") as string;

    useImperativeHandle(ref, () => ({
        dismiss() {
            sheetRef.current?.dismiss();
        },
        present() {
            setPresented(true);
            sheetRef.current?.present();
        },
    }));

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: Platform.OS === "ios" ? `${backgroundColor}FA` : backgroundColor }}
            enableDynamicSizing
            enablePanDownToClose
            onDismiss={() => {
                setPresented(false);
                onDismiss?.();
            }}
            ref={sheetRef}
        >
            {presented ? (
                <View className="max-h-[640px] gap-2 pb-6">
                    <SheetHeader onClose={() => sheetRef.current?.dismiss()} title={title} />
                    {detail ? (
                        <View className="flex-row items-center gap-3 px-5 pb-1">
                            {leading}
                            <Text className="text-muted text-subtitle flex-1">{detail}</Text>
                        </View>
                    ) : null}
                    <ScrollView contentContainerClassName="px-5" showsVerticalScrollIndicator={false}>
                        {children}
                    </ScrollView>
                </View>
            ) : null}
        </BottomSheetModal>
    );
}
