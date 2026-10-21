import { Host, RNHostView, ScrollView, useNativeState, VStack } from "@expo/ui/swift-ui";
import {
    animation,
    blur,
    id as scrollId,
    onAppear,
    padding,
    scrollDismissesKeyboard,
    scrollPosition,
    scrollTargetLayout,
} from "@expo/ui/swift-ui/modifiers";
import type { ReactElement, ReactNode } from "react";
import { createContext, use, useState } from "react";
import { StyleSheet, View } from "react-native";

import { FLY_BACK, FLY_UP, FORM_BLUR_RADIUS, HEADER_HEIGHT } from "@/components/editor-style";
import { InlineFailure } from "@/components/form/inline-failure";
import { useColors } from "@/theme/use-colors";
import { useIsDark } from "@/theme/use-is-dark";

import { CURTAIN_LAYER_SIZE, curtainGradient } from "../identity-curtain";

export interface FormScrollProps {
    blurred: boolean;
    bottomInset: number;
    children: ReactNode;
    curtainHues: string[] | null;
    failure: string | null;
    /** Large text: the stage scrolls inline, and the form follows it to each new step. */
    followsStage: boolean;
    /** Android only: pins the failure strip on the sheet's surface. */
    sheet?: boolean;
}

type StageScroll = ReturnType<typeof useNativeState<string | null>>;

const StageScrollContext = createContext<StageScroll | null>(null);

export function FormScroll({ blurred, bottomInset, children, curtainHues, failure, followsStage }: FormScrollProps) {
    const colors = useColors();
    const isDark = useIsDark();
    const stageScroll = useNativeState<string | null>(null);
    const [failureHeight, setFailureHeight] = useState(0);

    return (
        <StageScrollContext value={stageScroll}>
            {/* The curtain is the Host's background: a sibling would hide the content from the scroll-edge lookup. */}
            <Host
                style={{
                    backgroundColor: colors.background,
                    experimental_backgroundImage: curtainGradient(curtainHues, isDark),
                    experimental_backgroundRepeat: "no-repeat",
                    experimental_backgroundSize: CURTAIN_LAYER_SIZE,
                    flex: 1,
                }}
            >
                {/* Blur the ScrollView, not the Host, or the curtain (its background) blurs too. */}
                <ScrollView
                    modifiers={[
                        blur(blurred ? FORM_BLUR_RADIUS : 0),
                        animation(blurred ? FLY_UP : FLY_BACK, blurred),
                        // The note's return key writes a newline, so a drag is the only way to put the keyboard away.
                        scrollDismissesKeyboard("immediately"),
                        ...(followsStage ? [scrollPosition(stageScroll, { anchor: "top" })] : []),
                    ]}
                >
                    <VStack
                        modifiers={[
                            ...(followsStage ? [scrollTargetLayout()] : []),
                            padding({
                                bottom: bottomInset,
                                horizontal: 20,
                                top: failure === null ? 0 : failureHeight,
                            }),
                        ]}
                        spacing={16}
                    >
                        {children}
                    </VStack>
                </ScrollView>
            </Host>

            {/* A strip under the header, not a pill, so it never reads as a row of the form. */}
            <View
                className="absolute right-0 left-0 px-5 pt-2"
                onLayout={(e) => setFailureHeight(e.nativeEvent.layout.height)}
                pointerEvents="none"
                style={{
                    backgroundColor: failure === null ? "transparent" : colors.background,
                    borderBottomColor: colors.separator,
                    borderBottomWidth: failure === null ? 0 : StyleSheet.hairlineWidth,
                    top: HEADER_HEIGHT,
                }}
            >
                <InlineFailure message={failure} />
            </View>
        </StageScrollContext>
    );
}

/** `reveal` is read only by the Android implementation. */
export function FormScrollItem({ children }: { children: ReactElement; reveal?: boolean }) {
    return <RNHostView matchContents>{children}</RNHostView>;
}

/** Mounting it scrolls the form there, so key it by the stage's turn. */
export function FormScrollStageTarget({ id }: { id: string }) {
    const stageScroll = use(StageScrollContext);
    return <VStack modifiers={[scrollId(id), onAppear(() => stageScroll?.set(id))]}>{null}</VStack>;
}
