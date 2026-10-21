// Signs the simulator OUT first: `syncEnabled = '0'` alone is one toggle away from pushing every seeded row. Usage:
// node apps/screenshots/scripts/seed-sim-ledger.mjs <SIMULATOR_UDID> [--subscriptions]

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [udid, ...flags] = process.argv.slice(2);
const withSchedules = flags.includes("--subscriptions");
if (!udid) {
    throw new Error("Pass the simulator UDID as the first argument.");
}

const LOGO_TOKEN = "pk_cgf-s1esShGTN9IOQRGZBQ";
const BUNDLE_ID = "com.tryoutlayr.app";
const VES_RATE = 807.3862;
const RECURRING_MONTHLY = 3;
const RECURRING_YEARLY = 4;

function appContainer(kind) {
    return execFileSync("xcrun", ["simctl", "get_app_container", udid, BUNDLE_ID, kind], {
        encoding: "utf-8",
    }).trim();
}

const dataContainer = appContainer("data");
const dbPath = join(dataContainer, "Documents/SQLite/outlayr.db");
const photoDir = join(dataContainer, "Documents/transaction-photos");
const logoCacheDir = join(dataContainer, "Library/Caches/merchant-logos");

if (!existsSync(dbPath)) {
    throw new Error(`No ledger at ${dbPath}`);
}
mkdirSync(photoDir, { recursive: true });
mkdirSync(logoCacheDir, { recursive: true });

function sqlite(sql) {
    return execFileSync("sqlite3", [dbPath, sql], { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
}

try {
    execFileSync("xcrun", ["simctl", "terminate", udid, BUNDLE_ID], { stdio: "ignore" });
} catch {
    // Not running.
}
execFileSync("xcrun", ["simctl", "keychain", udid, "reset"]);
// Deleting `syncEnabled` before any insert keeps the outbox triggers dormant.
sqlite(
    "BEGIN; DELETE FROM outbox; DELETE FROM appMeta WHERE key IN ('syncEnabled', 'syncAccountSubject', 'syncCursor', 'syncedAt', 'ledgerAdoption'); COMMIT;"
);

/** Local midnight in ms, the convention `day` and `month` use. */
const dayMs = (y, m, d) => new Date(y, m - 1, d).getTime();
const atMs = (y, m, d, h, min) => new Date(y, m - 1, d, h, min).getTime();
const monthMs = (y, m) => new Date(y, m - 1, 1).getTime();

const NOW = Date.now();

// `null` keeps the category glyph, as for a merchant the app cannot resolve.
const MERCHANTS = {
    amazon: { domain: "amazon.com", label: "Amazon" },
    apple: { domain: "apple.com", label: "Apple" },
    chatgpt: { domain: "chatgpt.com", label: "ChatGPT" },
    claude: { domain: "claude.ai", label: "Claude" },
    conedison: { domain: "coned.com", label: "Con Edison" },
    costco: { domain: "costco.com", label: "Costco" },
    doordash: { domain: "doordash.com", label: "DoorDash" },
    duolingo: { domain: "duolingo.com", label: "Duolingo" },
    figma: { domain: "figma.com", label: "Figma" },
    github: { domain: "github.com", label: "GitHub" },
    icloud: { domain: "icloud.com", label: "iCloud" },
    ikea: { domain: "ikea.com", label: "IKEA" },
    lyft: { domain: "lyft.com", label: "Lyft" },
    netflix: { domain: "netflix.com", label: "Netflix" },
    nike: { domain: "nike.com", label: "Nike" },
    notion: { domain: "notion.so", label: "Notion" },
    nytimes: { domain: "nytimes.com", label: "The New York Times" },
    planetfitness: { domain: "planetfitness.com", label: "Planet Fitness" },
    shell: { domain: "shell.com", label: "Shell" },
    spotify: { domain: "spotify.com", label: "Spotify" },
    target: { domain: "target.com", label: "Target" },
    traderjoes: { domain: "traderjoes.com", label: "Trader Joe's" },
    uber: { domain: "uber.com", label: "Uber" },
    ubereats: { domain: "ubereats.com", label: "Uber Eats" },
    verizon: { domain: "verizon.com", label: "Verizon" },
    wholefoods: { domain: "wholefoodsmarket.com", label: "Whole Foods Market" },
};

const ACCOUNT_BRANDS = {
    "acc-amex": "americanexpress.com",
    "acc-apple": "apple.com",
    "acc-banesco": "banesco.com",
    "acc-chase": "chase.com",
    "acc-paypal": "paypal.com",
    "acc-savings": "ally.com",
    "acc-zinli": "zinli.com",
};

/** The app's own cache key: `${name}|${domain}` folded to letters and digits. */
function logoCacheKey(name, domain) {
    return `${name}|${domain ?? ""}`
        .normalize("NFD")
        .replaceAll(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase()
        .replaceAll(/[^\p{L}\p{N}]+/gu, "")
        .slice(0, 80);
}

function logoDevUrl(domain) {
    return `https://img.logo.dev/${encodeURIComponent(domain)}?token=${LOGO_TOKEN}&size=512&format=png&fallback=404`;
}

function dominantColor(file) {
    const raw = execFileSync(
        "magick",
        [
            file,
            "-alpha",
            "remove",
            "-alpha",
            "off",
            "-resize",
            "64x64!",
            "-colors",
            "8",
            "-format",
            "%c",
            "histogram:info:",
        ],
        { encoding: "utf-8" }
    );
    let best = null;
    for (const line of raw.split("\n")) {
        const hex = line.match(/#([0-9A-Fa-f]{6})/);
        const count = line.trim().match(/^(\d+):/);
        if (!hex || !count) {
            continue;
        }
        const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(hex[1].slice(i, i + 2), 16));
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        if (max > 240 && sat < 0.12) {
            continue;
        }
        if (max < 30) {
            continue;
        }
        const score = sat * Math.log1p(Number(count[1]));
        if (!best || score > best.score) {
            best = { hex: `#${hex[1].toLowerCase()}`, score };
        }
    }
    return best?.hex ?? null;
}

const tmp = join(tmpdir(), `outlayr-logos-${process.pid}`);
mkdirSync(tmp, { recursive: true });

/** Flattened onto white: JPEG has no alpha, so a transparent mark lands on black. */
const brandCache = new Map();
async function brandFor(domain) {
    if (brandCache.has(domain)) {
        return brandCache.get(domain);
    }

    const response = await fetch(logoDevUrl(domain));
    // `fallback=404` is logo.dev having no mark for the domain.
    if (response.status === 404) {
        brandCache.set(domain, null);
        return null;
    }
    if (!response.ok) {
        throw new Error(`logo.dev answered ${response.status} for ${domain}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const png = join(tmp, `${domain.replaceAll(/[^a-z0-9]/gi, "-")}.png`);
    writeFileSync(png, bytes);

    const jpg = join(tmp, `${domain.replaceAll(/[^a-z0-9]/gi, "-")}.jpg`);
    execFileSync("magick", [
        png,
        "-background",
        "white",
        "-alpha",
        "remove",
        "-alpha",
        "off",
        "-resize",
        "512x512^",
        "-gravity",
        "center",
        "-extent",
        "512x512",
        "-quality",
        "92",
        jpg,
    ]);
    const brand = { color: dominantColor(png), jpg };

    const key = logoCacheKey(domain, domain);
    writeFileSync(join(logoCacheDir, key), bytes);
    // The app reads the miss marker first, so a stale one hides the file.
    rmSync(join(logoCacheDir, `${key}.miss`), { force: true });

    brandCache.set(domain, brand);
    return brand;
}

function persistBrand(brand) {
    if (!brand) {
        return { imageColor: null, imageUri: null };
    }
    const id = randomUUID();
    const target = join(photoDir, `${id}.jpg`);
    writeFileSync(target, readFileSync(brand.jpg));
    return { imageColor: brand.color, imageUri: `file://${target}` };
}

const catRows = sqlite("SELECT id, name FROM categories WHERE deletedAt IS NULL;")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("|"));
const CATEGORY = Object.fromEntries(catRows.map(([id, name]) => [name, id]));

const EXTRA_CATEGORIES = [
    { color: "#AE703A", icon: "Coffee02", name: "Coffee", sortOrder: 10 },
    { color: "#7C76BC", icon: "Repeat", name: "Subscriptions", sortOrder: 11 },
    { color: "#B16482", icon: "ShoppingBag01", name: "Shopping", sortOrder: 12 },
    { color: "#2F8AB4", icon: "Airplane01", name: "Travel", sortOrder: 13 },
];

const statements = [];
const q = (value) => (value === null || value === undefined ? "NULL" : `'${String(value).replaceAll("'", "''")}'`);

// Looked up by English name: run `localize-sim-data.mjs <udid> en` before re-seeding.
const REQUIRED_CATEGORIES = [
    "Dining Out",
    "Entertainment",
    "Freelance",
    "Fuel",
    "Groceries",
    "Paycheck",
    "Phone & Internet",
    "Rent",
    "Transport",
    "Utilities",
];
const missing = REQUIRED_CATEGORIES.filter((name) => !CATEGORY[name]);
if (missing.length > 0) {
    throw new Error(
        `Categories are not in English (missing: ${missing.join(", ")}). ` +
            `Run: node apps/screenshots/scripts/localize-sim-data.mjs ${udid} en`
    );
}

for (const category of EXTRA_CATEGORIES) {
    if (CATEGORY[category.name]) {
        continue;
    }
    const id = randomUUID();
    CATEGORY[category.name] = id;
    statements.push(
        `INSERT INTO categories (id, name, color, icon, emoji, income, sortOrder, dateCreated, parentId, updatedAt, deletedAt)
     VALUES (${q(id)}, ${q(category.name)}, ${q(category.color)}, ${q(category.icon)}, '', 0, ${category.sortOrder}, ${NOW}, NULL, ${NOW}, NULL);`
    );
}

const ACCOUNTS = [
    {
        color: "#1567B0",
        currency: "USD",
        icon: "Bank",
        id: "acc-chase",
        kind: "asset",
        name: "Chase",
        target: 12_480.32,
    },
    {
        color: "#6B4FBB",
        currency: "USD",
        icon: "PiggyBank",
        id: "acc-savings",
        kind: "asset",
        name: "Ally Savings",
        target: 9450,
    },
    { color: "#7BD1FF", currency: "USD", icon: "Bank", id: "acc-zinli", kind: "asset", name: "Zinli", target: 3412.4 },
    {
        color: "#2D7A3E",
        currency: "VES",
        icon: "Bank",
        id: "acc-banesco",
        kind: "asset",
        name: "Banesco",
        target: 486_000,
    },
    {
        color: "#1B64C4",
        currency: "USD",
        icon: "Wallet02",
        id: "acc-paypal",
        kind: "asset",
        name: "PayPal",
        target: 612.8,
    },
    {
        color: "#1D1D1F",
        currency: "USD",
        icon: "CreditCard",
        id: "acc-apple",
        kind: "liability",
        name: "Apple Card",
        target: -842.15,
    },
    {
        color: "#2E6F9E",
        currency: "USD",
        icon: "CreditCard",
        id: "acc-amex",
        kind: "liability",
        name: "Amex Gold",
        target: -1240.55,
    },
    { color: "#C8C2B4", currency: "USD", icon: "Wallet01", id: "acc-cash", kind: "asset", name: "Cash", target: 220 },
];

const SEPTEMBER = [
    { a: "acc-chase", amt: 5200, cat: "Paycheck", d: 1, det: "August salary", h: 9, inc: true, note: "Paycheck" },
    { a: "acc-chase", amt: 1850, cat: "Rent", d: 1, h: 10, note: "Rent" },
    { a: "acc-apple", amt: 22.99, cat: "Entertainment", d: 1, h: 20, m: "netflix", note: "Netflix" },
    { a: "acc-chase", amt: 128.43, cat: "Groceries", d: 2, h: 11, m: "wholefoods", note: "Whole Foods Market" },
    { a: "acc-apple", amt: 18.2, cat: "Transport", d: 2, h: 19, m: "uber", note: "Uber" },
    { a: "acc-apple", amt: 11.99, cat: "Entertainment", d: 3, h: 8, m: "spotify", note: "Spotify" },
    { a: "acc-apple", amt: 32.15, cat: "Dining Out", d: 3, det: "ramen", h: 20, m: "doordash", note: "DoorDash" },
    { a: "acc-chase", amt: 58.4, cat: "Fuel", d: 4, h: 17, m: "shell", note: "Shell" },
    { a: "acc-apple", amt: 76.3, cat: "Shopping", d: 5, h: 13, m: "amazon", note: "Amazon" },
    { a: "acc-chase", amt: 85, cat: "Phone & Internet", d: 5, h: 15, m: "verizon", note: "Verizon" },
    { a: "acc-chase", amt: 64.12, cat: "Groceries", d: 6, h: 10, m: "traderjoes", note: "Trader Joe's" },
    { a: "acc-apple", amt: 9.99, cat: "Subscriptions", d: 6, h: 14, m: "icloud", note: "iCloud" },
    { a: "acc-apple", amt: 27.85, cat: "Dining Out", d: 7, h: 20, m: "ubereats", note: "Uber Eats" },
    { a: "acc-apple", amt: 20, cat: "Subscriptions", d: 8, h: 9, m: "chatgpt", note: "ChatGPT" },
    { a: "acc-chase", amt: 112.34, cat: "Utilities", d: 8, h: 16, m: "conedison", note: "Con Edison" },
    // In the current week: a week with no income is a dead Insights chart.
    { a: "acc-zinli", amt: 1450, cat: "Freelance", d: 9, det: "client retainer", h: 12, inc: true, note: "Freelance" },
    { a: "acc-amex", amt: 54.28, cat: "Shopping", d: 9, h: 12, m: "target", note: "Target" },
    { a: "acc-paypal", amt: 15, cat: "Subscriptions", d: 9, h: 18, m: "figma", note: "Figma" },
    { a: "acc-chase", amt: 186.77, cat: "Groceries", d: 10, h: 11, m: "costco", note: "Costco" },
    { a: "acc-apple", amt: 14.6, cat: "Transport", d: 10, h: 22, m: "lyft", note: "Lyft" },
    { a: "acc-amex", amt: 89, cat: "Shopping", d: 11, h: 13, m: "nike", note: "Nike" },
    { a: "acc-apple", amt: 4, cat: "Subscriptions", d: 11, h: 15, m: "github", note: "GitHub" },
];

const RECURRING = [
    { a: "acc-chase", amt: 5200, cat: "Paycheck", d: 1, h: 9, inc: true, note: "Paycheck" },
    { a: "acc-chase", amt: 1850, cat: "Rent", d: 1, h: 10, note: "Rent" },
    { a: "acc-apple", amt: 22.99, cat: "Entertainment", d: 1, h: 20, m: "netflix", note: "Netflix" },
    { a: "acc-apple", amt: 11.99, cat: "Entertainment", d: 3, h: 8, m: "spotify", note: "Spotify" },
    { a: "acc-chase", amt: 85, cat: "Phone & Internet", d: 5, h: 15, m: "verizon", note: "Verizon" },
    { a: "acc-apple", amt: 9.99, cat: "Subscriptions", d: 6, h: 14, m: "icloud", note: "iCloud" },
    { a: "acc-apple", amt: 20, cat: "Subscriptions", d: 8, h: 9, m: "chatgpt", note: "ChatGPT" },
    { a: "acc-chase", amt: 107.8, cat: "Utilities", d: 8, h: 16, m: "conedison", note: "Con Edison" },
    { a: "acc-paypal", amt: 15, cat: "Subscriptions", d: 9, h: 18, m: "figma", note: "Figma" },
    { a: "acc-zinli", amt: 1450, cat: "Freelance", d: 12, h: 12, inc: true, note: "Freelance" },
    { a: "acc-chase", amt: 142.6, cat: "Groceries", d: 13, h: 11, m: "wholefoods", note: "Whole Foods Market" },
    { a: "acc-apple", amt: 24.5, cat: "Transport", d: 14, h: 19, m: "uber", note: "Uber" },
    { a: "acc-apple", amt: 41.2, cat: "Dining Out", d: 15, h: 20, m: "doordash", note: "DoorDash" },
    { a: "acc-chase", amt: 62.1, cat: "Fuel", d: 17, h: 17, m: "shell", note: "Shell" },
    { a: "acc-chase", amt: 171.35, cat: "Groceries", d: 19, h: 11, m: "costco", note: "Costco" },
    { a: "acc-apple", amt: 58.9, cat: "Shopping", d: 21, h: 13, m: "amazon", note: "Amazon" },
    { a: "acc-apple", amt: 33.4, cat: "Dining Out", d: 23, h: 20, m: "ubereats", note: "Uber Eats" },
    { a: "acc-chase", amt: 78.25, cat: "Groceries", d: 25, h: 10, m: "traderjoes", note: "Trader Joe's" },
    { a: "acc-apple", amt: 17.9, cat: "Transport", d: 27, h: 22, m: "lyft", note: "Lyft" },
    { a: "acc-apple", amt: 129, cat: "Shopping", d: 28, h: 14, m: "ikea", note: "IKEA" },
];

const entries = [];
for (const row of SEPTEMBER) {
    entries.push({ ...row, month: 9, year: 2026 });
}
for (const [year, month] of [
    [2026, 8],
    [2026, 7],
    [2026, 6],
]) {
    for (const row of RECURRING) {
        entries.push({ ...row, month, year });
    }
}

if (withSchedules) {
    entries.push(
        {
            a: "acc-apple",
            amt: 24.99,
            cat: "Subscriptions",
            d: 15,
            h: 7,
            m: "planetfitness",
            month: 8,
            note: "Planet Fitness",
            year: 2026,
        },
        {
            a: "acc-amex",
            amt: 139,
            cat: "Shopping",
            d: 20,
            every: RECURRING_YEARLY,
            h: 9,
            m: "amazon",
            month: 11,
            note: "Amazon Prime",
            year: 2025,
        }
    );
}

const SCHEDULE_LEADS = new Map([
    ["Amazon Prime", null],
    ["ChatGPT", null],
    ["Netflix", 1],
    ["Planet Fitness", null],
    ["Rent", null],
    ["Spotify", null],
    ["Verizon", null],
    ["iCloud", null],
]);
const carriers = new Map();
for (const entry of withSchedules ? entries : []) {
    if (SCHEDULE_LEADS.has(entry.note) && !carriers.has(entry.note)) {
        carriers.set(entry.note, entry);
    }
}

const balanceDelta = Object.fromEntries(ACCOUNTS.map((a) => [a.id, 0]));

for (const entry of entries) {
    const merchant = entry.m ? MERCHANTS[entry.m] : null;
    // oxlint-disable-next-line no-await-in-loop -- one fetch per domain, memoised
    const brand = merchant ? await brandFor(merchant.domain) : null;
    const { imageColor, imageUri } = persistBrand(brand);

    const account = ACCOUNTS.find((a) => a.id === entry.a);
    const date = atMs(entry.year, entry.month, entry.d, entry.h, entry.min ?? 0);
    const income = entry.inc ? 1 : 0;
    const amountUsd = account.currency === "VES" ? entry.amt / VES_RATE : entry.amt;
    const rate = account.currency === "VES" ? VES_RATE : 1;
    const schedule = carriers.get(entry.note) === entry;

    balanceDelta[entry.a] += (income ? 1 : -1) * entry.amt;

    statements.push(
        `INSERT INTO transactions (id, amount, income, currency, note, details, date, day, month, icon, emoji, customColor, imageColor, imageUri, onceRecurring, recurringType, recurringCoefficient, recurringEndDate, categoryId, updatedAt, deletedAt, amountUsd, exchangeRate, exchangeRateType, imageKey, reminderLeadDays, accountId, recurringAnchorDay, transferId)
     VALUES (${q(randomUUID())}, ${entry.amt}, ${income}, ${q(account.currency)}, ${q(entry.note)}, ${q(entry.det ?? "")}, ${date}, ${dayMs(entry.year, entry.month, entry.d)}, ${monthMs(entry.year, entry.month)}, '', '', '', ${q(imageColor)}, ${q(imageUri)}, 0, ${schedule ? (entry.every ?? RECURRING_MONTHLY) : 0}, 1, NULL, ${q(CATEGORY[entry.cat])}, ${NOW}, NULL, ${amountUsd}, ${rate}, '', '', ${q(schedule ? SCHEDULE_LEADS.get(entry.note) : null)}, ${q(entry.a)}, ${schedule ? entry.d : "NULL"}, NULL);`
    );
}

const TRANSFER_USD = 400;
statements.push(
    `INSERT INTO transfers (id, date, dateCreated, day, month, deletedAt, exchangeRate, exchangeRateType, fromAccountId, fromAmount, fromAmountUsd, fromCurrency, note, toAccountId, toAmount, toAmountUsd, toCurrency, updatedAt)
   VALUES (${q(randomUUID())}, ${atMs(2026, 9, 7, 9, 30)}, ${NOW}, ${dayMs(2026, 9, 7)}, ${monthMs(2026, 9)}, NULL, ${VES_RATE}, 'official', 'acc-chase', ${TRANSFER_USD}, ${TRANSFER_USD}, 'USD', 'To Banesco', 'acc-banesco', ${TRANSFER_USD * VES_RATE}, ${TRANSFER_USD}, 'VES', ${NOW});`
);
balanceDelta["acc-chase"] -= TRANSFER_USD;
balanceDelta["acc-banesco"] += TRANSFER_USD * VES_RATE;

// After the rows and transfer, so `initialBalance` is solved back from each target.
for (const account of ACCOUNTS) {
    const domain = ACCOUNT_BRANDS[account.id];
    // oxlint-disable-next-line no-await-in-loop -- one fetch per domain, memoised
    const brand = domain ? await brandFor(domain) : null;
    const { imageColor, imageUri } = persistBrand(brand);
    const initial = account.target - balanceDelta[account.id];
    const initialUsd = account.currency === "VES" ? initial / VES_RATE : initial;

    statements.push(
        `INSERT OR REPLACE INTO accounts (id, name, currency, initialBalance, initialBalanceUsd, initialBalanceDate, icon, emoji, customColor, imageColor, imageUri, imageKey, sortOrder, dateCreated, updatedAt, deletedAt, kind)
     VALUES (${q(account.id)}, ${q(account.name)}, ${q(account.currency)}, ${initial}, ${initialUsd}, ${dayMs(2026, 1, 1)}, ${q(account.icon)}, '', ${q(account.color)}, ${q(imageColor)}, ${q(imageUri)}, '', ${ACCOUNTS.indexOf(account)}, ${dayMs(2026, 1, 1)}, ${NOW}, NULL, ${q(account.kind)});`
    );
}

// `Budget.type` codes are the Swift ones; 3 is a monthly window.
const BUDGET_TYPE_MONTH = 3;

// Groceries is over on purpose: the screenshot needs the over-budget rail.
const BUDGETS = [
    { amount: 350, category: "Groceries" },
    { amount: 250, category: "Dining Out" },
    { amount: 150, category: "Transport" },
    { amount: 120, category: "Fuel" },
    { amount: 100, category: "Entertainment" },
    { amount: 200, category: "Utilities" },
    { amount: 300, category: "Shopping" },
];

for (const budget of BUDGETS) {
    statements.push(
        `INSERT OR REPLACE INTO budgets (id, name, amount, type, startDate, dateCreated, green, categoryId, updatedAt, deletedAt, currency, amountUsd, rollover)
     VALUES (${q(randomUUID())}, NULL, ${budget.amount}, ${BUDGET_TYPE_MONTH}, ${dayMs(2026, 9, 1)}, ${dayMs(2026, 6, 1)}, 0, ${q(CATEGORY[budget.category])}, ${NOW}, NULL, 'USD', ${budget.amount}, 0);`
    );
}

// Carry-over off so the frame's arithmetic closes: 3900 - 2881.41 = 1018.59.
statements.push(
    `INSERT OR REPLACE INTO mainBudget (id, name, amount, type, startDate, dateCreated, green, updatedAt, deletedAt, currency, amountUsd, rollover)
   VALUES (${q(randomUUID())}, 'Monthly spending', 3900, ${BUDGET_TYPE_MONTH}, ${dayMs(2026, 9, 1)}, ${dayMs(2026, 6, 1)}, 0, ${NOW}, NULL, 'USD', 3900, 0);`
);

const GOALS = [
    {
        account: "acc-zinli",
        currency: "USD",
        name: "Japan, April",
        start: 1200,
        target: 6000,
        targetDate: dayMs(2027, 4, 1),
    },
    {
        account: "acc-chase",
        currency: "USD",
        name: "Emergency fund",
        start: 8000,
        target: 15_000,
        targetDate: dayMs(2027, 12, 31),
    },
    // On Cash: Chase already holds more than this target, so the goal would open Reached.
    {
        account: "acc-cash",
        currency: "USD",
        name: "New MacBook",
        start: 0,
        target: 3499,
        targetDate: dayMs(2027, 6, 1),
    },
];

for (const [index, goal] of GOALS.entries()) {
    statements.push(
        `INSERT OR REPLACE INTO savingsGoals (id, accountId, currency, dateCreated, deletedAt, name, sortOrder, startAmount, startAmountUsd, targetAmount, targetAmountUsd, targetDate, updatedAt)
     VALUES (${q(randomUUID())}, ${q(goal.account)}, ${q(goal.currency)}, ${dayMs(2026, 6, 1)}, NULL, ${q(goal.name)}, ${index}, ${goal.start}, ${goal.start}, ${goal.target}, ${goal.target}, ${goal.targetDate}, ${NOW});`
    );
}

const script = [
    "PRAGMA foreign_keys = OFF;",
    "BEGIN;",
    "DELETE FROM transactions;",
    "DELETE FROM transfers;",
    "DELETE FROM budgets;",
    "DELETE FROM mainBudget;",
    "DELETE FROM savingsGoals;",
    "DELETE FROM accounts;",
    ...statements,
    `UPDATE appMeta SET value = 'acc-chase' WHERE key = 'lastTransactionAccount';`,
    "COMMIT;",
].join("\n");

const scriptPath = join(tmp, "seed.sql");
writeFileSync(scriptPath, script);
execFileSync("sqlite3", [dbPath, `.read ${scriptPath}`], { encoding: "utf-8" });

const counts = sqlite(
    "SELECT (SELECT count(*) FROM accounts), (SELECT count(*) FROM transactions), (SELECT count(*) FROM budgets), (SELECT count(*) FROM savingsGoals), (SELECT count(*) FROM transfers), (SELECT count(*) FROM outbox);"
).trim();

const [accounts, transactions, budgets, goals, transfers, queued] = counts.split("|");
const logos = [...brandCache.values()].filter(Boolean).length;
rmSync(tmp, { force: true, recursive: true });

console.log(
    `accounts=${accounts} transactions=${transactions} budgets=${budgets} goals=${goals} transfers=${transfers} logos=${logos} outbox=${queued} (signed out)`
);
