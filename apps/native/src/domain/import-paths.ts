import type { Href } from "expo-router";

type ImportPath =
    | "accounts"
    | "balances"
    | "budgets"
    | "categories"
    | "done"
    | "importing"
    | "intro"
    | "open"
    | "overview"
    | "root"
    | "start"
    | "uncategorized"
    | "wrongFile";

const LEDGER = {
    accounts: "/import/money-manager/accounts",
    balances: "/import/money-manager/balances",
    budgets: "/import/money-manager/budgets",
    categories: "/import/money-manager/categories",
    done: "/import/money-manager/done",
    importing: "/import/money-manager/importing",
    intro: "/import/money-manager",
    open: "/import/money-manager/open",
    overview: "/import/money-manager/overview",
    root: "/import",
    start: "/import/money-manager/start",
    uncategorized: "/import/money-manager/uncategorized",
    wrongFile: "/import/money-manager/wrong-file",
} as const satisfies Record<ImportPath, Href>;

// The same screens again: the onboarding stack can only push routes that sit inside its own guard group.
const ONBOARDING = {
    accounts: "/onboarding/import/money-manager/accounts",
    balances: "/onboarding/import/money-manager/balances",
    budgets: "/onboarding/import/money-manager/budgets",
    categories: "/onboarding/import/money-manager/categories",
    done: "/onboarding/import/money-manager/done",
    importing: "/onboarding/import/money-manager/importing",
    intro: "/onboarding/import/money-manager",
    open: "/onboarding/import/money-manager/open",
    overview: "/onboarding/import/money-manager/overview",
    root: "/onboarding/import",
    start: "/onboarding/import/money-manager/start",
    uncategorized: "/onboarding/import/money-manager/uncategorized",
    wrongFile: "/onboarding/import/money-manager/wrong-file",
} as const satisfies Record<ImportPath, Href>;

export const IMPORT_PATHS = { ledger: LEDGER, onboarding: ONBOARDING } as const;
