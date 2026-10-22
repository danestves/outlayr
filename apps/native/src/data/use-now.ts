import { getTableName } from "drizzle-orm";
import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { outsideMoves, outsidePayments, transactions, transfers } from "@/db/schema";
import { clockAdvances, nextClockTick } from "@/domain/clock";

import { subscribeToTableChanges } from "./database-changes";
import { useTabPaused } from "./tab-pause";

const BOUNDED_TABLES: string[] = [
    getTableName(transactions),
    getTableName(transfers),
    getTableName(outsidePayments),
    getTableName(outsideMoves),
];
const MOUNT_RESTATE_AFTER_MS = 60_000;

let readingMs = Date.now();
let midnightTimer: ReturnType<typeof setTimeout> | null = null;
let teardown: (() => void)[] = [];
const subscribers = new Set<() => void>();

function publish(candidateMs: number): void {
    if (!clockAdvances(readingMs, candidateMs)) {
        return;
    }
    readingMs = candidateMs;
    // oxlint-disable-next-line unicorn/no-useless-spread -- a notified screen can unmount and unsubscribe, which would skip the subscriber after it
    for (const notify of [...subscribers]) {
        notify();
    }
}

function armMidnight(): void {
    if (midnightTimer != null) {
        clearTimeout(midnightTimer);
    }
    midnightTimer = setTimeout(() => {
        midnightTimer = null;
        publish(Date.now());
        armMidnight();
    }, nextClockTick(Date.now()));
}

function start(): void {
    armMidnight();

    const phase = AppState.addEventListener("change", (state) => {
        if (state === "active") {
            publish(Date.now());
            // JS timers stall in the background, so the pending one may target a midnight that already went by.
            armMidnight();
        }
    });
    const changes = BOUNDED_TABLES.map((tableName) =>
        subscribeToTableChanges(tableName, () => {
            publish(Date.now());
        })
    );

    teardown = [() => phase.remove(), ...changes];
}

function stop(): void {
    if (midnightTimer != null) {
        clearTimeout(midnightTimer);
        midnightTimer = null;
    }
    for (const off of teardown) {
        off();
    }
    teardown = [];
}

function subscribe(notify: () => void): () => void {
    // A mounting screen restates a stale reading, but not a fresher one: each restatement re-renders every
    // screen bounded by it.
    const nowMs = Date.now();
    if (nowMs - readingMs > MOUNT_RESTATE_AFTER_MS) {
        publish(nowMs);
    }
    subscribers.add(notify);
    if (subscribers.size === 1) {
        start();
    }

    return () => {
        subscribers.delete(notify);
        if (subscribers.size === 0) {
            stop();
        }
    };
}

export function readNow(): number {
    return readingMs;
}

/**
 * The one "now" every date-bounded read shares: a screen freezing its own `Date.now()` at mount hides rows saved
 * after it. Moves on a write to any `BOUNDED_TABLES` table, on returning to the foreground, and at local midnight.
 */
export function useNow(): number {
    return useSyncExternalStore(useTabPaused(subscribe), readNow);
}
