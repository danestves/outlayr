import type { Href } from "expo-router";

import type { RootStackGroup } from "@/domain/auth-gate";
import type { TranslationKey } from "@/i18n/catalog";
import { ACCOUNT_DETENT, CATEGORY_DETENT, INSTALLMENT_PAY_DETENT, SUBCATEGORY_DETENT } from "@/lib/sheet-detents";
import type { StackChrome } from "@/navigation/stack-chrome";

type Row<Kind extends keyof StackChrome, Fields = unknown> = Fields & {
    chrome: Kind;
    name: string;
    /** No swipe back and no back button: the screen writes or has written the ledger, or has nothing behind it. */
    locked?: true;
};

export type RootScreen =
    | Row<"bareModal" | "entrySheet" | "firstRunStep" | "headless" | "paywall" | "pushed">
    | Row<"modal" | "search" | "titled", { titleKey: TranslationKey }>
    | Row<"sheet", { detent: number; titleKey: TranslationKey }>
    /** Sized from the window height when the stack renders. */
    | Row<"identityPicker" | "pickerSheet">;

/**
 * Registered in both the ledger and the onboarding groups (prefixed `onboarding/` there): a guard group can only push
 * its own routes, and the import runs from Settings and from the first-run cover alike.
 */
const IMPORT_SCREENS: readonly RootScreen[] = [
    { chrome: "titled", name: "import/index", titleKey: "mmImport.nav.bringDataIn" },
    { chrome: "titled", name: "import/money-manager/index", titleKey: "mmImport.nav.moneyManager" },
    { chrome: "titled", name: "import/money-manager/open", titleKey: "mmImport.nav.moneyManager" },
    { chrome: "titled", name: "import/money-manager/overview", titleKey: "mmImport.nav.moneyManager" },
    { chrome: "titled", name: "import/money-manager/accounts", titleKey: "accounts.title" },
    { chrome: "titled", name: "import/money-manager/categories", titleKey: "nav.categories" },
    { chrome: "titled", name: "import/money-manager/uncategorized", titleKey: "mmImport.nav.uncategorized" },
    { chrome: "titled", name: "import/money-manager/balances", titleKey: "mmImport.nav.balances" },
    { chrome: "titled", name: "import/money-manager/budgets", titleKey: "mmImport.nav.budgets" },
    { chrome: "titled", name: "import/money-manager/start", titleKey: "mmImport.nav.start" },
    { chrome: "titled", locked: true, name: "import/money-manager/importing", titleKey: "mmImport.nav.importing" },
    { chrome: "titled", locked: true, name: "import/money-manager/done", titleKey: "mmImport.nav.moneyManager" },
    { chrome: "titled", name: "import/money-manager/wrong-file", titleKey: "mmImport.nav.moneyManager" },
];

/**
 * Every root screen sits in exactly one group: one outside them all survives a guard flip and strands the stack on
 * it, with no tab bar and no way back. Order is the declaration order: the router falls back to the first screen.
 */
export const ROOT_STACK: readonly { group: RootStackGroup; screens: readonly RootScreen[] }[] = [
    {
        group: "onboarding",
        screens: [
            { chrome: "headless", name: "onboarding/index" },
            // Transparent: the stock theme card differs from `--fr-ground`, so an opaque bar bands the top.
            { chrome: "firstRunStep", name: "onboarding/currency" },
            { chrome: "firstRunStep", name: "onboarding/auto-log" },
            { chrome: "firstRunStep", name: "onboarding/smart-features" },
            { chrome: "firstRunStep", name: "onboarding/rhythm" },
            { chrome: "firstRunStep", name: "onboarding/first-entry" },
            ...IMPORT_SCREENS.map((screen) => ({ ...screen, name: `onboarding/${screen.name}` })),
        ],
    },
    // Behind onboarding: only the currency step writes `currencyChosen`, and canonicalization declines every row on
    // a ledger that lacks it (`docs/internals/convex-sync.md` §1.7).
    {
        group: "sign-in",
        screens: [
            { chrome: "headless", name: "auth/sign-in" },
            { chrome: "firstRunStep", name: "auth/email" },
        ],
    },
    {
        group: "adopt",
        screens: [{ chrome: "headless", locked: true, name: "auth/adopt" }],
    },
    {
        group: "ledger",
        screens: [
            { chrome: "headless", name: "(tabs)" },
            { chrome: "search", name: "search", titleKey: "nav.search" },
            { chrome: "paywall", name: "paywall" },
            // Outside `(tabs)` so pushing one drops the tab bar, and on the root stack so they keep a back button.
            { chrome: "titled", name: "accounts/index", titleKey: "accounts.title" },
            { chrome: "titled", name: "settings/about", titleKey: "nav.settings.about" },
            { chrome: "titled", name: "settings/account", titleKey: "nav.settings.account" },
            { chrome: "titled", name: "settings/app-icon", titleKey: "nav.settings.appIcon" },
            { chrome: "titled", name: "settings/categories/index", titleKey: "nav.categories" },
            { chrome: "titled", name: "settings/currency", titleKey: "nav.settings.currency" },
            { chrome: "titled", name: "settings/deleted", titleKey: "settings.deleted.navTitle" },
            { chrome: "titled", name: "settings/erase", titleKey: "nav.settings.erase" },
            { chrome: "titled", name: "settings/export", titleKey: "nav.settings.export" },
            { chrome: "titled", name: "settings/feature-lab", titleKey: "nav.settings.featureLab" },
            { chrome: "titled", name: "settings/integrations/bank", titleKey: "settings.wallet.bankSection" },
            { chrome: "titled", name: "settings/integrations/index", titleKey: "nav.settings.integrations" },
            { chrome: "titled", name: "settings/integrations/wallet", titleKey: "nav.settings.wallet" },
            { chrome: "titled", name: "settings/invite", titleKey: "referrals.title" },
            { chrome: "titled", name: "settings/licenses/index", titleKey: "settings.about.openSourceLicenses" },
            { chrome: "titled", name: "settings/notifications", titleKey: "nav.settings.notifications" },
            { chrome: "titled", name: "settings/restore", titleKey: "nav.settings.restore" },
            { chrome: "titled", name: "settings/sync", titleKey: "settings.sync.navTitle" },
            { chrome: "titled", name: "settings/time", titleKey: "nav.settings.time" },
            { chrome: "titled", name: "settings/upcoming", titleKey: "nav.settings.upcoming" },
            { chrome: "titled", name: "settings/usage", titleKey: "nav.settings.usage" },
            ...IMPORT_SCREENS,
            { chrome: "pushed", name: "accounts/reorder" },
            { chrome: "pushed", name: "accounts/archived" },
            { chrome: "pushed", name: "accounts/[accountId]/index" },
            { chrome: "headless", name: "i/[code]" },
            { chrome: "pushed", name: "installments/[planId]" },
            { chrome: "bareModal", name: "installments/scan" },
            { chrome: "pushed", name: "settings/categories/reorder" },
            { chrome: "pushed", name: "settings/licenses/[name]" },
            { chrome: "sheet", detent: ACCOUNT_DETENT, name: "accounts/create", titleKey: "accounts.nav.new" },
            {
                chrome: "sheet",
                detent: ACCOUNT_DETENT,
                name: "accounts/[accountId]/edit",
                titleKey: "accounts.nav.edit",
            },
            {
                chrome: "sheet",
                detent: INSTALLMENT_PAY_DETENT,
                name: "installments/pay",
                titleKey: "installments.pay.title",
            },
            {
                chrome: "sheet",
                detent: CATEGORY_DETENT,
                name: "settings/categories/create",
                titleKey: "nav.newCategory",
            },
            {
                chrome: "sheet",
                detent: CATEGORY_DETENT,
                name: "settings/categories/[categoryId]/index",
                titleKey: "nav.editCategory",
            },
            {
                chrome: "sheet",
                detent: SUBCATEGORY_DETENT,
                name: "settings/categories/[categoryId]/subcategories/create",
                titleKey: "nav.newSubcategory",
            },
            {
                chrome: "sheet",
                detent: SUBCATEGORY_DETENT,
                name: "settings/categories/[categoryId]/subcategories/[subcategoryId]",
                titleKey: "nav.subcategory",
            },
            { chrome: "pickerSheet", name: "settings/category-symbol" },
            { chrome: "firstRunStep", name: "settings/email" },
            { chrome: "modal", name: "debts/new", titleKey: "debts.new.title" },
            { chrome: "modal", name: "debts/owe", titleKey: "debts.owe.title" },
            { chrome: "modal", name: "recap/index", titleKey: "insights.recap.title" },
            { chrome: "modal", name: "recap/share", titleKey: "insights.recap.title" },
            { chrome: "modal", name: "transactions/create", titleKey: "nav.newTransaction" },
            { chrome: "modal", name: "transactions/transfers/create", titleKey: "transfers.title" },
            { chrome: "modal", name: "year", titleKey: "pro.year.title" },
            { chrome: "entrySheet", name: "transactions/[id]" },
            { chrome: "entrySheet", name: "transactions/transfers/[id]" },
            { chrome: "bareModal", name: "transactions/voice" },
            { chrome: "bareModal", name: "transactions/scan" },
            { chrome: "identityPicker", name: "transactions/identity" },
        ],
    },
];

/** Declared by hand in `app/_layout.tsx`: it opens at the large detent only, which no chrome kind says. */
export const SUGGEST_SCREEN = "settings/suggest";

// expo-router's own fallback goes by file order, not declaration order.
export const GROUP_ENTRY = {
    adopt: "/auth/adopt",
    ledger: "/",
    onboarding: "/onboarding",
    "sign-in": "/auth/sign-in",
} as const satisfies Record<RootStackGroup, Href>;
