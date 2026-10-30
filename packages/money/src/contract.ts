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
