// The ledger's 13-digit ceiling (apps/native/src/domain/numpad.ts) keeps cent arithmetic inside float64's safe range.
export const MAX_AMOUNT = 9_999_999_999_999;

export const MAX_DOMAIN_LENGTH = 253;

export const DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export const MAX_TAGS = 3;
export const MAX_TAG_LENGTH = 24;

export const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
