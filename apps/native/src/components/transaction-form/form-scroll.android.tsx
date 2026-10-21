import { createContext, use, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from "react-native";
import type { ScrollViewInstance, ViewInstance } from "react-native";

import { InlineFailure } from "@/components/form/inline-failure";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useMaterialColors } from "@/theme/use-material-colors";

import type {
    FormScroll as FormScrollBase,
    FormScrollItem as FormScrollItemBase,
    FormScrollStageTarget as FormScrollStageTargetBase,
} from "./form-scroll";

const KEYBOARD_GAP = 16;

interface FormScrollControl {
    reveal: (y: number, height: number) => void;
    stageTo: (y: number) => void;
}

const FormScrollContext = createContext<FormScrollControl | null>(null);

// Edge-to-edge means the window never resizes for the keyboard, so nothing else moves the note out from under it.
function useKeyboardOverlap(
    frame: RefObject<ViewInstance | null>,
    scroll: RefObject<ScrollViewInstance | null>,
    offset: RefObject<number>
) {
    const [overlap, setOverlap] = useState(0);

    useEffect(() => {
        const show = Keyboard.addListener("keyboardDidShow", (event) => {
            frame.current?.measureInWindow((_x, y, _width, height) => {
                const covered = Math.max(0, y + height - event.endCoordinates.screenY);
                setOverlap(covered);
                const input = TextInput.State.currentlyFocusedInput();
                const content = scroll.current?.getInnerViewRef();
                if (input == null || content == null || covered === 0) {
                    return;
                }
                input.measureLayout(content, (_left, top, _inputWidth, inputHeight) => {
                    const visibleBottom = offset.current + height - covered;
                    const fieldBottom = top + inputHeight + KEYBOARD_GAP;
                    if (fieldBottom > visibleBottom) {
                        scroll.current?.scrollTo({ animated: true, y: offset.current + fieldBottom - visibleBottom });
                    }
                });
            });
        });
        const hide = Keyboard.addListener("keyboardDidHide", () => setOverlap(0));
        return () => {
            show.remove();
            hide.remove();
        };
    }, [frame, offset, scroll]);

    return overlap;
}

// No identity curtain: below Android's opaque app bar it is a band with a hard top edge. No blur behind the picker
// either: a Material sheet brings its own scrim.
export const FormScroll: typeof FormScrollBase = ({ bottomInset, children, failure, sheet }) => {
    const m3 = useMaterialColors();
    const sheetSurface = useSheetSurface();
    const stripFill = sheet ? sheetSurface : m3.surface;
    const frame = useRef<ViewInstance>(null);
    const scroll = useRef<ScrollViewInstance>(null);
    const offset = useRef(0);
    const visibleHeight = useRef(0);
    const overlap = useKeyboardOverlap(frame, scroll, offset);
    const [failureHeight, setFailureHeight] = useState(0);

    const control = useMemo<FormScrollControl>(
        () => ({
            reveal: (y, height) => {
                const hidden = y + height + KEYBOARD_GAP - (offset.current + visibleHeight.current);
                if (hidden > 0) {
                    scroll.current?.scrollTo({ animated: true, y: offset.current + hidden });
                }
            },
            stageTo: (y) => scroll.current?.scrollTo({ animated: false, y }),
        }),
        []
    );

    return (
        <FormScrollContext value={control}>
            <View className="flex-1" ref={frame}>
                <ScrollView
                    contentContainerStyle={{
                        gap: 16,
                        paddingBottom: bottomInset + overlap,
                        paddingHorizontal: 20,
                        paddingTop: failure === null ? 0 : failureHeight,
                    }}
                    // The note's return key writes a newline, so a drag is the only way to put the keyboard away.
                    keyboardDismissMode="on-drag"
                    keyboardShouldPersistTaps="handled"
                    onLayout={(event) => {
                        visibleHeight.current = event.nativeEvent.layout.height;
                    }}
                    onScroll={(event) => {
                        offset.current = event.nativeEvent.contentOffset.y;
                    }}
                    ref={scroll}
                    scrollEventThrottle={32}
                >
                    {children}
                </ScrollView>

                {/* The save's own line, pinned under the app bar or the sheet's header. */}
                <View
                    className="absolute top-0 right-0 left-0 px-5 pt-2"
                    onLayout={(e) => setFailureHeight(e.nativeEvent.layout.height)}
                    pointerEvents="none"
                    style={{
                        backgroundColor: failure === null ? "transparent" : stripFill,
                        borderBottomColor: m3.outlineVariant,
                        borderBottomWidth: failure === null ? 0 : StyleSheet.hairlineWidth,
                    }}
                >
                    <InlineFailure message={failure} />
                </View>
            </View>
        </FormScrollContext>
    );
};

// `reveal` scrolls the item into view as it mounts: the pinned stage can leave it below the fold.
export const FormScrollItem: typeof FormScrollItemBase = ({ children, reveal = false }) => {
    const control = use(FormScrollContext);
    const pending = useRef(reveal);
    return (
        <View
            onLayout={(event) => {
                if (pending.current) {
                    pending.current = false;
                    control?.reveal(event.nativeEvent.layout.y, event.nativeEvent.layout.height);
                }
            }}
        >
            {children}
        </View>
    );
};

export const FormScrollStageTarget: typeof FormScrollStageTargetBase = () => {
    const control = use(FormScrollContext);
    const arrived = useRef(false);
    return (
        <View
            onLayout={(event) => {
                if (!arrived.current) {
                    arrived.current = true;
                    control?.stageTo(event.nativeEvent.layout.y);
                }
            }}
        />
    );
};
