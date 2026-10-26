import { useAtom, useAtomMount, useAtomValue } from "@effect/atom-react/Hooks";
import { RegistryContext } from "@effect/atom-react/RegistryContext";
import * as Atom from "effect/reactivity/Atom";
import * as Schema from "effect/Schema";
import { use, useId } from "react";
import { makeMutable, withSpring } from "react-native-reanimated";
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

// Two atoms: every picker tap replaces `draft`, and merging them would re-render the whole form per tap.
const draftAtom = Atom.make(EMPTY_DRAFT).pipe(Atom.keepAlive, Atom.withLabel("identity-draft:draft"));
const pickerOpenAtom = Atom.make(false).pipe(Atom.keepAlive, Atom.withLabel("identity-draft:picker-open"));

const flyUpAtom = Atom.make(() => ({ floatProgress: makeMutable(0), sheetHeight: makeMutable(0) })).pipe(
    Atom.keepAlive,
    Atom.withLabel("identity-draft:fly-up")
);

// A JS latch, not `sheetHeight.get()`: two layouts landing before the UI thread syncs would both see the 0.
const sheetMeasuredAtom = Atom.make(false).pipe(Atom.keepAlive, Atom.withLabel("identity-draft:sheet-measured"));

const IdentitySeedJson = Schema.fromJsonString(
    Schema.Struct({
        color: Schema.NullOr(Schema.String),
        emoji: Schema.NullOr(Schema.String),
        icon: Schema.NullOr(Schema.String),
        photoColor: Schema.NullOr(Schema.String),
        photoUri: Schema.NullOr(Schema.String),
    })
);
const encodeIdentitySeed = Schema.encodeSync(IdentitySeedJson);
const decodeIdentitySeed = Schema.decodeSync(IdentitySeedJson);

const SEED_SEPARATOR = "|";

const identitySeedFamily = Atom.family((key: string) =>
    Atom.make((get) => {
        const seed = key.slice(key.indexOf(SEED_SEPARATOR) + 1);
        if (seed !== "") {
            get.set(draftAtom, decodeIdentitySeed(seed));
        }
    }).pipe(Atom.withLabel("identity-draft:seed"))
);

export function useIdentitySeed(seed: IdentitySelection | null): void {
    const instance = useId();
    useAtomMount(identitySeedFamily(`${instance}${SEED_SEPARATOR}${seed === null ? "" : encodeIdentitySeed(seed)}`));
}

export const identityPickerResetAtom = Atom.make((get) => {
    if (get.once(pickerOpenAtom)) {
        get.set(pickerOpenAtom, false);
        get.once(flyUpAtom).floatProgress.set(withSpring(0, RETURN_SPRING));
    }
}).pipe(Atom.withLabel("identity-draft:picker-reset"));

export function useIdentityDraft(): IdentityDraftValue {
    const [draft, setDraft] = useAtom(draftAtom);
    return { draft, setDraft };
}

export function useIdentityReads() {
    const registry = use(RegistryContext);
    return {
        draft: () => registry.get(draftAtom),
        pickerOpen: () => registry.get(pickerOpenAtom),
    };
}

export function useIdentityFlyUp(): IdentityFlyUpValue {
    const registry = use(RegistryContext);
    const haptics = useHaptics();
    const pickerOpen = useAtomValue(pickerOpenAtom);
    const { floatProgress, sheetHeight } = useAtomValue(flyUpAtom);

    return {
        floatProgress,
        pickerOpen,
        // Idempotent: the opener, the picker route's mount and every dismissal signal all call this, and a second
        // call would restart the spring from zero velocity mid-flight.
        setPickerOpen: (open) => {
            if (registry.get(pickerOpenAtom) === open) {
                return;
            }
            if (open) {
                // No haptic on the return: UIKit starts dismissing before it decides whether to put the sheet
                // back, so an aborted detent drag would tap for a dismissal that never happened.
                haptics("light");
            }
            registry.set(pickerOpenAtom, open);
            floatProgress.set(withSpring(open ? 1 : 0, open ? LAUNCH_SPRING : RETURN_SPRING));
        },
        setSheetHeight: (height) => {
            // The first measurement lands hard: springing off 0 would drag the hero's target through every height.
            if (registry.get(sheetMeasuredAtom)) {
                sheetHeight.set(withSpring(height, LAUNCH_SPRING));
                return;
            }
            registry.set(sheetMeasuredAtom, true);
            sheetHeight.set(height);
        },
        sheetHeight,
    };
}
