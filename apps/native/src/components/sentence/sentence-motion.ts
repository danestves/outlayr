import { Easing, Keyframe, ReduceMotion } from "react-native-reanimated";

export const EASE = Easing.bezier(0.645, 0.045, 0.355, 1);

const WRITE_MS = 260;

// `MARK_MOTION.stagger` (90ms) suits four blocks; across a sentence's dozen clusters the full stop would land a
// second after the first word.
const CLUSTER_STAGGER_MS = 34;

export const SENTENCE_DRAW = { duration: 300, easing: EASE } as const;

export const SENTENCE_WASH = { duration: 180, easing: EASE } as const;

const RISE = 10;

export function clusterEntering(index: number) {
    return new Keyframe({
        0: { opacity: 0, transform: [{ translateY: RISE }] },
        100: { opacity: 1, transform: [{ translateY: 0 }] },
    })
        .duration(WRITE_MS)
        .delay(Math.max(0, index) * CLUSTER_STAGGER_MS)
        .reduceMotion(ReduceMotion.System);
}

export function revealEntering() {
    return new Keyframe({
        0: { opacity: 0, transform: [{ translateY: RISE }] },
        100: { opacity: 1, transform: [{ translateY: 0 }] },
    })
        .duration(WRITE_MS)
        .reduceMotion(ReduceMotion.System);
}

// No `exiting` on purpose: Reanimated keeps an exiting view mounted, so two values in a wrapping row would hold the
// sentence at both widths for the fade and reflow every word after them.
export function valueEntering() {
    return new Keyframe({
        0: { opacity: 0, transform: [{ translateY: RISE * 0.6 }] },
        100: { opacity: 1, transform: [{ translateY: 0 }] },
    })
        .duration(WRITE_MS)
        .reduceMotion(ReduceMotion.System);
}
