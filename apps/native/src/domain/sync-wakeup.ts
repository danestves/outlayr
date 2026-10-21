// `sync:currentSeq` serves `nextSeq`, the NEXT row's number, while the cursor holds the LAST one applied, so a
// caught-up device sits exactly one below. A non-integer watermark is not grounds for a round trip.
export function isBehindWatermark(watermark: number, cursor: number): boolean {
    return Number.isSafeInteger(watermark) && watermark - 1 > cursor;
}
