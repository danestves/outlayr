import type { Href } from "expo-router";

import type { RootStackGroup } from "@/domain/auth-gate";
import type { TranslationKey } from "@/i18n/catalog";
import { ACCOUNT_DETENT, CATEGORY_DETENT, INSTALLMENT_PAY_DETENT, SUBCATEGORY_DETENT } from "@/lib/sheet-detents";

// Outside `(tabs)` so pushing one drops the tab bar, and on the root stack so they keep a back button.
export const TITLED_SCREENS: readonly {
    name: string;
    titleKey: TranslationKey;
}[] = [
    { name: "accounts/index", titleKey: "accounts.title" },
    { name: "settings/about", titleKey: "nav.settings.about" },
    { name: "settings/account", titleKey: "nav.settings.account" },
    { name: "settings/app-icon", titleKey: "nav.settings.appIcon" },
    { name: "settings/categories/index", titleKey: "nav.categories" },
    { name: "settings/currency", titleKey: "nav.settings.currency" },
    { name: "settings/deleted", titleKey: "settings.deleted.navTitle" },
    { name: "settings/erase", titleKey: "nav.settings.erase" },
    { name: "settings/export", titleKey: "nav.settings.export" },
    { name: "settings/feature-lab", titleKey: "nav.settings.featureLab" },
    { name: "settings/integrations/bank", titleKey: "settings.wallet.bankSection" },
    { name: "settings/integrations/index", titleKey: "nav.settings.integrations" },
    { name: "settings/integrations/wallet", titleKey: "nav.settings.wallet" },
    { name: "settings/licenses/index", titleKey: "settings.about.openSourceLicenses" },
    { name: "settings/notifications", titleKey: "nav.settings.notifications" },
    { name: "settings/restore", titleKey: "nav.settings.restore" },
    { name: "settings/sync", titleKey: "settings.sync.navTitle" },
    { name: "settings/time", titleKey: "nav.settings.time" },
    { name: "settings/upcoming", titleKey: "nav.settings.upcoming" },
    { name: "settings/usage", titleKey: "nav.settings.usage" },
];

export const SHEET_SCREENS: readonly {
    name: string;
    titleKey: TranslationKey;
    detent: number;
}[] = [
    {
        detent: ACCOUNT_DETENT,
        name: "accounts/create",
        titleKey: "accounts.nav.new",
    },
    {
        detent: ACCOUNT_DETENT,
        name: "accounts/[accountId]/edit",
        titleKey: "accounts.nav.edit",
    },
    {
        detent: INSTALLMENT_PAY_DETENT,
        name: "installments/pay",
        titleKey: "installments.pay.title",
    },
    {
        detent: CATEGORY_DETENT,
        name: "settings/categories/create",
        titleKey: "nav.newCategory",
    },
    {
        detent: CATEGORY_DETENT,
        name: "settings/categories/[categoryId]/index",
        titleKey: "nav.editCategory",
    },
    {
        detent: SUBCATEGORY_DETENT,
        name: "settings/categories/[categoryId]/subcategories/create",
        titleKey: "nav.newSubcategory",
    },
    {
        detent: SUBCATEGORY_DETENT,
        name: "settings/categories/[categoryId]/subcategories/[subcategoryId]",
        titleKey: "nav.subcategory",
    },
];

export const MODAL_SCREENS: readonly {
    name: string;
    titleKey: TranslationKey;
}[] = [
    { name: "debts/new", titleKey: "debts.new.title" },
    { name: "debts/owe", titleKey: "debts.owe.title" },
    { name: "recap/index", titleKey: "insights.recap.title" },
    { name: "recap/share", titleKey: "insights.recap.title" },
    { name: "transactions/create", titleKey: "nav.newTransaction" },
    { name: "transactions/transfers/create", titleKey: "transfers.title" },
];

/**
 * Registered in both the ledger and the onboarding groups (prefixed `onboarding/` there): a guard group can only push
 * its own routes, and the import runs from Settings and from the first-run cover alike. `locked` screens write or
 * have written the ledger, so they offer no way back.
 */
export const IMPORT_SCREENS: readonly {
    name: string;
    titleKey: TranslationKey;
    locked?: boolean;
}[] = [
    { name: "import/index", titleKey: "mmImport.nav.bringDataIn" },
    { name: "import/money-manager/index", titleKey: "mmImport.nav.moneyManager" },
    { name: "import/money-manager/open", titleKey: "mmImport.nav.moneyManager" },
    { name: "import/money-manager/overview", titleKey: "mmImport.nav.moneyManager" },
    { name: "import/money-manager/accounts", titleKey: "accounts.title" },
    { name: "import/money-manager/categories", titleKey: "nav.categories" },
    { name: "import/money-manager/uncategorized", titleKey: "mmImport.nav.uncategorized" },
    { name: "import/money-manager/balances", titleKey: "mmImport.nav.balances" },
    { name: "import/money-manager/budgets", titleKey: "mmImport.nav.budgets" },
    { name: "import/money-manager/start", titleKey: "mmImport.nav.start" },
    { name: "import/money-manager/importing", locked: true, titleKey: "mmImport.nav.importing" },
    { name: "import/money-manager/done", locked: true, titleKey: "mmImport.nav.moneyManager" },
    { name: "import/money-manager/wrong-file", titleKey: "mmImport.nav.moneyManager" },
];

/** First run walks the same import screens under `onboarding/`, so they stay inside the onboarding guard. */
export const ONBOARDING_IMPORT_SCREENS = IMPORT_SCREENS.map((screen) => ({
    ...screen,
    name: `onboarding/${screen.name}`,
}));

export const ROOT_STACK_SCREEN_NAMES = {
    adopt: ["auth/adopt"],
    ledger: [
        "(tabs)",
        "search",
        "paywall",
        ...TITLED_SCREENS.map((screen) => screen.name),
        ...SHEET_SCREENS.map((sheet) => sheet.name),
        ...MODAL_SCREENS.map((modal) => modal.name),
        ...IMPORT_SCREENS.map((screen) => screen.name),
        "accounts/reorder",
        "accounts/[accountId]/index",
        "installments/[planId]",
        "installments/scan",
        "settings/categories/reorder",
        "settings/licenses/[name]",
        "settings/category-symbol",
        "settings/email",
        "settings/suggest",
        "transactions/[id]",
        "transactions/transfers/[id]",
        "transactions/voice",
        "transactions/scan",
        "transactions/identity",
    ],
    onboarding: [
        "onboarding/index",
        "onboarding/currency",
        "onboarding/auto-log",
        "onboarding/smart-features",
        "onboarding/rhythm",
        ...ONBOARDING_IMPORT_SCREENS.map((screen) => screen.name),
    ],
    "sign-in": ["auth/sign-in", "auth/email"],
} satisfies Readonly<Record<RootStackGroup, readonly string[]>>;

// expo-router's own fallback goes by file order, not declaration order.
export const GROUP_ENTRY = {
    adopt: "/auth/adopt",
    ledger: "/",
    onboarding: "/onboarding",
    "sign-in": "/auth/sign-in",
} as const satisfies Record<RootStackGroup, Href>;
