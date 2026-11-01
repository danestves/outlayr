import { getTableName } from "drizzle-orm";
import { useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { outsideMoves, outsidePayments, transactions, transfers } from "@/db/schema";
import { clockAdvances, nextClockWake } from "@/domain/clock";

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
let clockTimer: ReturnType<typeof setTimeout> | null = null;
let nextRowSource: ((afterMs: number) => number | null) | null = null;
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

function nextRowAfter(nowMs: number): number | null {
    try {
        return nextRowSource?.(nowMs) ?? null;
    } catch (error) {
        console.warn("[outlayr] reading the next dated row failed", error);
        return null;
    }
}

function armClock(): void {
    if (clockTimer != null) {
        clearTimeout(clockTimer);
    }
    const nowMs = Date.now();
    clockTimer = setTimeout(
        () => {
            clockTimer = null;
            publish(Date.now());
            armClock();
        },
        nextClockWake(nowMs, nextRowAfter(nowMs))
    );
}

export function bindNextRowSource(read: (afterMs: number) => number | null): () => void {
    nextRowSource = read;
    if (clockTimer != null) {
        armClock();
    }
    return () => {
        if (nextRowSource === read) {
            nextRowSource = null;
        }
    };
}

function start(): void {
    armClock();

    const phase = AppState.addEventListener("change", (state) => {
        if (state === "active") {
            publish(Date.now());
            // JS timers stall in the background, so the pending one may target a time that already went by.
            armClock();
        }
    });
    const changes = BOUNDED_TABLES.map((tableName) =>
        subscribeToTableChanges(tableName, () => {
            publish(Date.now());
            armClock();
        })
    );

    teardown = [() => phase.remove(), ...changes];
}

function stop(): void {
    if (clockTimer != null) {
        clearTimeout(clockTimer);
        clockTimer = null;
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
 * after it. Moves on a write to any `BOUNDED_TABLES` table, on returning to the foreground, at local midnight, and
 * when the time of a dated row passes.
 */
export function useNow(): number {
    return useSyncExternalStore(useTabPaused(subscribe), readNow);
}
