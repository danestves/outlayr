import { useEffect } from "react";
import { BackHandler } from "react-native";

/** Android's back button ignores `gestureEnabled`, so the screens that write the ledger catch it themselves. */
export function useHardwareBack(onBack: () => void) {
    // oxlint-disable-next-line outlayr/react-effect-budget -- the hardware back button has no declarative block
    useEffect(() => {
        const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
            onBack();
            return true;
        });
        return () => subscription.remove();
    }, [onBack]);
}
