export const AI_CONSENT_VERSION = 2;

export const PRO_ENTITLEMENT_ID = "pro";

export const CANONICAL_CATEGORY_NAMES = {
    expense: [
        "Groceries",
        "Dining Out",
        "Coffee",
        "Transport",
        "Fuel",
        "Rent",
        "Home",
        "Utilities",
        "Phone & Internet",
        "Subscriptions",
        "Healthcare",
        "Fitness",
        "Shopping",
        "Fashion",
        "Entertainment",
        "Travel",
        "Education",
        "Gifts",
        "Pets",
        "Family",
        "Personal Care",
        "Insurance",
        "Taxes",
    ],
    income: [
        "Paycheck",
        "Freelance",
        "Part-Time",
        "Business",
        "Investments",
        "Interest",
        "Bonus",
        "Tips",
        "Refund",
        "Gifts",
    ],
} as const;

export type CanonicalCategoryName<Kind extends keyof typeof CANONICAL_CATEGORY_NAMES> =
    (typeof CANONICAL_CATEGORY_NAMES)[Kind][number];

export const REFERRAL_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const REFERRAL_CODE_LENGTH = 8;

const REFERRAL_CODE = new RegExp(`^[${REFERRAL_CODE_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`);
const REFERRAL_NOISE = /[\s-]/g;
const LINK_SUFFIX = /[?#].*$/s;

export function normalizeReferralCode(input: string): string | null {
    const segments = input.trim().replace(LINK_SUFFIX, "").split("/").filter(Boolean);
    const code = (segments.at(-1) ?? "").replaceAll(REFERRAL_NOISE, "").toUpperCase();
    return REFERRAL_CODE.test(code) ? code : null;
}

export function formatReferralCode(code: string): string {
    return `${code.slice(0, REFERRAL_CODE_LENGTH / 2)} ${code.slice(REFERRAL_CODE_LENGTH / 2)}`;
}

export function referralLink(code: string, language: string): string {
    const prefix = language.startsWith("es") ? "/es" : "";
    return `tryoutlayr.com${prefix}/i/${code.toLowerCase()}`;
}

export const REFERRAL_DAYS_TO_EARN = 3;

export const REFERRAL_YEARLY_CAP = 12;

export const REFERRAL_CAP_WINDOW_MS = 365 * 86_400_000;

export const TRIAL_REMINDER_LEAD_MS = 2 * 86_400_000;

export const TRIAL_REMINDERS_FROM_MS = Date.UTC(2027, 0, 1);
