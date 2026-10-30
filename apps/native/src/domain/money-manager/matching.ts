import type { AccountKind } from "@outlayr/money/account-kind";

import { CATEGORY_PALETTE, SUGGESTED_CATEGORY_PRESETS } from "@/data/categories-core";

const FALLBACK_ICON = "MoreHorizontalCircle01";

function mapValue<Table extends object>(table: Table, key: string): Table[keyof Table] | undefined {
    if (!Object.hasOwn(table, key)) {
        return undefined;
    }
    // SAFETY: Object.hasOwn just proved `key` is an own property of `table`.
    return table[key as keyof Table];
}

const ICONS = {
    bank: "Bank",
    beauty: "HairDryer",
    beer: "Drink",
    bill: "Invoice01",
    binance_coin: "Coins01",
    binance_usd: "CoinsDollar",
    bonus: "Target01",
    burger: "Hamburger01",
    cafe: "Coffee02",
    camping: "Tent",
    car: "Car01",
    card: "CreditCard",
    cards: "CreditCard",
    carsharing: "Car01",
    cash: "Money01",
    clothes: "Dress01",
    credit_card: "CreditCard",
    deposit: "Savings",
    dogecoin: "Coins01",
    dollar: "CoinsDollar",
    education: "Mortarboard01",
    entertainment: "FilmRoll01",
    family: "Kid",
    food: "Restaurant01",
    gift: "Gift",
    haircut: "HairDryer",
    health: "Health",
    heart: "Heart",
    home: "Home01",
    insurance: "Shield01",
    internet: "Wifi01",
    investments: "ChartUp",
    kids: "Kid",
    notebook: "Book01",
    online_wallet: "Wallet03",
    other: FALLBACK_ICON,
    paypal: "Wallet03",
    pets: "Bone01",
    phone: "Wifi01",
    piggy_bank: "PiggyBank",
    prepaid: "CreditCard",
    present: "Gift",
    products: "ShoppingCart01",
    purse: "Wallet01",
    refueling: "Fuel01",
    rent: "Home01",
    restaurant: "Restaurant01",
    safe: "Safe",
    salary: "MoneyBag01",
    sale: "SaleTag01",
    savings: "Savings",
    sport: "Dumbbell01",
    taxes: "Taxes",
    taxi: "Taxi",
    ton: "Coins01",
    transport: "Bus01",
    travels: "Airplane01",
    wallet: "Wallet01",
    yuan: "Coins01",
} as const;

/** Direct icon replacement. Family icons (car, camping, notebook) stay out so they can become subcategories. */
const DIRECT_ICON = {
    bill: "Utilities",
    bonus: "Bonus",
    burger: "Dining Out",
    cafe: "Coffee",
    clothes: "Fashion",
    education: "Education",
    family: "Family",
    haircut: "Personal Care",
    heart: "Healthcare",
    home: "Home",
    present: "Gifts",
    products: "Groceries",
    refueling: "Fuel",
    sale: "Shopping",
    sport: "Fitness",
    transport: "Transport",
    travels: "Travel",
} as const;

const ICON_FAMILY = {
    ...DIRECT_ICON,
    beauty: "Personal Care",
    beer: "Entertainment",
    camping: "Travel",
    car: "Transport",
    carsharing: "Transport",
    entertainment: "Entertainment",
    food: "Dining Out",
    gift: "Gifts",
    health: "Healthcare",
    kids: "Family",
    pets: "Pets",
    phone: "Phone & Internet",
    internet: "Phone & Internet",
    purse: "Shopping",
    rent: "Rent",
    restaurant: "Dining Out",
    salary: "Paycheck",
    taxi: "Transport",
    insurance: "Insurance",
    taxes: "Taxes",
} as const;

const NAME_PRESET = {
    academia: "Fitness",
    aluguel: "Rent",
    alquiler: "Rent",
    arriendo: "Rent",
    assinaturas: "Subscriptions",
    barberia: "Personal Care",
    beleza: "Personal Care",
    belleza: "Personal Care",
    bills: "Utilities",
    bono: "Bonus",
    bonus: "Bonus",
    burger: "Dining Out",
    bus: "Transport",
    business: "Business",
    cadeaux: "Gifts",
    cafe: "Coffee",
    cafeteria: "Coffee",
    casa: "Home",
    celular: "Phone & Internet",
    clothes: "Fashion",
    coffee: "Coffee",
    combustible: "Fuel",
    comida: "Dining Out",
    compras: "Shopping",
    deporte: "Fitness",
    "dining out": "Dining Out",
    educacion: "Education",
    education: "Education",
    ejercicio: "Fitness",
    entertainment: "Entertainment",
    entretenimiento: "Entertainment",
    epicerie: "Groceries",
    escola: "Education",
    essence: "Fuel",
    facturas: "Utilities",
    familia: "Family",
    family: "Family",
    farmacia: "Healthcare",
    fitness: "Fitness",
    food: "Dining Out",
    freelance: "Freelance",
    freela: "Freelance",
    fuel: "Fuel",
    gas: "Fuel",
    gasolina: "Fuel",
    gift: "Gifts",
    gifts: "Gifts",
    gimnasio: "Fitness",
    gorjeta: "Tips",
    groceries: "Groceries",
    grocery: "Groceries",
    gym: "Fitness",
    haircut: "Personal Care",
    health: "Healthcare",
    hogar: "Home",
    home: "Home",
    impots: "Taxes",
    imposto: "Taxes",
    impostos: "Taxes",
    impuestos: "Taxes",
    insurance: "Insurance",
    interest: "Interest",
    intereses: "Interest",
    internet: "Phone & Internet",
    investimento: "Investments",
    investimentos: "Investments",
    inversiones: "Investments",
    investments: "Investments",
    juros: "Interest",
    lazer: "Entertainment",
    leisure: "Entertainment",
    loyer: "Rent",
    maison: "Home",
    mascotas: "Pets",
    medicina: "Healthcare",
    mercado: "Groceries",
    moda: "Fashion",
    negocio: "Business",
    negocios: "Business",
    nomina: "Paycheck",
    ocio: "Entertainment",
    paycheck: "Paycheck",
    peluqueria: "Personal Care",
    "personal care": "Personal Care",
    pets: "Pets",
    phone: "Phone & Internet",
    present: "Gifts",
    presente: "Gifts",
    products: "Groceries",
    propinas: "Tips",
    reembolso: "Refund",
    refueling: "Fuel",
    regalo: "Gifts",
    regalos: "Gifts",
    rent: "Rent",
    renta: "Rent",
    restaurant: "Dining Out",
    restaurante: "Dining Out",
    ropa: "Fashion",
    roupa: "Fashion",
    salaire: "Paycheck",
    salario: "Paycheck",
    salary: "Paycheck",
    salidas: "Entertainment",
    sante: "Healthcare",
    saude: "Healthcare",
    salud: "Healthcare",
    seguro: "Insurance",
    seguros: "Insurance",
    servicios: "Utilities",
    shopping: "Shopping",
    sport: "Fitness",
    subscriptions: "Subscriptions",
    sueldo: "Paycheck",
    supermercado: "Groceries",
    supermarket: "Groceries",
    suscripciones: "Subscriptions",
    taxi: "Transport",
    taxes: "Taxes",
    telefone: "Phone & Internet",
    telefono: "Phone & Internet",
    tip: "Tips",
    tips: "Tips",
    transport: "Transport",
    transporte: "Transport",
    travel: "Travel",
    utilities: "Utilities",
    vacaciones: "Travel",
    viagem: "Travel",
    viajes: "Travel",
    voyage: "Travel",
} as const;

const LIABILITY_ICONS = new Set(["card", "cards", "credit_card"]);

const paletteHue = CATEGORY_PALETTE.map((hex) => hueOf(hex));

export function normalizeLabel(raw: string): string {
    return raw
        .trim()
        .normalize("NFD")
        .replaceAll(/[\u0300-\u036F]/g, "")
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, " ")
        .trim()
        .replaceAll(/ +/g, " ");
}

export function outlayrIconFor(mmIcon: string | null): string {
    if (mmIcon == null || mmIcon.trim() === "") {
        return FALLBACK_ICON;
    }
    return mapValue(ICONS, mmIcon.trim()) ?? FALLBACK_ICON;
}

export function suggestAccountKind(title: string, mmIcon: string | null, storedBalance: number | null): AccountKind {
    const label = normalizeLabel(title);
    if (label.includes("credito") || label.includes("credit")) {
        return "liability";
    }
    const looksLikeCard =
        (mmIcon != null && LIABILITY_ICONS.has(mmIcon.trim())) || label.includes("card") || label.includes("tarjeta");
    // Money Manager draws debit and prepaid cards with the same icon; only money owed says it is credit.
    return looksLikeCard && storedBalance != null && storedBalance < 0 ? "liability" : "asset";
}

function presetNames(income: boolean): readonly string[] {
    const pool = income ? SUGGESTED_CATEGORY_PRESETS.income : SUGGESTED_CATEGORY_PRESETS.expense;
    return pool.map((preset) => preset.name);
}

function inNamespace(name: string, income: boolean): boolean {
    return presetNames(income).includes(name);
}

export function presetForMoneyManager(title: string, mmIcon: string | null, income: boolean): string | null {
    const named = mapValue(NAME_PRESET, normalizeLabel(title));
    if (named != null && inNamespace(named, income)) {
        return named;
    }
    const direct = mmIcon == null ? undefined : mapValue(DIRECT_ICON, mmIcon.trim());
    if (direct != null && inNamespace(direct, income)) {
        return direct;
    }
    return null;
}

export function iconFamilyPreset(mmIcon: string | null, income: boolean): string | null {
    if (mmIcon == null) {
        return null;
    }
    const family = mapValue(ICON_FAMILY, mmIcon.trim());
    return family != null && inNamespace(family, income) ? family : null;
}

export function nearestPaletteColor(mmColor: string | null): string {
    const [first] = CATEGORY_PALETTE;
    if (mmColor == null) {
        return first;
    }
    const parsed = hueOf(mmColor);
    if (parsed == null || parsed.saturation < 0.12) {
        return first;
    }
    let best: string = first;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < CATEGORY_PALETTE.length; index += 1) {
        const candidate = paletteHue[index];
        if (candidate == null) {
            continue;
        }
        const distance = hueDistance(parsed.hue, candidate.hue);
        if (distance < bestDistance) {
            bestDistance = distance;
            best = CATEGORY_PALETTE[index] ?? first;
        }
    }
    return best;
}

function hueDistance(left: number, right: number): number {
    const delta = Math.abs(left - right) % 360;
    return Math.min(delta, 360 - delta);
}

function hueOf(hex: string): { hue: number; saturation: number } | null {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
    if (match?.[1] == null) {
        return null;
    }
    const value = Number.parseInt(match[1], 16);
    const red = (Math.floor(value / 65_536) % 256) / 255;
    const green = (Math.floor(value / 256) % 256) / 255;
    const blue = (value % 256) / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    if (delta === 0) {
        return { hue: 0, saturation: 0 };
    }
    const lightness = (max + min) / 2;
    const saturation = delta / (1 - Math.abs(2 * lightness - 1));
    let hue: number;
    if (max === red) {
        hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
        hue = (blue - red) / delta + 2;
    } else {
        hue = (red - green) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) {
        hue += 360;
    }
    return { hue, saturation };
}
