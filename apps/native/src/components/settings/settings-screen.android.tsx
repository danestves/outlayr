import type { ReactNode } from "react";
import { ScrollView } from "react-native";

import { Text } from "@/components/text";

// No inset to adjust: Android's opaque app bar already starts the content below it.
export function SettingsScreen({ children, footer }: { children: ReactNode; footer?: string }) {
    return (
        <ScrollView className="bg-m3-surface flex-1" contentContainerClassName="px-4 pb-safe-offset-10">
            {children}
            {footer ? (
                <Text className="text-caption text-m3-on-surface-variant pt-8 text-center leading-5">{footer}</Text>
            ) : null}
        </ScrollView>
    );
}
