/// <reference types="vite/client" />

import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resolveTextModel } from "@outlayr/ai/model";
import type { TextModel } from "@outlayr/ai/model";
import { liveModel } from "@outlayr/ai/testing";
import { route } from "@outlayr/model-router/route";
import { CANONICAL_CATEGORY_NAMES } from "@outlayr/money/contract";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { describe, it } from "vite-plus/test";

import { runSuggest } from "./enrichment";

// Opt-in: RUN_LIVE_MODEL_TESTS=1 plus the configured provider's key. Spends about $2 per full run on Anthropic;
// feeds packages/model-router/scripts/score-eval.ts, which fits and scores the routing rules.
const enabled = (await liveModel(route({ feature: "background_suggest" }))) !== undefined;
const OUT = process.env.EVAL_OUT ?? join(tmpdir(), "model-route-eval.json");
const SET = process.env.EVAL_SET ?? "all";

const ARMS = [
    { effort: "low", model: "standard", runs: Number(process.env.EVAL_RUNS_SONNET ?? "2") },
    { effort: "low", model: "fast", runs: Number(process.env.EVAL_RUNS_HAIKU ?? "3") },
    { effort: "medium", model: "fast", runs: Number(process.env.EVAL_RUNS_HAIKU ?? "3") },
] as const;

type Arm = (typeof ARMS)[number];

const canonical = (income: boolean) =>
    CANONICAL_CATEGORY_NAMES[income ? "income" : "expense"].map((name) => ({ children: [], name }));

const VE_LEDGER = [
    "Mercado",
    "Comida fuera",
    "Café",
    "Transporte",
    "Gasolina",
    "Servicios",
    "Internet y teléfono",
    "Suscripciones",
    "Salud",
    "Compras",
    "Ropa",
    "Entretenimiento",
    "Viajes",
    "Cuidado personal",
    "Mascotas",
    "Regalos",
    "Hogar",
].map((name) => ({ children: [], name }));

const NESTED = Object.entries({
    Casa: ["Alquiler", "Servicios", "Internet", "Mantenimiento"],
    Comida: ["Mercado", "Restaurantes", "Café", "Delivery"],
    Mascotas: [],
    Ocio: ["Cine", "Streaming", "Salidas"],
    Personal: ["Ropa", "Cuidado personal", "Gimnasio"],
    Regalos: [],
    Salud: ["Farmacia", "Médico"],
    Trabajo: ["Software", "Equipos"],
    Transporte: ["Gasolina", "Taxi y apps", "Estacionamiento"],
}).map(([name, children]) => ({ children, name }));

const HARD: Case[] = [
    { name: "PAGO MOVIL 0102 V12345678", place: "NV" },
    { name: "Estacionamiento CCCT", ok: ["Estacionamiento"], place: "NV" },
    { name: "Vercel Inc.", ok: ["Software"], place: "NV" },
    { name: "GITHUB", ok: ["Software"], place: "NV" },
    { name: "Figma monthly", ok: ["Software"], place: "NV" },
    { name: "Cursor AI", ok: ["Software"], place: "NV" },
    { name: "Claude.ai subscription", ok: ["Software"], place: "NV" },
    { name: "Plomero", ok: ["Mantenimiento"], place: "NV" },
    { name: "Recarga Digitel", ok: ["Internet", "Servicios"], place: "NV" },
    { name: "Aseo urbano", ok: ["Servicios"], place: "NV" },
    { name: "Condominio", ok: ["Servicios", "Alquiler"], okParent: ["Casa"], place: "NV" },
    { name: "Seguro HCM", ok: ["Médico"], okParent: ["Salud"], place: "NV" },
    { name: "Torta cumpleaños Ana", ok: ["Regalos", "Salidas", "Restaurantes", "Mercado"], place: "NV" },
    { name: "Kinesiólogo", ok: ["Médico"], place: "NV" },
    { name: "Netflix + Disney", ok: ["Streaming"], place: "NV" },
    { name: "Ferretería EPA", ok: ["Mantenimiento"], place: "NV" },
    { name: "Locatel", ok: ["Farmacia"], place: "NV" },
    { name: "Bodegón La Lagunita", ok: ["Mercado"], place: "NV" },
    { name: "Tasca", ok: ["Salidas", "Restaurantes"], place: "NV" },
    { name: "Uber", ok: ["Taxi y apps"], place: "NV" },
    { name: "Yummy delivery", ok: ["Delivery"], place: "NV" },
    { name: "Mensualidad colegio", newNot: ["Regalos", "Servicios"], place: "NV" },
    { name: "Vacuna perro", ok: ["Mascotas"], place: "NV" },
    { name: "Peaje", ok: ["Gasolina", "Estacionamiento"], okParent: ["Transporte"], place: "NV" },
    { name: "Corte de cabello", ok: ["Cuidado personal"], place: "NV" },
    { name: "Smartfit", ok: ["Gimnasio"], place: "NV" },
    { name: "Amazon - monitor", ok: ["Equipos"], place: "NV" },
    { name: "Binance P2P", place: "NV" },
    { name: "Repuestos carro", newNot: ["Gasolina"], okParent: ["Transporte"], place: "NV" },
    { name: "Cauchos nuevos", newNot: ["Gasolina"], okParent: ["Transporte"], place: "NV" },
];

interface Case {
    name: string;
    okParent?: string[];
    place: "US" | "VE" | "MX" | "NV";
    income?: boolean;
    ok?: string[];
    newNot?: string[];
    brand?: string;
    /** An empty list means no domain is right: the name names no merchant. */
    domain?: string[];
}

const CASES: Case[] = [
    { brand: "uber", domain: ["uber.com"], name: "UBER *TRIP HELP.UBER.COM", ok: ["Transport"], place: "US" },
    { brand: "uber eats", domain: ["ubereats.com", "uber.com"], name: "UBER *EATS", ok: ["Dining Out"], place: "US" },
    { brand: "amazon", domain: ["amazon.com"], name: "AMZN Mktp US*2K4LM9", ok: ["Shopping"], place: "US" },
    {
        brand: "netflix",
        domain: ["netflix.com"],
        name: "PAYPAL *NETFLIX",
        ok: ["Subscriptions", "Entertainment"],
        place: "US",
    },
    {
        brand: "blue bottle",
        domain: ["bluebottlecoffee.com"],
        name: "SQ *BLUE BOTTLE COFFEE",
        ok: ["Coffee"],
        place: "US",
    },
    {
        brand: "shake shack",
        domain: ["shakeshack.com"],
        name: "TST* SHAKE SHACK 1234",
        ok: ["Dining Out"],
        place: "US",
    },
    {
        brand: "spotify",
        domain: ["spotify.com"],
        name: "SPOTIFY P2A3B4C5",
        ok: ["Subscriptions", "Entertainment"],
        place: "US",
    },
    {
        brand: "apple",
        domain: ["apple.com"],
        name: "APPLE.COM/BILL",
        ok: ["Subscriptions", "Entertainment"],
        place: "US",
    },
    {
        brand: "youtube",
        domain: ["youtube.com"],
        name: "GOOGLE *YouTubePremium",
        ok: ["Subscriptions", "Entertainment"],
        place: "US",
    },
    {
        brand: "whole foods",
        domain: ["wholefoodsmarket.com"],
        name: "WHOLEFDS MKT 10234",
        ok: ["Groceries"],
        place: "US",
    },
    { brand: "trader joe", domain: ["traderjoes.com"], name: "TRADER JOE S #552", ok: ["Groceries"], place: "US" },
    { brand: "shell", domain: ["shell.com", "shell.us"], name: "SHELL OIL 57444", ok: ["Fuel"], place: "US" },
    {
        brand: "cvs",
        domain: ["cvs.com"],
        name: "CVS/PHARMACY #08821",
        ok: ["Healthcare", "Personal Care", "Shopping"],
        place: "US",
    },
    { brand: "planet fitness", domain: ["planetfitness.com"], name: "PLANET FITNESS", ok: ["Fitness"], place: "US" },
    { brand: "delta", domain: ["delta.com"], name: "DELTA AIR 0062345", ok: ["Travel"], place: "US" },
    { brand: "airbnb", domain: ["airbnb.com"], name: "AIRBNB * HMQ2", ok: ["Travel"], place: "US" },
    {
        brand: "comcast",
        domain: ["xfinity.com", "comcast.com"],
        name: "COMCAST CABLE",
        ok: ["Phone & Internet", "Utilities"],
        place: "US",
    },
    { brand: "chewy", domain: ["chewy.com"], name: "CHEWY.COM", ok: ["Pets"], place: "US" },
    { brand: "duolingo", domain: ["duolingo.com"], name: "DUOLINGO", ok: ["Education", "Subscriptions"], place: "US" },
    { brand: "geico", domain: ["geico.com"], name: "GEICO *AUTO", ok: ["Insurance"], place: "US" },
    { domain: ["irs.gov"], name: "IRS USATAXPYMT", ok: ["Taxes"], place: "US" },
    { brand: "zara", domain: ["zara.com"], name: "ZARA USA 3021", ok: ["Fashion", "Shopping"], place: "US" },
    { brand: "starbucks", domain: ["starbucks.com"], name: "STARBUCKS STORE 08123", ok: ["Coffee"], place: "US" },
    { name: "Oil change", newNot: ["Fuel"], place: "US" },
    { name: "Haircut", ok: ["Personal Care"], place: "US" },
    { name: "Dog groomer", ok: ["Pets"], place: "US" },
    { name: "Birthday present for mom", ok: ["Gifts"], place: "US" },
    { name: "Rent November", ok: ["Rent"], place: "US" },
    { name: "Electricity bill", ok: ["Utilities"], place: "US" },
    { name: "Dentist", ok: ["Healthcare"], place: "US" },
    { income: true, name: "ClickIT payroll", ok: ["Paycheck"], place: "US" },
    { brand: "upwork", income: true, name: "Upwork payout", ok: ["Freelance"], place: "US" },
    {
        brand: "farmatodo",
        domain: ["farmatodo.com.ve", "farmatodo.com"],
        name: "FARMATODO C.A.",
        ok: ["Salud", "Cuidado personal"],
        place: "VE",
    },
    { brand: "gama", name: "Gama Express", ok: ["Mercado"], place: "VE" },
    { brand: "ridery", name: "Ridery", ok: ["Transporte"], place: "VE" },
    { brand: "yummy", name: "Yummy Rides", ok: ["Transporte"], place: "VE" },
    {
        brand: "pedidosya",
        domain: ["pedidosya.com", "pedidosya.com.ve"],
        name: "PedidosYa",
        ok: ["Comida fuera"],
        place: "VE",
    },
    {
        brand: "cantv",
        domain: ["cantv.com.ve", "cantv.net"],
        name: "CANTV",
        ok: ["Internet y teléfono", "Servicios"],
        place: "VE",
    },
    {
        brand: "movistar",
        domain: ["movistar.com.ve"],
        name: "Movistar recarga",
        ok: ["Internet y teléfono"],
        place: "VE",
    },
    { brand: "corpoelec", domain: ["corpoelec.gob.ve"], name: "Corpoelec", ok: ["Servicios"], place: "VE" },
    { name: "PDV gasolina subsidiada", ok: ["Gasolina"], place: "VE" },
    { brand: "traki", domain: ["traki.com.ve", "traki.com"], name: "Traki", ok: ["Ropa", "Compras"], place: "VE" },
    { name: "Cambio de aceite del carro", newNot: ["Gasolina"], place: "VE" },
    { name: "Lavado de carro", newNot: ["Gasolina", "Hogar"], place: "VE" },
    {
        brand: "mcdonald",
        domain: ["mcdonalds.com", "mcdonalds.com.ve"],
        name: "McDonald's",
        ok: ["Comida fuera"],
        place: "VE",
    },
    {
        brand: "spotify",
        domain: ["spotify.com"],
        name: "Spotify",
        ok: ["Suscripciones", "Entretenimiento"],
        place: "VE",
    },
    { name: "Panadería", ok: ["Mercado", "Comida fuera", "Café"], place: "VE" },
    { brand: "cashea", name: "Cashea cuota", place: "VE" },
    { brand: "cinex", domain: ["cinex.com.ve"], name: "Cinex", ok: ["Entretenimiento"], place: "VE" },
    { name: "Veterinaria", ok: ["Mascotas"], place: "VE" },
    { name: "Peluquería", ok: ["Cuidado personal"], place: "VE" },
    { brand: "oxxo", domain: ["oxxo.com"], name: "OXXO", ok: ["Mercado", "Compras", "Café"], place: "MX" },
    { brand: "didi", domain: ["didiglobal.com", "didi.com.mx"], name: "DIDI", ok: ["Transporte"], place: "MX" },
    { brand: "rappi", domain: ["rappi.com", "rappi.com.mx"], name: "RAPPI", ok: ["Comida fuera"], place: "MX" },
    { brand: "liverpool", domain: ["liverpool.com.mx"], name: "LIVERPOOL", ok: ["Compras", "Ropa"], place: "MX" },
    { brand: "telmex", domain: ["telmex.com"], name: "TELMEX", ok: ["Internet y teléfono"], place: "MX" },
];

const EXTRA: Case[] = [
    { domain: [], name: "Zelle Maria Perez", place: "US" },
    { domain: [], name: "Transferencia a José", place: "VE" },
    { domain: [], name: "Pago móvil Luis", place: "VE" },
    { domain: [], name: "Venmo - rent split", ok: ["Rent"], place: "US" },
    { domain: [], name: "Cash App *JOHN D", place: "US" },
    { domain: [], name: "PAYPAL *JUANPEREZ", place: "US" },
    { name: "Reserve cambio USDT", place: "VE" },
    { brand: "zinli", name: "Zinli recarga", place: "VE" },
    { domain: [], name: "POS 4410 VZLA 0023", place: "VE" },
    { domain: [], name: "TDC 5489 PAGO", place: "VE" },
    { domain: [], name: "SQ *8834", place: "US" },
    { domain: [], name: "PMT 0045533", place: "US" },
    {
        brand: "7-eleven",
        domain: ["7-eleven.com"],
        name: "7-ELEVEN 34512",
        ok: ["Groceries", "Fuel", "Shopping", "Coffee"],
        place: "US",
    },
    { brand: "h-e-b", name: "CHECKCARD 1104 HEB #555", ok: ["Groceries"], place: "US" },
    {
        brand: "walmart",
        domain: ["walmart.com"],
        name: "WM SUPERCENTER #1234",
        ok: ["Groceries", "Shopping"],
        place: "US",
    },
    { brand: "allbirds", domain: ["allbirds.com"], name: "SP * ALLBIRDS", ok: ["Fashion", "Shopping"], place: "US" },
    { name: "TST* JOE'S PIZZA", ok: ["Dining Out"], place: "US" },
    { name: "PY *SPRINGFIELD WATER", ok: ["Utilities"], place: "US" },
    { name: "Farmacia", ok: ["Salud"], place: "VE" },
    { name: "Almuerzo", ok: ["Comida fuera"], place: "VE" },
    { name: "Taxi", ok: ["Transporte"], place: "VE" },
    { name: "Parking", ok: ["Transport"], place: "US" },
    { name: "Lunch with team", ok: ["Dining Out"], place: "US" },
    { name: "Laundromat", newNot: ["Utilities", "Shopping"], ok: ["Home", "Personal Care"], place: "US" },
    { name: "Tintorería", ok: ["Cuidado personal", "Ropa"], place: "VE" },
    { name: "Cerrajero", ok: ["Mantenimiento"], place: "NV" },
    { name: "Mecánico", newNot: ["Gasolina"], okParent: ["Transporte"], place: "NV" },
    { name: "Gas doméstico", ok: ["Servicios"], place: "NV" },
    { name: "Seguro del carro", newNot: ["Gasolina", "Estacionamiento"], okParent: ["Transporte"], place: "NV" },
    { name: "Matrícula universidad", newNot: ["Regalos", "Servicios", "Software"], place: "NV" },
    { name: "Delivery de sushi", ok: ["Delivery"], place: "NV" },
    { name: "Gym membership mensual", ok: ["Gimnasio"], place: "NV" },
    { name: "Uber al aeropuerto", ok: ["Taxi y apps"], place: "NV" },
    { name: "Netflix plan premium", ok: ["Streaming"], place: "NV" },
    { name: "Shopping en Sambil", okParent: ["Personal"], ok: ["Ropa"], place: "NV" },
    {
        brand: "starbucks",
        domain: ["starbucks.com", "starbucks.co.jp"],
        name: "スターバックス 渋谷",
        ok: ["Coffee"],
        place: "US",
    },
    { brand: "yandex", name: "Яндекс Такси", ok: ["Transport"], place: "US" },
    { name: "美团外卖", ok: ["Dining Out"], place: "US" },
    { brand: "central madeirense", name: "Central Madeirense", ok: ["Mercado"], place: "VE" },
    { brand: "excelsior gama", name: "Excelsior Gama", ok: ["Mercado"], place: "VE" },
    { brand: "daka", name: "Daka", ok: ["Compras", "Hogar"], place: "VE" },
    { brand: "movilnet", name: "Movilnet", ok: ["Internet y teléfono"], place: "VE" },
    { brand: "netuno", name: "Netuno", ok: ["Internet y teléfono", "Servicios"], place: "VE" },
    { brand: "simpletv", name: "SimpleTV", ok: ["Suscripciones", "Entretenimiento", "Servicios"], place: "VE" },
    { brand: "sigo", name: "Sigo", ok: ["Mercado", "Compras"], place: "VE" },
    { income: true, name: "Pago cliente factura 0042", ok: ["Freelance", "Business"], place: "US" },
    { income: true, name: "Venta de laptop usada", newNot: ["Paycheck"], ok: ["Business", "Refund"], place: "US" },
];

const PLACE = {
    NV: { currency: "USD", locale: "es-VE", regionCode: "VE" },
    MX: { currency: "MXN", locale: "es-MX", regionCode: "MX" },
    US: { currency: "USD", locale: "en-US", regionCode: "US" },
    VE: { currency: "VES", locale: "es-VE", regionCode: "VE" },
} as const;

const fold = (text: string) =>
    text
        .normalize("NFD")
        .replaceAll(/[̀-ͯ']/g, "")
        .toLowerCase();

interface Usage {
    inputTokens: number;
    outputTokens: number;
}

type Middleware = ReturnType<NonNullable<TextModel["middleware"]>>[number];

const usageProbe = (sink: Usage): Middleware => ({
    onFinish: (_ctx, { usage }) => {
        sink.inputTokens += usage?.promptTokens ?? 0;
        sink.outputTokens += usage?.completionTokens ?? 0;
    },
});

const armModel = async ({ effort, model }: Arm) => {
    const resolved = await Effect.runPromise(
        resolveTextModel({ ...route({ feature: "background_suggest" }), effort, model })
    );
    return Option.getOrThrow(resolved);
};

function grade(testCase: Case, suggestion: Awaited<ReturnType<typeof suggestOnce>>["suggestion"]) {
    const category = suggestion.categoryName;
    const parentOk = testCase.okParent?.includes(suggestion.parentCategoryName ?? "") ?? false;
    let categoryOk: boolean | null = null;
    if (parentOk) {
        categoryOk = true;
    } else if (testCase.ok !== undefined) {
        categoryOk = category !== null && testCase.ok.includes(category);
    }
    if (!categoryOk && testCase.newNot !== undefined) {
        categoryOk = suggestion.isNewCategory && category !== null && !testCase.newNot.includes(category);
    }
    const brandOk = testCase.brand === undefined ? null : fold(suggestion.merchantName ?? "").includes(testCase.brand);
    let domainGrade: "abstain" | "right" | "wrong" | null = null;
    if (testCase.domain !== undefined) {
        if (suggestion.domain === null) {
            domainGrade = testCase.domain.length === 0 ? "right" : "abstain";
        } else {
            domainGrade = testCase.domain.includes(suggestion.domain) ? "right" : "wrong";
        }
    }
    return { brandOk, categoryOk, domainGrade };
}

async function suggestOnce(armed: TextModel, testCase: Case) {
    const income = testCase.income ?? false;
    const trees = { MX: VE_LEDGER, NV: NESTED, US: canonical(income), VE: VE_LEDGER };
    const tree = trees[testCase.place];
    const usage: Usage = { inputTokens: 0, outputTokens: 0 };
    const model: TextModel = { ...armed, middleware: () => [usageProbe(usage)] };
    const suggestion = await Effect.runPromise(
        runSuggest(model, {
            ...PLACE[testCase.place],
            categoryTree: tree,
            income,
            name: testCase.name,
            timeoutMs: 30_000,
        })
    );
    return { suggestion, usage };
}

async function runOne(armed: TextModel, testCase: Case) {
    const started = performance.now();
    try {
        const { suggestion, usage } = await suggestOnce(armed, testCase);
        return {
            ...grade(testCase, suggestion),
            ms: Math.round(performance.now() - started),
            output: {
                category: suggestion.categoryName,
                domain: suggestion.domain,
                isNew: suggestion.isNewCategory,
                merchantName: suggestion.merchantName,
                parent: suggestion.parentCategoryName,
                tags: suggestion.tags,
            },
            usage,
        };
    } catch (error) {
        return { error: String(error), ms: Math.round(performance.now() - started) };
    }
}

const SETS: Record<string, Case[]> = {
    all: [...CASES, ...HARD, ...EXTRA],
    cases: CASES,
    extra: EXTRA,
    hard: HARD,
    pilot: [CASES[0], HARD[0], EXTRA[0]].filter((testCase) => testCase !== undefined),
};

function setOf(testCase: Case) {
    if (HARD.includes(testCase)) {
        return "hard";
    }
    return EXTRA.includes(testCase) ? "extra" : "cases";
}

describe.skipIf(!enabled)("routing arms on runSuggest", () => {
    it("runs every case on every arm", { timeout: 900_000 }, async () => {
        const cases = SETS[SET] ?? [];
        const queue = ARMS.flatMap((arm) =>
            Array.from({ length: arm.runs }, (_, run) => cases.map((testCase) => ({ arm, run, testCase }))).flat()
        );
        const armed = new Map(await Promise.all(ARMS.map(async (arm) => [arm, await armModel(arm)] as const)));
        const results: unknown[] = [];
        await Promise.all(
            Array.from({ length: 6 }, async () => {
                for (let job = queue.shift(); job !== undefined; job = queue.shift()) {
                    const model = armed.get(job.arm);
                    if (model === undefined) {
                        throw new Error("arm without a model");
                    }
                    const result = await runOne(model, job.testCase);
                    results.push({
                        case: job.testCase,
                        effort: job.arm.effort,
                        model: model.modelId,
                        run: job.run,
                        set: setOf(job.testCase),
                        ...result,
                    });
                    process.stderr.write(".");
                }
            })
        );
        await writeFile(OUT, JSON.stringify(results, null, 2));
        process.stderr.write(`\nwrote ${results.length} results to ${OUT}\n`);
    });
});
