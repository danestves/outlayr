import type { ReactNode, Ref } from "react";
import { ScrollView } from "react-native";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance } from "react-native";

import { Text } from "@/components/text";

interface SettingsScreenProps {
    children: ReactNode;
    footer?: string;
    onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollRef?: Ref<ScrollViewInstance>;
}

export function SettingsScreen({ children, footer, onScroll, scrollRef }: SettingsScreenProps) {
    return (
        <ScrollView
            className="bg-background flex-1"
            contentContainerClassName="px-5 pb-safe-offset-10"
            contentInsetAdjustmentBehavior="automatic"
            onScroll={onScroll}
            ref={scrollRef}
            scrollEventThrottle={16}
        >
            {children}
            {footer ? <Text className="text-muted text-subtitle pt-8 text-center">{footer}</Text> : null}
        </ScrollView>
    );
}
