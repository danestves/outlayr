import { usePanGesture } from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

export function useScrubGesture({
    commit,
    onScrub,
    report,
    reported,
    setScrubIndex,
}: {
    commit: (index: number) => void;
    onScrub: (index: number | null) => void;
    report: (x: number) => void;
    reported: SharedValue<number>;
    setScrubIndex: (index: number | null) => void;
}) {
    return usePanGesture({
        minDistance: 0,
        onBegin: (event) => {
            "worklet";
            report(event.x);
        },
        onFinalize: () => {
            "worklet";
            const landed = reported.get();
            reported.set(-1);
            scheduleOnRN(setScrubIndex, null);
            scheduleOnRN(onScrub, null);
            if (landed >= 0) {
                scheduleOnRN(commit, landed);
            }
        },
        onUpdate: (event) => {
            "worklet";
            report(event.x);
        },
        shouldCancelWhenOutside: false,
    });
}
