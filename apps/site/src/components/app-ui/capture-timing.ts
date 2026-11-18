export const CAPTURE_WAYS = ["type", "say", "snap"] as const;

export type CaptureWay = (typeof CAPTURE_WAYS)[number];

export const FILM_SECONDS = { say: 8, snap: 7, type: 6.5 } as const satisfies Record<CaptureWay, number>;
