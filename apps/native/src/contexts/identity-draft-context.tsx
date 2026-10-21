import { createContext, use, useCallback, useMemo, useRef, useState } from "react";
import { useSharedValue, withSpring } from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

import type { IdentitySelection } from "@/components/identity-picker-shared";
import { useHaptics } from "@/lib/use-haptics";

/** Launch spring (response 0.4, dampingFraction 0.85) as stiffness/damping. */
export const LAUNCH_SPRING = { damping: 27, mass: 1, stiffness: 246 } as const;
// Not the launch reversed: it must rest (~290ms) inside the ~350ms UIKit takes to dismiss the sheet.
const RETURN_SPRING = { damping: 32, mass: 1, stiffness: 300 } as const;

interface IdentityDraftValue {
    draft: IdentitySelection;
    // Takes an updater: an async writer (a fetched logo) must re-read the draft the seeding effect may have replaced.
    setDraft: (next: IdentitySelection | ((previous: IdentitySelection) => IdentitySelection)) => void;
}

interface IdentityFlyUpValue {
    /** 0 resting, 1 floated. */
    floatProgress: SharedValue<number>;
    pickerOpen: boolean;
    setPickerOpen: (open: boolean) => void;
    setSheetHeight: (height: number) => void;
    /** Points, 0 until first layout. The sheet's detents are fractional, so it varies by device. */
    sheetHeight: SharedValue<number>;
}

export const EMPTY_DRAFT: IdentitySelection = {
    color: null,
    emoji: null,
    icon: null,
    photoColor: null,
    photoUri: null,
};

const OUTSIDE_PROVIDER = "useIdentityDraft and useIdentityFlyUp must be used within IdentityDraftProvider";

const IdentityDraftContext = createContext<IdentityDraftValue | null>(null);
const IdentityFlyUpContext = createContext<IdentityFlyUpValue | null>(null);

// Two contexts: every picker tap replaces `draft`, and merging them would re-render the whole form per tap.
export function IdentityDraftProvider({ children }: { children: React.ReactNode }) {
    const haptics = useHaptics();
    const [draft, setDraft] = useState<IdentitySelection>(EMPTY_DRAFT);
    const [pickerOpen, setPickerOpenState] = useState(false);
    const floatProgress = useSharedValue(0);
    const sheetHeight = useSharedValue(0);

    // Idempotent: the opener, the picker route's mount and every dismissal signal all call this, and a second call
    // would restart the spring from zero velocity mid-flight.
    const openRef = useRef(false);
    const setPickerOpen = useCallback(
        (open: boolean) => {
            if (openRef.current === open) {
                return;
            }
            openRef.current = open;
            if (open) {
                // No haptic on the return: UIKit starts dismissing before it decides whether to put the sheet
                // back, so an aborted detent drag would tap for a dismissal that never happened.
                haptics("light");
            }
            setPickerOpenState(open);
            floatProgress.set(withSpring(open ? 1 : 0, open ? LAUNCH_SPRING : RETURN_SPRING));
        },
        [floatProgress, haptics]
    );

    // A JS latch, not `sheetHeight.get()`: two layouts landing before the UI thread syncs would both see the 0.
    const sheetMeasured = useRef(false);
    const setSheetHeight = useCallback(
        (height: number) => {
            // The first measurement lands hard: springing off 0 would drag the hero's target through every height.
            if (sheetMeasured.current) {
                sheetHeight.set(withSpring(height, LAUNCH_SPRING));
                return;
            }
            sheetMeasured.current = true;
            sheetHeight.set(height);
        },
        [sheetHeight]
    );

    const draftValue = useMemo(() => ({ draft, setDraft }), [draft]);
    const flyUpValue = useMemo(
        () => ({
            floatProgress,
            pickerOpen,
            setPickerOpen,
            setSheetHeight,
            sheetHeight,
        }),
        [pickerOpen, setPickerOpen, floatProgress, sheetHeight, setSheetHeight]
    );

    return (
        <IdentityDraftContext.Provider value={draftValue}>
            <IdentityFlyUpContext.Provider value={flyUpValue}>{children}</IdentityFlyUpContext.Provider>
        </IdentityDraftContext.Provider>
    );
}

export function useIdentityDraft(): IdentityDraftValue {
    const value = use(IdentityDraftContext);
    if (value == null) {
        throw new Error(OUTSIDE_PROVIDER);
    }
    return value;
}

export function useIdentityFlyUp(): IdentityFlyUpValue {
    const value = use(IdentityFlyUpContext);
    if (value == null) {
        throw new Error(OUTSIDE_PROVIDER);
    }
    return value;
}
