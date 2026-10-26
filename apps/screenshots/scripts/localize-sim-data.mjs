import { execFileSync } from "node:child_process";

import { openLedger } from "./ledger-target.mjs";

const LANGUAGE_ALIASES = { "pt-BR": "pt" };
const [target, requested] = process.argv.slice(2);
const language = LANGUAGE_ALIASES[requested] ?? requested;

const ES_CATEGORIES = {
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

const LANGUAGES = {
    es: {
        accounts: { "Ally Savings": "Ahorros Ally", Cash: "Efectivo" },
        budgets: { "Monthly spending": "Gasto mensual" },
        categories: ES_CATEGORIES,
        goals: {
            "Emergency fund": "Fondo de emergencia",
            "Japan, April": "Japón, abril",
            "New MacBook": "MacBook nueva",
        },
        notes: { Rent: "Renta" },
        tags: { Warehouse: "Mayorista" },
    },
    "es-ES": {
        categories: {
            ...ES_CATEGORIES,
            Entertainment: "Ocio",
            "Phone & Internet": "Móvil e internet",
            Paycheck: "Nómina",
            Rent: "Alquiler",
            Utilities: "Suministros",
        },
        tags: { Warehouse: "Mayorista" },
    },
    fr: {
        categories: {
            Business: "Entreprise",
            Coffee: "Café",
            "Dining Out": "Restaurants",
            Entertainment: "Loisirs",
            Freelance: "Freelance",
            Fuel: "Carburant",
            Gifts: "Cadeaux",
            Groceries: "Courses",
            Healthcare: "Santé",
            Home: "Maison",
            Paycheck: "Salaire",
            "Phone & Internet": "Téléphone et internet",
            Rent: "Loyer",
            Shopping: "Shopping",
            Subscriptions: "Abonnements",
            Transport: "Transports",
            Travel: "Voyages",
            Utilities: "Factures",
        },
        tags: { Warehouse: "Magasin-entrepôt" },
    },
    pt: {
        categories: {
            Business: "Negócio",
            Coffee: "Café",
            "Dining Out": "Restaurantes",
            Entertainment: "Lazer",
            Freelance: "Freela",
            Fuel: "Combustível",
            Gifts: "Presentes",
            Groceries: "Mercado",
            Healthcare: "Saúde",
            Home: "Casa",
            Paycheck: "Salário",
            "Phone & Internet": "Celular e internet",
            Rent: "Aluguel",
            Shopping: "Compras",
            Subscriptions: "Assinaturas",
            Transport: "Transporte",
            Travel: "Viagens",
            Utilities: "Contas",
        },
        tags: { Warehouse: "Atacado" },
    },
    "pt-PT": {
        categories: {
            Business: "Negócio",
            Coffee: "Café",
            "Dining Out": "Restaurantes",
            Entertainment: "Lazer",
            Freelance: "Freelance",
            Fuel: "Combustível",
            Gifts: "Presentes",
            Groceries: "Supermercado",
            Healthcare: "Saúde",
            Home: "Casa",
            Paycheck: "Salário",
            "Phone & Internet": "Telemóvel e internet",
            Rent: "Renda",
            Shopping: "Compras",
            Subscriptions: "Subscrições",
            Transport: "Transportes",
            Travel: "Viagens",
            Utilities: "Contas",
        },
        tags: { Warehouse: "Grossista" },
    },
};

if (!target || (language !== "en" && !LANGUAGES[language])) {
    throw new Error("Usage: localize-sim-data.mjs <UDID | android:SERIAL | db:PATH> en|es|es-ES|fr|pt|pt-PT");
}

const TABLES = [
    ["categories", "categories", "name"],
    ["accounts", "accounts", "name"],
    ["savingsGoals", "goals", "name"],
    ["mainBudget", "budgets", "name"],
    ["tags", "tags", "name"],
    ["transactions", "notes", "note"],
];

const ledger = openLedger(target);
const sqlite = (sql) => execFileSync("sqlite3", [ledger.dbPath, sql], { encoding: "utf-8" }).trim();

// Renames are plain UPDATEs, which the outbox triggers queue while sync is on.
const identity = sqlite(
    "SELECT count(*) FROM appMeta WHERE (key = 'syncEnabled' AND value = '1') OR key IN ('syncAccountSubject', 'ledgerAdoption');"
);
if (identity !== "0") {
    throw new Error(
        `This ledger is attached to an account. Run: node apps/screenshots/scripts/seed-sim-ledger.mjs ${target}`
    );
}

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;

const SEEDED_LOCAL = new Set(["accounts", "goals", "budgets", "notes"]);
const isUsLedger = sqlite("SELECT value FROM appMeta WHERE key = 'currency';") === "USD";

function restoreStatements() {
    const reverse = new Map();
    for (const names of Object.values(LANGUAGES)) {
        for (const [table, key, column] of TABLES) {
            if (!isUsLedger && SEEDED_LOCAL.has(key)) {
                continue;
            }
            for (const [en, local] of Object.entries(names[key] ?? {})) {
                const held = reverse.get(`${table}|${local}`);
                if (held !== undefined && held.en !== en) {
                    throw new Error(`"${local}" renames to both "${held.en}" and "${en}" in ${table}.`);
                }
                reverse.set(`${table}|${local}`, { column, en, local, table });
            }
        }
    }
    return [...reverse.values()]
        .filter(({ en, local }) => en !== local)
        .map(
            ({ column, en, local, table }) => `UPDATE ${table} SET ${column} = ${q(en)} WHERE ${column} = ${q(local)};`
        );
}

const statements = ["BEGIN;", ...restoreStatements()];
if (language !== "en") {
    for (const [table, key, column] of TABLES) {
        for (const [en, local] of Object.entries(LANGUAGES[language][key] ?? {})) {
            statements.push(`UPDATE ${table} SET ${column} = ${q(local)} WHERE ${column} = ${q(en)};`);
        }
    }
}
statements.push("COMMIT;");

sqlite(statements.join("\n"));

const renamed = sqlite(
    "SELECT group_concat(name, ', ') FROM (SELECT name FROM categories WHERE deletedAt IS NULL ORDER BY sortOrder LIMIT 5);"
);

ledger.commit();
console.log(`-> ${language}: ${renamed}`);
