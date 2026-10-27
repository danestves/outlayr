import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openLedger } from "./ledger-target.mjs";
import { REGIONS } from "./seed-regions.mjs";

const [deviceTarget, ...flags] = process.argv.slice(2);
const withSchedules = flags.includes("--subscriptions");
const regionIndex = flags.indexOf("--region");
const regionName = regionIndex === -1 ? "us" : flags[regionIndex + 1];
const region = REGIONS[regionName];
if (!deviceTarget) {
    throw new Error("Pass the simulator UDID, android:<serial> or db:<path> as the first argument.");
}
if (!region) {
    throw new Error(`Unknown region "${regionName}". Use one of: ${Object.keys(REGIONS).join(", ")}.`);
}

const LOGO_TOKEN = "pk_cgf-s1esShGTN9IOQRGZBQ";
const VES_RATE = 807.3862;
const RECURRING_MONTHLY = 3;
const RECURRING_YEARLY = 4;
const RATES_FROM = Date.UTC(2025, 11, 31);
const RATES_THROUGH = Date.UTC(2026, 11, 31);
const DAY_MS = 86_400_000;
const RATES_PULLED_AT = new Date(2026, 8, 12, 14, 0).getTime();

const ledger = openLedger(deviceTarget);
const { dbPath, logoCacheDir, photoDir } = ledger;

function sqlite(sql) {
    return execFileSync("sqlite3", [dbPath, sql], { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
}

ledger.stopApp();
ledger.signOut();
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

const HAS_MAGICK = (() => {
    try {
        execFileSync("magick", ["-version"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
})();

function scoreColors(counted) {
    let best = null;
    for (const { count, hex } of counted) {
        const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max === 0 ? 0 : (max - min) / max;
        if (max > 240 && sat < 0.12) {
            continue;
        }
        if (max < 30) {
            continue;
        }
        const score = sat * Math.log1p(count);
        if (!best || score > best.score) {
            best = { hex: `#${hex.toLowerCase()}`, score };
        }
    }
    return best?.hex ?? null;
}

function dominantColorMagick(file) {
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
    const counted = [];
    for (const line of raw.split("\n")) {
        const hex = line.match(/#([0-9A-Fa-f]{6})/);
        const count = line.trim().match(/^(\d+):/);
        if (hex && count) {
            counted.push({ count: Number(count[1]), hex: hex[1] });
        }
    }
    return scoreColors(counted);
}

async function dominantColorSharp(bytes) {
    const { default: sharp } = await import("sharp");
    const { data } = await sharp(bytes)
        .flatten({ background: "#ffffff" })
        .resize(64, 64, { fit: "fill" })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const buckets = new Map();
    for (let i = 0; i < data.length; i += 3) {
        const [r, g, b] = [data[i] >> 4, data[i + 1] >> 4, data[i + 2] >> 4];
        const key = (r << 8) | (g << 4) | b;
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const counted = [...buckets].map(([key, count]) => {
        const channel = (shift) => (((key >> shift) & 15) * 17).toString(16).padStart(2, "0");
        return { count, hex: `${channel(8)}${channel(4)}${channel(0)}` };
    });
    return scoreColors(counted);
}

async function flattenToJpeg(png, bytes, jpg) {
    if (HAS_MAGICK) {
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
        return;
    }
    const { default: sharp } = await import("sharp");
    await sharp(bytes)
        .flatten({ background: "#ffffff" })
        .resize(512, 512, { fit: "cover" })
        .jpeg({ quality: 92 })
        .toFile(jpg);
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
    await flattenToJpeg(png, bytes, jpg);
    const brand = { color: HAS_MAGICK ? dominantColorMagick(png) : await dominantColorSharp(bytes), jpg };

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
    writeFileSync(join(photoDir, `${id}.jpg`), readFileSync(brand.jpg));
    return { imageColor: brand.color, imageUri: ledger.photoUri(`${id}.jpg`) };
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

const ACCOUNTS = region.accounts;
function accountForRole(role) {
    const key = region.roles[role] ?? role;
    return ACCOUNTS.find((a) => a.role === key) ?? ACCOUNTS.find((a) => a.role === "card");
}
const LEDGER_CURRENCY = region.currency;

const SEPTEMBER = [
    { a: "main", amt: 5200, cat: "Paycheck", d: 1, det: "August salary", h: 9, inc: true, note: "Paycheck" },
    { a: "main", amt: 1850, cat: "Rent", d: 1, h: 10, note: "Rent" },
    { a: "card", amt: 22.99, cat: "Entertainment", d: 1, h: 20, m: "netflix", note: "Netflix" },
    { a: "main", amt: 128.43, cat: "Groceries", d: 2, h: 11, m: "wholefoods", note: "Whole Foods Market" },
    { a: "card", amt: 18.2, cat: "Transport", d: 2, h: 19, m: "uber", note: "Uber" },
    { a: "card", amt: 11.99, cat: "Entertainment", d: 3, h: 8, m: "spotify", note: "Spotify" },
    { a: "card", amt: 32.15, cat: "Dining Out", d: 3, det: "ramen", h: 20, m: "doordash", note: "DoorDash" },
    { a: "main", amt: 58.4, cat: "Fuel", d: 4, h: 17, m: "shell", note: "Shell" },
    { a: "card", amt: 76.3, cat: "Shopping", d: 5, h: 13, m: "amazon", note: "Amazon" },
    { a: "main", amt: 85, cat: "Phone & Internet", d: 5, h: 15, m: "verizon", note: "Verizon" },
    { a: "main", amt: 64.12, cat: "Groceries", d: 6, h: 10, m: "traderjoes", note: "Trader Joe's" },
    { a: "card", amt: 9.99, cat: "Subscriptions", d: 6, h: 14, m: "icloud", note: "iCloud" },
    { a: "card", amt: 27.85, cat: "Dining Out", d: 7, h: 20, m: "ubereats", note: "Uber Eats" },
    { a: "card", amt: 20, cat: "Subscriptions", d: 8, h: 9, m: "chatgpt", note: "ChatGPT" },
    { a: "main", amt: 112.34, cat: "Utilities", d: 8, h: 16, m: "conedison", note: "Con Edison" },
    // In the current week: a week with no income is a dead Insights chart.
    { a: "freelance", amt: 1450, cat: "Freelance", d: 9, det: "client retainer", h: 12, inc: true, note: "Freelance" },
    { a: "amex", amt: 54.28, cat: "Shopping", d: 9, h: 12, m: "target", note: "Target" },
    { a: "paypal", amt: 15, cat: "Subscriptions", d: 9, h: 18, m: "figma", note: "Figma" },
    { a: "main", amt: 186.77, cat: "Groceries", d: 10, h: 11, m: "costco", note: "Costco" },
    { a: "card", amt: 14.6, cat: "Transport", d: 10, h: 22, m: "lyft", note: "Lyft" },
    { a: "amex", amt: 89, cat: "Shopping", d: 11, h: 13, m: "nike", note: "Nike" },
    { a: "card", amt: 4, cat: "Subscriptions", d: 11, h: 15, m: "github", note: "GitHub" },
];

const RECURRING = [
    { a: "main", amt: 5200, cat: "Paycheck", d: 1, h: 9, inc: true, note: "Paycheck" },
    { a: "main", amt: 1850, cat: "Rent", d: 1, h: 10, note: "Rent" },
    { a: "card", amt: 22.99, cat: "Entertainment", d: 1, h: 20, m: "netflix", note: "Netflix" },
    { a: "card", amt: 11.99, cat: "Entertainment", d: 3, h: 8, m: "spotify", note: "Spotify" },
    { a: "main", amt: 85, cat: "Phone & Internet", d: 5, h: 15, m: "verizon", note: "Verizon" },
    { a: "card", amt: 9.99, cat: "Subscriptions", d: 6, h: 14, m: "icloud", note: "iCloud" },
    { a: "card", amt: 20, cat: "Subscriptions", d: 8, h: 9, m: "chatgpt", note: "ChatGPT" },
    { a: "main", amt: 107.8, cat: "Utilities", d: 8, h: 16, m: "conedison", note: "Con Edison" },
    { a: "paypal", amt: 15, cat: "Subscriptions", d: 9, h: 18, m: "figma", note: "Figma" },
    { a: "freelance", amt: 1450, cat: "Freelance", d: 12, h: 12, inc: true, note: "Freelance" },
    { a: "main", amt: 142.6, cat: "Groceries", d: 13, h: 11, m: "wholefoods", note: "Whole Foods Market" },
    { a: "card", amt: 24.5, cat: "Transport", d: 14, h: 19, m: "uber", note: "Uber" },
    { a: "card", amt: 41.2, cat: "Dining Out", d: 15, h: 20, m: "doordash", note: "DoorDash" },
    { a: "main", amt: 62.1, cat: "Fuel", d: 17, h: 17, m: "shell", note: "Shell" },
    { a: "main", amt: 171.35, cat: "Groceries", d: 19, h: 11, m: "costco", note: "Costco" },
    { a: "card", amt: 58.9, cat: "Shopping", d: 21, h: 13, m: "amazon", note: "Amazon" },
    { a: "card", amt: 33.4, cat: "Dining Out", d: 23, h: 20, m: "ubereats", note: "Uber Eats" },
    { a: "main", amt: 78.25, cat: "Groceries", d: 25, h: 10, m: "traderjoes", note: "Trader Joe's" },
    { a: "card", amt: 17.9, cat: "Transport", d: 27, h: 22, m: "lyft", note: "Lyft" },
    { a: "card", amt: 129, cat: "Shopping", d: 28, h: 14, m: "ikea", note: "IKEA" },
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
            a: "card",
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
            a: "amex",
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

function rateOf(currency) {
    if (currency === "USD") {
        return 1;
    }
    return currency === LEDGER_CURRENCY ? region.rate : VES_RATE;
}

const scaled = (account, amount) => (account.currency === LEDGER_CURRENCY ? region.scale(amount) : amount);
const merchantOf = (slot) => region.merchants[slot] ?? MERCHANTS[slot];

function noteOf(entry) {
    if (entry.m && entry.note === MERCHANTS[entry.m].label) {
        return merchantOf(entry.m).label;
    }
    return region.notes[entry.note] ?? entry.note;
}

for (const entry of entries) {
    const merchant = entry.m ? merchantOf(entry.m) : null;
    const brand = merchant ? await brandFor(merchant.domain) : null;
    const { imageColor, imageUri } = persistBrand(brand);

    const account = accountForRole(entry.a);
    const amount = scaled(account, entry.amt);
    const date = atMs(entry.year, entry.month, entry.d, entry.h, entry.min ?? 0);
    const income = entry.inc ? 1 : 0;
    const rate = rateOf(account.currency);
    const amountUsd = amount / rate;
    const rateType = account.currency === "USD" ? "" : "official";
    const schedule = carriers.get(entry.note) === entry;

    balanceDelta[account.id] += (income ? 1 : -1) * amount;

    statements.push(
        `INSERT INTO transactions (id, amount, income, currency, note, details, date, day, month, icon, emoji, customColor, imageColor, imageUri, onceRecurring, recurringType, recurringCoefficient, recurringEndDate, categoryId, updatedAt, deletedAt, amountUsd, exchangeRate, exchangeRateType, imageKey, reminderLeadDays, accountId, recurringAnchorDay, transferId)
     VALUES (${q(randomUUID())}, ${amount}, ${income}, ${q(account.currency)}, ${q(noteOf(entry))}, ${q(region.details[entry.det] ?? entry.det ?? "")}, ${date}, ${dayMs(entry.year, entry.month, entry.d)}, ${monthMs(entry.year, entry.month)}, '', '', '', ${q(imageColor)}, ${q(imageUri)}, 0, ${schedule ? (entry.every ?? RECURRING_MONTHLY) : 0}, 1, NULL, ${q(CATEGORY[entry.cat])}, ${NOW}, NULL, ${amountUsd}, ${rate}, ${q(rateType)}, '', ${q(schedule ? SCHEDULE_LEADS.get(entry.note) : null)}, ${q(account.id)}, ${schedule ? entry.d : "NULL"}, NULL);`
    );
}

const TRANSFER_USD = 400;
const transferFrom = accountForRole(region.roles.transferFrom);
const transferTo = accountForRole(region.roles.transferTo);
const transferRate = rateOf(transferTo.currency);
const transferToAmount = TRANSFER_USD * transferRate;
statements.push(
    `INSERT INTO transfers (id, date, dateCreated, day, month, deletedAt, exchangeRate, exchangeRateType, fromAccountId, fromAmount, fromAmountUsd, fromCurrency, note, toAccountId, toAmount, toAmountUsd, toCurrency, updatedAt)
   VALUES (${q(randomUUID())}, ${atMs(2026, 9, 7, 9, 30)}, ${NOW}, ${dayMs(2026, 9, 7)}, ${monthMs(2026, 9)}, NULL, ${transferRate}, 'official', ${q(transferFrom.id)}, ${TRANSFER_USD}, ${TRANSFER_USD}, 'USD', ${q(region.transferNote)}, ${q(transferTo.id)}, ${transferToAmount}, ${TRANSFER_USD}, ${q(transferTo.currency)}, ${NOW});`
);
balanceDelta[transferFrom.id] -= TRANSFER_USD;
balanceDelta[transferTo.id] += transferToAmount;

// After the rows and transfer, so `initialBalance` is solved back from each target.
for (const account of ACCOUNTS) {
    const brand = account.brand ? await brandFor(account.brand) : null;
    const { imageColor, imageUri } = persistBrand(brand);
    const initial = scaled(account, account.target) - balanceDelta[account.id];
    const initialUsd = initial / rateOf(account.currency);

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
    const amount = region.scale(budget.amount);
    statements.push(
        `INSERT OR REPLACE INTO budgets (id, name, amount, type, startDate, dateCreated, green, categoryId, updatedAt, deletedAt, currency, amountUsd, rollover)
     VALUES (${q(randomUUID())}, NULL, ${amount}, ${BUDGET_TYPE_MONTH}, ${dayMs(2026, 9, 1)}, ${dayMs(2026, 6, 1)}, 0, ${q(CATEGORY[budget.category])}, ${NOW}, NULL, ${q(LEDGER_CURRENCY)}, ${amount / region.rate}, 0);`
    );
}

// Carry-over off so the frame's arithmetic closes: 3900 - 2881.41 = 1018.59.
const MAIN_BUDGET = region.scale(3900);
statements.push(
    `INSERT OR REPLACE INTO mainBudget (id, name, amount, type, startDate, dateCreated, green, updatedAt, deletedAt, currency, amountUsd, rollover)
   VALUES (${q(randomUUID())}, ${q(region.budgetName)}, ${MAIN_BUDGET}, ${BUDGET_TYPE_MONTH}, ${dayMs(2026, 9, 1)}, ${dayMs(2026, 6, 1)}, 0, ${NOW}, NULL, ${q(LEDGER_CURRENCY)}, ${MAIN_BUDGET / region.rate}, 0);`
);

const GOALS = [
    {
        account: accountForRole("goal"),
        name: region.goalNames.japan,
        start: 1200,
        target: 6000,
        targetDate: dayMs(2027, 4, 1),
    },
    {
        account: accountForRole("main"),
        name: region.goalNames.emergency,
        start: 8000,
        target: 15_000,
        targetDate: dayMs(2027, 12, 31),
    },
    {
        account: accountForRole("cash"),
        name: region.goalNames.macbook,
        start: 0,
        target: 3499,
        targetDate: dayMs(2027, 6, 1),
    },
];

for (const [index, goal] of GOALS.entries()) {
    const start = region.scale(goal.start);
    const goalTarget = region.scale(goal.target);
    const { rate } = region;
    statements.push(
        `INSERT OR REPLACE INTO savingsGoals (id, accountId, currency, dateCreated, deletedAt, name, sortOrder, startAmount, startAmountUsd, targetAmount, targetAmountUsd, targetDate, updatedAt, exchangeRate)
     VALUES (${q(randomUUID())}, ${q(goal.account.id)}, ${q(goal.account.currency)}, ${dayMs(2026, 6, 1)}, NULL, ${q(goal.name)}, ${index}, ${start}, ${start / rate}, ${goalTarget}, ${goalTarget / rate}, ${goal.targetDate}, ${NOW}, ${rate === 1 ? "NULL" : rate});`
    );
}

if (LEDGER_CURRENCY !== "USD") {
    const rows = [];
    for (let time = RATES_FROM; time <= RATES_THROUGH; time += DAY_MS) {
        const date = new Date(time).toISOString().slice(0, 10);
        rows.push(`(${q(date)}, ${NOW}, ${q(LEDGER_CURRENCY)}, ${region.rate}, 'official', 'seed')`);
    }
    statements.push(
        `DELETE FROM exchangeRates WHERE quote = ${q(LEDGER_CURRENCY)} AND rateType = 'official';`,
        `INSERT INTO exchangeRates (date, fetchedAt, quote, rate, rateType, source) VALUES ${rows.join(", ")};`,
        `INSERT OR REPLACE INTO appMeta (key, value) VALUES ('currency', ${q(LEDGER_CURRENCY)}), ('currencyChosen', 'true'), ('lastRatesPullAt', '${RATES_PULLED_AT}');`
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
    `UPDATE appMeta SET value = ${q(accountForRole("main").id)} WHERE key = 'lastTransactionAccount';`,
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
const GROCERIES_ID = CATEGORY.Groceries;
const ledgerSum = `CASE WHEN currency = ${q(LEDGER_CURRENCY)} THEN amount ELSE amountUsd * ${region.rate} END`;
const spendSummary = sqlite(
    `SELECT printf('month spend=%.2f groceries=%.2f/%.2f', (SELECT sum(${ledgerSum}) FROM transactions WHERE income = 0 AND month = ${monthMs(2026, 9)}), (SELECT sum(${ledgerSum}) FROM transactions WHERE income = 0 AND month = ${monthMs(2026, 9)} AND categoryId = ${q(GROCERIES_ID)}), (SELECT amount FROM budgets WHERE categoryId = ${q(GROCERIES_ID)}));`
).trim();
const balanceSummary = sqlite(
    `SELECT group_concat(name || ' ' || printf('%.2f', balance) || ' ' || currency, ', ') FROM (SELECT a.name, a.currency, a.initialBalance + COALESCE((SELECT sum(CASE income WHEN 1 THEN amount ELSE -amount END) FROM transactions t WHERE t.accountId = a.id), 0) + COALESCE((SELECT sum(toAmount) FROM transfers WHERE toAccountId = a.id), 0) - COALESCE((SELECT sum(fromAmount) FROM transfers WHERE fromAccountId = a.id), 0) AS balance FROM accounts a ORDER BY a.sortOrder);`
).trim();
rmSync(tmp, { force: true, recursive: true });
ledger.commit();

console.log(
    `region=${regionName} accounts=${accounts} transactions=${transactions} budgets=${budgets} goals=${goals} transfers=${transfers} logos=${logos} outbox=${queued} (signed out)`
);
console.log(`${spendSummary} (${LEDGER_CURRENCY})`);
console.log(`balances: ${balanceSummary}`);
