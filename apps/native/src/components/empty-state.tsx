import { createContext, use } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";

import { ghostInk } from "@/theme/empty-state-ink";
import type { EmptyStateTier, GhostInk } from "@/theme/empty-state-ink";
import { useColors } from "@/theme/use-colors";

import { MonoLabel } from "./mono-label";
import { Text } from "./text";
import { cn } from "./tw";

const MarkInkContext = createContext<GhostInk | null>(null);

export function useMark(): GhostInk {
    const inherited = use(MarkInkContext);
    const colors = useColors();
    return inherited ?? ghostInk(colors.foreground, "takeover");
}

export function MarkInk({ tier, children }: { tier: EmptyStateTier; children: ReactNode }) {
    const colors = useColors();
    const ink = ghostInk(colors.foreground, tier);
    return <MarkInkContext.Provider value={ink}>{children}</MarkInkContext.Provider>;
}

interface EmptyStateProps {
    action?: ReactNode;
    body: string;
    className?: string;
    eyebrow?: string;
    mark: ReactNode;
    tier: EmptyStateTier;
    title?: string;
}

function tierContent({ tier, mark, body, title, eyebrow, action, className }: EmptyStateProps): ReactNode {
    if (tier === "takeover") {
        return <Takeover action={action} body={body} className={className} mark={mark} title={title} />;
    }
    if (tier === "inFlow") {
        return <InFlow body={body} className={className} eyebrow={eyebrow} mark={mark} />;
    }
    return <InsetRow body={body} className={className} mark={mark} />;
}

export function EmptyState(props: EmptyStateProps) {
    return <MarkInk tier={props.tier}>{tierContent(props)}</MarkInk>;
}

const LARGE_TITLE_LIFT = -14;

function Takeover({
    mark,
    body,
    title,
    action,
    className,
}: Pick<EmptyStateProps, "mark" | "body" | "title" | "action" | "className">) {
    return (
        <View className={cn("bg-background flex-1 items-center justify-center px-8", className)}>
            <View className="w-full items-center" style={{ transform: [{ translateY: LARGE_TITLE_LIFT }] }}>
                {mark}
                {title ? (
                    <Text className="font-sans-semibold text-foreground text-title pt-7 pb-1.5">{title}</Text>
                ) : null}
                <Text className="font-sans-medium text-muted text-subtitle max-w-70 text-center">{body}</Text>
                {action ? <View className="pt-7">{action}</View> : null}
            </View>
        </View>
    );
}

function InFlow({ mark, body, eyebrow, className }: Pick<EmptyStateProps, "mark" | "body" | "eyebrow" | "className">) {
    return (
        <View className={className}>
            <View className="bg-border h-px w-full" />
            <View className="items-center gap-2.5 py-6">
                {eyebrow ? <MonoLabel>{eyebrow}</MonoLabel> : null}
                {mark}
                <Text className="font-sans-medium text-muted text-subtitle max-w-70 text-center">{body}</Text>
            </View>
            <View className="bg-border h-px w-full" />
        </View>
    );
}

function InsetRow({ mark, body, className }: Pick<EmptyStateProps, "mark" | "body" | "className">) {
    return (
        <View className={cn("flex-row items-center gap-3 py-4", className)}>
            {mark}
            <Text className="text-muted text-subtitle flex-1 leading-snug">{body}</Text>
        </View>
    );
}
