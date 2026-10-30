import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

import { useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";

const SHAKE_MS = 500;

type MissingSlot = "amount" | "category" | "rate";

const REQUIRED_KEYS = {
    amount: "transaction.amount.required",
    category: "transaction.category.required",
    rate: "transaction.rate.required",
} as const satisfies Record<MissingSlot, string>;

// Save is never `disabled`: pressing an incomplete entry says what is missing. Flagging only marks the word; the
// caller lands on the first reason, not whichever flagged last.
export function useMissingFlags() {
    const t = useTranslation();
    const haptics = useHaptics();
    const [flagged, setFlagged] = useState({ amount: false, category: false });
    const [shaking, setShaking] = useState({ amount: false, category: false, rate: false });
    const timers = useRef(new Map<MissingSlot, ReturnType<typeof setTimeout>>());

    // oxlint-disable-next-line outlayr/react-effect-budget -- clears the pending shake timers when the form unmounts
    useEffect(
        () => () => {
            for (const timer of timers.current.values()) {
                clearTimeout(timer);
            }
        },
        []
    );

    const flag = (slot: MissingSlot, announce = true) => {
        haptics("error");
        if (announce) {
            AccessibilityInfo.announceForAccessibility(t(REQUIRED_KEYS[slot]));
        }
        if (slot !== "rate") {
            setFlagged((current) => ({ ...current, [slot]: true }));
        }
        setShaking((current) => ({ ...current, [slot]: true }));
        timers.current.set(
            slot,
            setTimeout(() => setShaking((current) => ({ ...current, [slot]: false })), SHAKE_MS)
        );
    };

    const clear = (slot: "amount" | "category") => {
        setFlagged((current) => (current[slot] ? { ...current, [slot]: false } : current));
    };

    return {
        amount: { flagged: flagged.amount, shake: shaking.amount },
        category: { flagged: flagged.category, shake: shaking.category },
        clear,
        flag,
        rateShake: shaking.rate,
    };
}
