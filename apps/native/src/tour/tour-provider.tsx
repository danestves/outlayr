import { TOUR_ANALYTICS_AT_MS } from "@outlayr/backend/confect/legal";
import * as Effect from "effect/Effect";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useWindowDimensions } from "react-native";
import type { ViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMirror, useOnMount, useTimers } from "@/lib/lifecycle";
import { posthog } from "@/lib/posthog";

import type { TourRect } from "./callout-layout";
import { measureInWindow, rectVisibleIn } from "./measure";
import { stepsFor } from "./steps";
import type { TourStepTarget } from "./steps";
import { TourContext } from "./tour-context";
import type { ActiveTour, TourContextValue, TourStage, TourTargetEntry } from "./tour-context";
import { slotRect } from "./tour-geometry";
import { TourOverlay } from "./tour-overlay";
import { readSeenTours, writeSeenTours } from "./tour-state";
import type { TourId } from "./tour-state";
import { useTourBlocked } from "./use-tour-blocked";

type TourEvent = Parameters<NonNullable<typeof posthog>["capture"]>;

// A step whose target never settles must not hold the tour open, since nothing on screen can close it.
const RESOLVE_DEADLINE_MS = 2500;
// A screen still mounting can report a target where it sat before the reveal scrolled it into view.
const RESOLVE_ATTEMPTS = 3;
const RETRY_AFTER_MS = 150;

interface ResolvedTarget {
    radius: number;
    rect: TourRect;
}

const report = (...[event, properties]: TourEvent) => {
    if (Date.now() >= TOUR_ANALYTICS_AT_MS) {
        posthog?.capture(event, properties);
    }
};

export function TourProvider({ children }: { children: ReactNode }) {
    const [seen, setSeen] = useState<ReadonlySet<TourId> | null>(null);
    const [active, setActive] = useState<ActiveTour | null>(null);
    const [stage, setStage] = useState<TourStage | null>(null);
    const [replayPending, setReplayPending] = useState(false);
    const blocked = useTourBlocked();
    const timers = useTimers();
    const targets = useRef(new Map<string, TourTargetEntry>());
    const window = useWindowDimensions();
    const insets = useSafeAreaInsets();

    useOnMount(() => {
        let alive = true;
        Effect.runPromise(readSeenTours()).then((ids) => {
            if (alive) {
                setSeen(ids);
            }
        });
        return () => {
            alive = false;
        };
    });

    const markSeen = (tour: TourId) => {
        if (seen?.has(tour)) {
            return;
        }
        const next = new Set<TourId>(seen).add(tour);
        setSeen(next);
        Effect.runPromise(writeSeenTours(next));
    };

    const finish = (current: ActiveTour, outcome: "completed" | "skipped") => {
        const step = stepsFor(current.tour)[current.index];
        if (step) {
            report("tour_finished", { outcome, step: step.id, tour: current.tour });
        }
        markSeen(current.tour);
        setActive(null);
        setStage(null);
    };

    const wait = (ms: number) =>
        new Promise<void>((resolve) => {
            timers.after(ms, resolve);
        });

    const resolveRegistered = async (id: string, attemptsLeft: number): Promise<ResolvedTarget | null> => {
        const entry = targets.current.get(id);
        if (entry) {
            if (entry.reveal) {
                await entry.reveal(entry.node);
            }
            const rect = await measureInWindow(entry.node);
            if (rect && rectVisibleIn(rect, window)) {
                return { radius: entry.radius === "half" ? rect.height / 2 : entry.radius, rect };
            }
        }
        if (attemptsLeft <= 1) {
            return null;
        }
        await wait(RETRY_AFTER_MS);
        return resolveRegistered(id, attemptsLeft - 1);
    };

    const resolveTarget = (target: TourStepTarget): Promise<ResolvedTarget | null> => {
        if (target.kind === "slot") {
            const slot = slotRect(target.slot, window, insets);
            return Promise.resolve({ radius: slot.radius, rect: slot });
        }
        return resolveRegistered(target.id, RESOLVE_ATTEMPTS);
    };

    const resolveWithin = (target: TourStepTarget) =>
        Promise.race([
            resolveTarget(target).catch(() => null),
            new Promise<null>((resolve) => {
                timers.after(RESOLVE_DEADLINE_MS, () => resolve(null));
            }),
        ]);

    useMirror([blocked], () => {
        if (blocked) {
            setActive(null);
            setStage(null);
        }
    });

    // Unresolvable steps are skipped: the log tour moves on, and a spotlight stays unseen for a later visit.
    useMirror([active], () => {
        const current = active;
        if (!current) {
            setStage(null);
            return;
        }
        const step = stepsFor(current.tour)[current.index];
        if (!step) {
            setActive(null);
            setStage(null);
            return;
        }
        let alive = true;
        resolveWithin(step.target).then((resolved) => {
            if (!alive) {
                return;
            }
            if (!resolved) {
                const steps = stepsFor(current.tour);
                if (current.tour === "log" && current.index + 1 < steps.length) {
                    setActive({ index: current.index + 1, tour: current.tour });
                } else if (current.tour === "log") {
                    finish(current, "completed");
                } else {
                    setStage(null);
                    setActive(null);
                }
                return;
            }
            report("tour_step_viewed", { step: step.id, tour: current.tour });
            setStage({
                index: current.index,
                key: `${current.tour}:${current.index}`,
                radius: resolved.radius,
                rect: resolved.rect,
                step,
                tour: current.tour,
            });
        });
        return () => {
            alive = false;
        };
    });

    // Cleared only once the log tour can start, so a replay asked for on an empty ledger keeps earlier progress.
    const visibleSeen = replayPending ? new Set<TourId>() : seen;

    const start = (tour: TourId) => {
        if (blocked || visibleSeen === null || visibleSeen.has(tour)) {
            return;
        }
        // A spotlight waits for the log tour to be finished or skipped.
        if (tour !== "log" && !visibleSeen.has("log")) {
            return;
        }
        if (replayPending) {
            const cleared = new Set<TourId>();
            setReplayPending(false);
            setSeen(cleared);
            report("tour_replayed");
            Effect.runPromise(writeSeenTours(cleared));
        }
        setActive((current) => current ?? { index: 0, tour });
    };

    const cancel = (tour: TourId) => {
        setActive((current) => (current?.tour === tour ? null : current));
        setStage((current) => (current?.tour === tour ? null : current));
    };

    // A second tap can land before the next stage commits, and must not skip the step nobody saw.
    const next = () => {
        if (!active || stage?.tour !== active.tour || stage.index !== active.index) {
            return;
        }
        if (active.index + 1 >= stepsFor(active.tour).length) {
            finish(active, "completed");
            return;
        }
        setActive({ index: active.index + 1, tour: active.tour });
    };

    const complete = () => {
        if (active) {
            finish(active, "completed");
        }
    };

    const skip = () => {
        if (active) {
            finish(active, "skipped");
        }
    };

    const replay = () => {
        setReplayPending(true);
        setActive(null);
        setStage(null);
    };

    const register = (id: string, entry: TourTargetEntry) => {
        targets.current.set(id, entry);
    };

    const unregister = (id: string, node: ViewInstance) => {
        if (targets.current.get(id)?.node === node) {
            targets.current.delete(id);
        }
    };

    const value: TourContextValue = {
        active,
        blocked,
        cancel,
        complete,
        next,
        register,
        replay,
        seen: visibleSeen,
        skip,
        stage,
        start,
        unregister,
    };

    return (
        // oxlint-disable-next-line react/jsx-no-constructed-context-values -- outlayr/no-manual-memo bans useMemo here; the provider only re-renders when tour state changes.
        <TourContext.Provider value={value}>
            {children}
            <TourOverlay />
        </TourContext.Provider>
    );
}
