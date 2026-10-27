const TICK_MS = 1000;

let readingMs = Date.now();
let firstTick: ReturnType<typeof setTimeout> | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<() => void>();

function tick(): void {
    readingMs = Date.now();
    // oxlint-disable-next-line unicorn/no-useless-spread -- a notified component can unmount and unsubscribe, which would skip the subscriber after it
    for (const notify of [...subscribers]) {
        notify();
    }
}

function stop(): void {
    if (firstTick !== null) {
        clearTimeout(firstTick);
        firstTick = null;
    }
    if (ticker !== null) {
        clearInterval(ticker);
        ticker = null;
    }
}

export function subscribeSecondClock(notify: () => void): () => void {
    subscribers.add(notify);
    if (subscribers.size === 1) {
        firstTick = setTimeout(tick, 0);
        ticker = setInterval(tick, TICK_MS);
    }
    return () => {
        subscribers.delete(notify);
        if (subscribers.size === 0) {
            stop();
        }
    };
}

export function readSecondClock(): number {
    return readingMs;
}
