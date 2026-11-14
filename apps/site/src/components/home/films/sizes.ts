export const FILM_SIZES = {
    capture: { compact: { height: 390, width: 358 }, wide: { height: 452, width: 664 } },
    chaos: { compact: { height: 500, width: 358 }, wide: { height: 560, width: 664 } },
    month: { compact: { height: 520, width: 358 }, wide: { height: 664, width: 664 } },
    sorted: { compact: { height: 608, width: 358 }, wide: { height: 664, width: 664 } },
} as const;

export const FILM_COMPACT_BELOW = 520;
