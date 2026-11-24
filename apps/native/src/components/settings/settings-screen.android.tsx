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

// No inset to adjust: Android's opaque app bar already starts the content below it.
export function SettingsScreen({ children, footer, onScroll, scrollRef }: SettingsScreenProps) {
    return (
        <ScrollView
            className="bg-m3-surface flex-1"
            contentContainerClassName="px-4 pb-safe-offset-10"
            onScroll={onScroll}
            ref={scrollRef}
            scrollEventThrottle={16}
        >
            {children}
            {footer ? (
                <Text className="text-caption text-m3-on-surface-variant pt-8 text-center leading-5">{footer}</Text>
            ) : null}
        </ScrollView>
    );
}
