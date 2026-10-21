/** A piece's flight, in fractions of the burst box; the view supplies points. */
export interface ConfettiPiece {
    colorIndex: number;
    delayMs: number;
    /** Sideways travel over the whole flight, in burst widths, signed. */
    drift: number;
    durationMs: number;
    /** Depth below the launch point at landing, in burst heights. */
    fall: number;
    /** Stable within a burst; a burst is never reordered or appended to. */
    id: number;
    /** Peak height above the launch point, in burst heights. */
    rise: number;
    size: number;
    /** Total turn over the flight, in degrees, signed. */
    spin: number;
    x: number;
}

/** Budget every piece lands inside, so one timer can retire the whole burst. */
export const CONFETTI_FLIGHT_MS = 1600;

const MAX_DELAY_MS = 240;
const MIN_DURATION_MS = 900;

/** mulberry32: a burst must survive a re-render without reshuffling. */
function random(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d_2b_79_f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
}

export function confettiBurst(count: number, colorCount: number, seed: number): ConfettiPiece[] {
    if (count <= 0) {
        return [];
    }
    const palette = Math.max(1, Math.trunc(colorCount));
    const nextRandom = random(seed);
    const pieces: ConfettiPiece[] = [];

    for (let index = 0; index < count; index += 1) {
        const delayMs = Math.round(nextRandom() * MAX_DELAY_MS);
        const spread = CONFETTI_FLIGHT_MS - MIN_DURATION_MS - delayMs;
        pieces.push({
            // Round-robin, not drawn: a short burst over a small palette would often skip whole colours.
            colorIndex: index % palette,
            delayMs,
            drift: (nextRandom() - 0.5) * 0.9,
            durationMs: MIN_DURATION_MS + Math.round(nextRandom() * spread),
            fall: 1.1 + nextRandom() * 0.35,
            id: index,
            rise: 0.35 + nextRandom() * 0.4,
            size: 6 + Math.round(nextRandom() * 6),
            spin: (nextRandom() - 0.5) * 1440,
            x: nextRandom(),
        });
    }

    return pieces;
}
