import { View } from "react-native";

import { Text } from "@/components/text";
import { cn } from "@/components/tw";

type MetaTone = "danger" | "info" | "muted" | "warning";

// Never `--warning` as text: it is a 1.51:1 fill, and `src/theme/token-contrast.test.ts` fails any text utility on it.
const TONE = {
    danger: "text-danger",
    info: "text-info-foreground",
    muted: "text-muted",
    warning: "text-warning-foreground",
} as const satisfies Record<MetaTone, string>;

interface MetaLineProps {
    detail?: string;
    qualifier?: string;
    /** The caller owns the press: a line is wholly pressable or not at all. */
    qualifierIsAction?: boolean;
    statement: string;
    tone?: MetaTone;
}

export function MetaLine({ detail, qualifier, qualifierIsAction, statement, tone = "muted" }: MetaLineProps) {
    return (
        <View
            accessibilityRole={tone === "danger" || tone === "warning" ? "alert" : undefined}
            className="border-separator border-t pt-2.5"
        >
            <View className="flex-row items-baseline gap-3">
                <Text className={cn("text-footnote flex-1 leading-snug", TONE[tone])}>{statement}</Text>
                {qualifier == null ? null : (
                    <Text
                        className={cn(
                            "text-footnote",
                            qualifierIsAction ? "text-tint font-sans-semibold" : "text-muted"
                        )}
                    >
                        {qualifier}
                    </Text>
                )}
            </View>
            {detail == null ? null : <Text className="text-label text-muted pt-1 font-mono">{detail}</Text>}
        </View>
    );
}
