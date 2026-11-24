import type { Href } from "expo-router";

type Selector = `id="${string}"` | `label="${string}"` | `text="${string}"`;

export type Step =
    | { readonly press: Selector }
    | { readonly fill: readonly [Selector, string] }
    | { readonly see: string }
    | { readonly scroll: "down" | "up" }
    | { readonly back: true };

export interface Feature {
    readonly says: readonly string[];
    readonly link: Extract<Href, string>;
    readonly steps: readonly Step[];
    readonly proves: string;
}

export const features = {
    "open-source-licenses": {
        link: "/settings/about",
        proves: "The licenses list opens from About and shows a bundled package.",
        says: ["open source licenses", "the licenses screen", "third-party notices"],
        steps: [{ press: 'label="Open source licenses"' }, { see: "@babel/runtime, MIT" }],
    },
    "add-expense": {
        link: "/transactions/create",
        proves: "An amount can be entered, filed under Groceries, saved, and the new entry appears in the log.",
        says: ["log an expense", "add a transaction", "record what I spent"],
        steps: [
            { press: 'label="1"' },
            { press: 'label="2"' },
            { press: 'label="5"' },
            { press: 'label="0"' },
            { press: 'label="Next"' },
            { press: 'label="Next"' },
            { press: 'label="Groceries"' },
            { press: 'label="Add Transaction"' },
            { see: "Groceries" },
        ],
    },
    "installment-purchase": {
        link: "/installments/new",
        proves: "A purchase can be split into payments: pick where, enter the total, review the plan, save it to the log.",
        says: ["buy in installments", "add a Cashea purchase", "pay in cuotas"],
        steps: [
            { see: "Where?" },
            { press: 'label="Affirm, 25% today, 3 payments"' },
            { see: "Total price" },
            { press: 'label="2"' },
            { press: 'label="4"' },
            { press: 'label="0"' },
            { press: 'label="Next"' },
            { see: "Your plan" },
            { press: 'label="Category"' },
            { press: 'id="category-row-69c3c93d-566b-5381-b52b-fd7b01cb5f70"' },
            { fill: ['id="installment-name"', "Samsung A16"] },
            { scroll: "down" },
            { press: 'label="Save"' },
            { see: "Samsung A16" },
        ],
    },
    "voice-entry": {
        link: "/transactions/voice",
        proves: "Dictation opens the microphone and reaches Listening before the voice session finishes loading.",
        says: ["add by voice", "dictate an expense", "voice entry"],
        steps: [{ see: "Listening…" }],
    },
    "log-list": {
        link: "/",
        proves: "The Log tab opens on the ledger and renders its own title.",
        says: ["the log", "my transactions list", "the home screen"],
        steps: [{ see: "Log" }],
    },
    "search-ledger": {
        link: "/search",
        proves: "Search opens from the ledger and waits for a note, category, or amount.",
        says: ["search my entries", "find a transaction", "look something up"],
        steps: [{ see: "Search your ledger" }],
    },
    insights: {
        link: "/insights",
        proves: "The Insights tab opens on the period summary.",
        says: ["insights", "my spending charts", "how much I spent this month"],
        steps: [{ see: "Insights" }],
    },
    "budget-plan": {
        link: "/insights/plan",
        proves: "The year plan opens and lays out what is left for each month.",
        says: ["plan my budget", "the yearly plan", "what I have left each month"],
        steps: [{ see: "LEFT EACH MONTH" }],
    },
    balances: {
        link: "/balances",
        proves: "The Balances tab opens on accounts and budgets.",
        says: ["balances", "my accounts", "where my money sits"],
        steps: [{ see: "Balances" }],
    },
    "free-accounts": {
        link: "/balances",
        proves: "A Free ledger shows how many of its 3 free accounts it uses before the paywall.",
        says: ["how many free accounts I have", "the free account limit", "accounts left on Free"],
        steps: [{ see: "3 of 3 free" }],
    },
    "last-free-account": {
        link: "/accounts/create",
        proves: "Creating the third account on Free says it is the last free one before Save.",
        says: ["my last free account", "adding a third account on Free"],
        steps: [{ see: "Your last free account. Pro adds more." }],
    },
    "new-debt": {
        link: "/debts/new",
        proves: "The new debt sheet opens with its title.",
        says: ["log money I lent someone", "record a debt", "track what I borrowed"],
        steps: [{ see: "New Debt" }],
    },
    "new-owe": {
        link: "/debts/owe",
        proves: "The money-I-owe sheet opens with its title.",
        says: ["log something I owe", "track a bill I have to pay", "record what I borrowed"],
        steps: [{ see: "Something I Owe" }],
    },
    import: {
        link: "/import",
        proves: "The import screen lists the file sources it can read.",
        says: ["import a CSV", "bring in my bank statement", "move my data in"],
        steps: [{ see: "From a file" }],
    },
    categories: {
        link: "/settings/categories",
        proves: "The categories list opens and its New category action opens the create sheet.",
        says: ["edit my categories", "add a category", "manage category names"],
        steps: [{ see: "New category" }, { press: 'label="New category"' }, { see: "Category icon" }],
    },
    "settings-appearance": {
        link: "/settings",
        proves: "Settings opens and shows the appearance controls.",
        says: ["change the theme", "make the app dark", "appearance settings"],
        steps: [{ see: "Appearance" }],
    },
    "settings-currency": {
        link: "/settings/currency",
        proves: "The currency picker opens with its full list.",
        says: ["change my currency", "pick a different currency", "currency settings"],
        steps: [{ see: "All currencies" }],
    },
    "settings-notifications": {
        link: "/settings/notifications",
        proves: "Notification settings open on the daily reminder.",
        says: ["turn on reminders", "notification settings", "remind me to log"],
        steps: [{ see: "Daily reminder" }],
    },
    export: {
        link: "/settings/export",
        proves: "The export screen opens and reports the ledger is ready to export.",
        says: ["export my data", "make a backup", "download a CSV"],
        steps: [{ see: "Ready to export" }],
    },
    paywall: {
        link: "/paywall",
        proves: "The Pro paywall opens and identifies itself.",
        says: ["what Pro gives me", "the paywall", "upgrade to Pro"],
        steps: [{ see: "Outlayr Pro" }],
    },
    webhooks: {
        link: "/settings/integrations/webhooks",
        proves: "A Pro account with sync on and no inbound token yet creates one and sees it once.",
        says: ["webhooks", "connect Zapier or IFTTT", "send entries to my server"],
        steps: [{ press: 'label="Create token"' }, { see: "Copy it now. You won't see it again." }],
    },
} as const satisfies Record<string, Feature>;

export type FeatureId = keyof typeof features;
