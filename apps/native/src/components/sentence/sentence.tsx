import { createContext, useMemo, use } from "react";
import type { ReactNode } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";

import { parseSentence } from "@/domain/sentence-template";

import { Text } from "../text";
import { cn } from "../tw";
import { clusterEntering } from "./sentence-motion";

interface SentenceStyle {
    textClassName: string;
}

const SentenceContext = createContext<SentenceStyle | null>(null);

export function useSentenceStyle(): SentenceStyle {
    const value = use(SentenceContext);
    if (value === null) {
        throw new Error("A sentence part must render inside a <Sentence>");
    }
    return value;
}

interface SentenceProps<TSlot extends string> {
    gapClassName?: string;
    /** A record over the union, not named children, so a forgotten slot is a type error rather than a missing fact. */
    slots: Readonly<Record<TSlot, ReactNode>>;
    template: string;
    textClassName?: string;
}

// `text-grammar` reaches only the template's connector words: every slot fill names its own colour.
const DEFAULT_TEXT = "font-sans-medium text-[26px] leading-[38px] tracking-tight text-grammar";

export function Sentence<TSlot extends string>({
    gapClassName = "gap-x-2",
    slots,
    template,
    textClassName = DEFAULT_TEXT,
}: SentenceProps<TSlot>) {
    const style = useMemo(() => ({ textClassName }), [textClassName]);
    const clusters = useMemo(() => parseSentence(template), [template]);
    const fills = useMemo(() => new Map<string, ReactNode>(Object.entries(slots)), [slots]);

    return (
        <SentenceContext value={style}>
            <View className={cn("flex-row flex-wrap items-baseline", gapClassName)}>
                {clusters.map((cluster, index) => (
                    <Animated.View
                        className="flex-row items-baseline"
                        entering={clusterEntering(index)}
                        key={`${index}:${cluster.atoms.map((atom) => atom.value).join(",")}`}
                    >
                        {cluster.atoms.map((atom, atomIndex) =>
                            atom.kind === "slot" ? (
                                <View key={`${atomIndex}:${atom.value}`}>{fills.get(atom.value) ?? null}</View>
                            ) : (
                                <Text className={textClassName} key={`${atomIndex}:${atom.value}`}>
                                    {atom.value}
                                </Text>
                            )
                        )}
                    </Animated.View>
                ))}
            </View>
        </SentenceContext>
    );
}
