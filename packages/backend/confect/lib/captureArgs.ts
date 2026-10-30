import * as Schema from "effect/Schema";

import { CURRENCY_PATTERN, DATE_PATTERN, LANGUAGE_PATTERN, namesWithinBudget, REGION_PATTERN } from "./ledgerPrompt";
import type { CategoryBranch } from "./ledgerPrompt";

// A Convex value tops out at 1MB and the photo travels as one; the client re-encodes to fit.
export const MAX_IMAGE_BYTES = 900_000;
// A Convex value tops out at 1MB; a minute of AAC at the client's 48kbps mono preset is ~360KB.
export const MAX_AUDIO_BYTES = 900_000;
const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;

export function looksLikeJpeg(image: ArrayBuffer): boolean {
    const head = new Uint8Array(image, 0, Math.min(JPEG_MAGIC.length, image.byteLength));
    return head.length === JPEG_MAGIC.length && JPEG_MAGIC.every((byte, index) => head[index] === byte);
}

export const JpegImage = Schema.instanceOf(ArrayBuffer).check(
    Schema.makeFilter((image) => image.byteLength <= MAX_IMAGE_BYTES && looksLikeJpeg(image))
);

export const AudioClip = Schema.instanceOf(ArrayBuffer).check(
    Schema.makeFilter((audio) => audio.byteLength > 0 && audio.byteLength <= MAX_AUDIO_BYTES)
);

export const IsoDay = Schema.String.check(Schema.isPattern(DATE_PATTERN));
export const CurrencyCode = Schema.String.check(Schema.isPattern(CURRENCY_PATTERN));
export const LanguageTag = Schema.String.check(Schema.isPattern(LANGUAGE_PATTERN));
export const RegionCode = Schema.String.check(Schema.isPattern(REGION_PATTERN));

export const withinNameBudget = Schema.makeFilter(
    (names: { readonly accounts: readonly string[]; readonly categoryTree?: readonly CategoryBranch[] }) =>
        namesWithinBudget(names.categoryTree ?? [], names.accounts)
);
