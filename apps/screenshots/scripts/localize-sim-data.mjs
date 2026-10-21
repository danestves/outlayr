// Names are user data, so the es capture renames the rows first and back after. Usage: node
// apps/screenshots/scripts/localize-sim-data.mjs <UDID> es|en

import { execFileSync } from "node:child_process";
import { join } from "node:path";

const [udid, direction] = process.argv.slice(2);
if (!udid || (direction !== "es" && direction !== "en")) {
    throw new Error("Usage: localize-sim-data.mjs <UDID> es|en");
}

const BUNDLE_ID = "com.tryoutlayr.app";
const dataContainer = execFileSync("xcrun", ["simctl", "get_app_container", udid, BUNDLE_ID, "data"], {
    encoding: "utf-8",
}).trim();
const dbPath = join(dataContainer, "Documents/SQLite/outlayr.db");

const sqlite = (sql) => execFileSync("sqlite3", [dbPath, sql], { encoding: "utf-8" }).trim();

// Renames are plain UPDATEs, which the outbox triggers queue while sync is on.
const identity = sqlite(
    "SELECT count(*) FROM appMeta WHERE (key = 'syncEnabled' AND value = '1') OR key IN ('syncAccountSubject', 'ledgerAdoption');"
);
if (identity !== "0") {
    throw new Error(
        `This ledger is attached to an account. Run: node apps/screenshots/scripts/seed-sim-ledger.mjs ${udid}`
    );
}

const CATEGORIES = {
    Business: "Negocio",
    Coffee: "Café",
    "Dining Out": "Restaurantes",
    Entertainment: "Entretenimiento",
    Freelance: "Freelance",
    Fuel: "Gasolina",
    Gifts: "Regalos",
    Groceries: "Súper",
    Healthcare: "Salud",
    Home: "Hogar",
    Paycheck: "Sueldo",
    "Phone & Internet": "Teléfono e internet",
    Rent: "Renta",
    Shopping: "Compras",
    Subscriptions: "Suscripciones",
    Transport: "Transporte",
    Travel: "Viajes",
    Utilities: "Servicios",
};

const ACCOUNTS = { "Ally Savings": "Ahorros Ally", Cash: "Efectivo" };

const GOALS = {
    "Emergency fund": "Fondo de emergencia",
    "Japan, April": "Japón, abril",
    "New MacBook": "MacBook nueva",
};

const BUDGETS = { "Monthly spending": "Gasto mensual" };

const TAGS = { Warehouse: "Mayorista" };

const NOTES = { Rent: "Renta" };

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;

function pair(map) {
    return Object.entries(map).map(([en, es]) => (direction === "es" ? [en, es] : [es, en]));
}

const statements = ["BEGIN;"];
for (const [table, map, column = "name"] of [
    ["categories", CATEGORIES],
    ["accounts", ACCOUNTS],
    ["savingsGoals", GOALS],
    ["mainBudget", BUDGETS],
    ["tags", TAGS],
    ["transactions", NOTES, "note"],
]) {
    for (const [from, to] of pair(map)) {
        statements.push(`UPDATE ${table} SET ${column} = ${q(to)} WHERE ${column} = ${q(from)};`);
    }
}
statements.push("COMMIT;");

sqlite(statements.join("\n"));

const renamed = sqlite(
    "SELECT group_concat(name, ', ') FROM (SELECT name FROM categories WHERE deletedAt IS NULL ORDER BY sortOrder LIMIT 5);"
);

console.log(`-> ${direction}: ${renamed}`);
