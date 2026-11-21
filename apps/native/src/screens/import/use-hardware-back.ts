import { BackHandler } from "react-native";

import { useEventListener } from "@/lib/lifecycle";

/** Android's back button ignores `gestureEnabled`, so the screens that write the ledger catch it themselves. */
export function useHardwareBack(onBack: () => void) {
    useEventListener(
        (listener: () => boolean) => {
            const subscription = BackHandler.addEventListener("hardwareBackPress", listener);
            return () => subscription.remove();
        },
        () => {
            onBack();
            return true;
        }
    );
}
