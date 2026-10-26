const EUR_PER_USD = 0.86;
const BRL_PER_USD = 5.4;

const BRL_PRICE_POINTS = new Map([
    [22.99, 114.9],
    [11.99, 59.9],
    [9.99, 49.9],
    [24.99, 124.9],
    [3499, 17_499],
]);

const scaleBrl = (amount) => BRL_PRICE_POINTS.get(amount) ?? Math.round(amount * 5 * 100) / 100;
const keep = (amount) => amount;

const WISE_USD = {
    brand: "wise.com",
    color: "#9FE870",
    currency: "USD",
    icon: "Wallet02",
    id: "acc-wise",
    kind: "asset",
    name: "Wise USD",
    role: "fx",
    target: 5600,
};

const CASH_COLOR = "#C8C2B4";

function account(role, id, name, brand, color, currency, target, { icon = "Bank", kind = "asset" } = {}) {
    return { brand, color, currency, icon, id, kind, name, role, target };
}

function singleCardAccounts({ card, cash, currency, goal, main, paypal, savings }) {
    return [
        account("main", "acc-main", ...main, currency, 12_480.32),
        account("savings", "acc-savings", ...savings, currency, 9450, { icon: "PiggyBank" }),
        account("goal", "acc-goal", ...goal, currency, 3412.4),
        WISE_USD,
        account("paypal", "acc-paypal", ...paypal, currency, 612.8, { icon: "Wallet02" }),
        account("card", "acc-card", ...card, currency, -2082.7, { icon: "CreditCard", kind: "liability" }),
        account("cash", "acc-cash", cash, null, CASH_COLOR, currency, 220, { icon: "Wallet01" }),
    ];
}

const PAYPAL = ["PayPal", "paypal.com", "#1B64C4"];
const AMEX = ["Amex Gold", "americanexpress.com", "#2E6F9E"];
const REVOLUT = ["Revolut", "revolut.com", "#7B8794"];

const US = {
    accounts: [
        account("main", "acc-chase", "Chase", "chase.com", "#1567B0", "USD", 12_480.32),
        account("savings", "acc-savings", "Ally Savings", "ally.com", "#6B4FBB", "USD", 9450, { icon: "PiggyBank" }),
        account("goal", "acc-zinli", "Zinli", "zinli.com", "#7BD1FF", "USD", 3412.4),
        account("fx", "acc-banesco", "Banesco", "banesco.com", "#2D7A3E", "VES", 486_000),
        account("paypal", "acc-paypal", ...PAYPAL, "USD", 612.8, { icon: "Wallet02" }),
        account("card", "acc-apple", "Apple Card", "apple.com", "#1D1D1F", "USD", -842.15, {
            icon: "CreditCard",
            kind: "liability",
        }),
        account("amex", "acc-amex", ...AMEX, "USD", -1240.55, { icon: "CreditCard", kind: "liability" }),
        account("cash", "acc-cash", "Cash", null, CASH_COLOR, "USD", 220, { icon: "Wallet01" }),
    ],
    budgetName: "Monthly spending",
    currency: "USD",
    details: {},
    goalNames: { emergency: "Emergency fund", japan: "Japan, April", macbook: "New MacBook" },
    merchants: {},
    notes: {},
    rate: 1,
    roles: { freelance: "goal", transferFrom: "main", transferTo: "fx" },
    scale: keep,
    transferNote: "To Banesco",
};

const EURO_ROLES = { freelance: "fx", transferFrom: "fx", transferTo: "main" };

const ES = {
    accounts: [
        account("main", "acc-main", "BBVA", "bbva.es", "#1464A5", "EUR", 12_480.32),
        account("savings", "acc-savings", "ING Ahorro", "ing.es", "#FF6200", "EUR", 9450, { icon: "PiggyBank" }),
        account("goal", "acc-revolut", ...REVOLUT, "EUR", 3412.4),
        WISE_USD,
        account("paypal", "acc-paypal", ...PAYPAL, "EUR", 612.8, { icon: "Wallet02" }),
        account("card", "acc-card", "Tarjeta Santander", "santander.es", "#CC0000", "EUR", -842.15, {
            icon: "CreditCard",
            kind: "liability",
        }),
        account("amex", "acc-amex", ...AMEX, "EUR", -1240.55, { icon: "CreditCard", kind: "liability" }),
        account("cash", "acc-cash", "Efectivo", null, CASH_COLOR, "EUR", 220, { icon: "Wallet01" }),
    ],
    budgetName: "Gasto mensual",
    currency: "EUR",
    details: { "August salary": "Nómina de agosto", "client retainer": "fijo mensual del cliente" },
    goalNames: { emergency: "Fondo de emergencia", japan: "Japón, abril", macbook: "MacBook nuevo" },
    merchants: {
        amazon: { domain: "amazon.es", label: "Amazon" },
        conedison: { domain: "iberdrola.es", label: "Iberdrola" },
        costco: { domain: "carrefour.es", label: "Carrefour" },
        doordash: { domain: "glovoapp.com", label: "Glovo" },
        lyft: { domain: "bolt.eu", label: "Bolt" },
        nike: { domain: "zara.com", label: "Zara" },
        planetfitness: { domain: "basic-fit.com", label: "Basic-Fit" },
        shell: { domain: "repsol.com", label: "Repsol" },
        target: { domain: "elcorteingles.es", label: "El Corte Inglés" },
        traderjoes: { domain: "lidl.es", label: "Lidl" },
        uber: { domain: "cabify.com", label: "Cabify" },
        ubereats: { domain: "just-eat.es", label: "Just Eat" },
        verizon: { domain: "movistar.es", label: "Movistar" },
        wholefoods: { domain: "mercadona.es", label: "Mercadona" },
    },
    notes: { Paycheck: "Nómina", Rent: "Alquiler" },
    rate: EUR_PER_USD,
    roles: EURO_ROLES,
    scale: keep,
    transferNote: "A BBVA",
};

const FR = {
    accounts: [
        account("main", "acc-main", "BNP Paribas", "bnpparibas.com", "#00915A", "EUR", 12_480.32),
        account("savings", "acc-savings", "Livret A", null, "#6B4FBB", "EUR", 9450, { icon: "PiggyBank" }),
        account("goal", "acc-revolut", ...REVOLUT, "EUR", 3412.4),
        WISE_USD,
        account("paypal", "acc-paypal", ...PAYPAL, "EUR", 612.8, { icon: "Wallet02" }),
        account("card", "acc-card", "Carte Visa", "visa.com", "#1A1F71", "EUR", -842.15, {
            icon: "CreditCard",
            kind: "liability",
        }),
        account("amex", "acc-amex", ...AMEX, "EUR", -1240.55, { icon: "CreditCard", kind: "liability" }),
        account("cash", "acc-cash", "Espèces", null, CASH_COLOR, "EUR", 220, { icon: "Wallet01" }),
    ],
    budgetName: "Dépenses du mois",
    currency: "EUR",
    details: { "August salary": "Salaire d'août", "client retainer": "forfait mensuel client" },
    goalNames: { emergency: "Fonds d'urgence", japan: "Japon, avril", macbook: "Nouveau MacBook" },
    merchants: {
        amazon: { domain: "amazon.fr", label: "Amazon" },
        conedison: { domain: "edf.fr", label: "EDF" },
        costco: { domain: "carrefour.fr", label: "Carrefour" },
        doordash: { domain: "deliveroo.fr", label: "Deliveroo" },
        lyft: { domain: "bolt.eu", label: "Bolt" },
        nike: { domain: "decathlon.fr", label: "Decathlon" },
        planetfitness: { domain: "basic-fit.com", label: "Basic-Fit" },
        shell: { domain: "totalenergies.fr", label: "TotalEnergies" },
        target: { domain: "fnac.com", label: "Fnac" },
        traderjoes: { domain: "picard.fr", label: "Picard" },
        verizon: { domain: "orange.fr", label: "Orange" },
        wholefoods: { domain: "monoprix.fr", label: "Monoprix" },
    },
    notes: { Paycheck: "Salaire", Rent: "Loyer" },
    rate: EUR_PER_USD,
    roles: EURO_ROLES,
    scale: keep,
    transferNote: "Vers BNP Paribas",
};

const PT = {
    accounts: singleCardAccounts({
        card: ["Cartão Visa", "visa.com", "#1A1F71"],
        cash: "Dinheiro",
        currency: "EUR",
        goal: REVOLUT,
        main: ["Millennium bcp", "millenniumbcp.pt", "#D6006E"],
        paypal: PAYPAL,
        savings: ["Poupança CGD", "cgd.pt", "#6B4FBB"],
    }),
    budgetName: "Gastos mensais",
    currency: "EUR",
    details: { "August salary": "Salário de agosto", "client retainer": "avença do cliente" },
    goalNames: { emergency: "Fundo de emergência", japan: "Japão, abril", macbook: "MacBook novo" },
    merchants: {
        amazon: { domain: "amazon.es", label: "Amazon" },
        conedison: { domain: "edp.pt", label: "EDP" },
        costco: { domain: "pingodoce.pt", label: "Pingo Doce" },
        doordash: { domain: "glovoapp.com", label: "Glovo" },
        lyft: { domain: "uber.com", label: "Uber" },
        nike: { domain: "decathlon.pt", label: "Decathlon" },
        planetfitness: { domain: "holmesplace.pt", label: "Holmes Place" },
        shell: { domain: "galp.com", label: "Galp" },
        target: { domain: "worten.pt", label: "Worten" },
        traderjoes: { domain: "lidl.pt", label: "Lidl" },
        uber: { domain: "bolt.eu", label: "Bolt" },
        verizon: { domain: "meo.pt", label: "MEO" },
        wholefoods: { domain: "continente.pt", label: "Continente" },
    },
    notes: { Paycheck: "Salário", Rent: "Renda" },
    rate: EUR_PER_USD,
    roles: EURO_ROLES,
    scale: keep,
    transferNote: "Para Millennium bcp",
};

const BR = {
    accounts: singleCardAccounts({
        card: ["Cartão Nubank", "nubank.com.br", "#820AD1"],
        cash: "Dinheiro",
        currency: "BRL",
        goal: ["Inter", "bancointer.com.br", "#FF7A00"],
        main: ["Nubank", "nubank.com.br", "#820AD1"],
        paypal: ["PicPay", "picpay.com", "#11C76F"],
        savings: ["Poupança Itaú", "itau.com.br", "#6B4FBB"],
    }),
    budgetName: "Gasto mensal",
    currency: "BRL",
    details: { "August salary": "Salário de agosto", "client retainer": "contrato mensal do cliente" },
    goalNames: { emergency: "Reserva de emergência", japan: "Japão, abril", macbook: "MacBook novo" },
    merchants: {
        amazon: { domain: "amazon.com.br", label: "Amazon" },
        conedison: { domain: "enel.com.br", label: "Enel" },
        costco: { domain: "carrefour.com.br", label: "Carrefour" },
        doordash: { domain: "ifood.com.br", label: "iFood" },
        lyft: { domain: "uber.com", label: "Uber" },
        nike: { domain: "lojasrenner.com.br", label: "Renner" },
        planetfitness: { domain: "smartfit.com.br", label: "Smart Fit" },
        shell: { domain: "ipiranga.com.br", label: "Ipiranga" },
        target: { domain: "mercadolivre.com.br", label: "Mercado Livre" },
        traderjoes: { domain: "assai.com.br", label: "Assaí" },
        uber: { domain: "99app.com", label: "99" },
        ubereats: { domain: "rappi.com.br", label: "Rappi" },
        verizon: { domain: "vivo.com.br", label: "Vivo" },
        wholefoods: { domain: "paodeacucar.com", label: "Pão de Açúcar" },
    },
    notes: { Freelance: "Freela", Paycheck: "Salário", Rent: "Aluguel" },
    rate: BRL_PER_USD,
    roles: EURO_ROLES,
    scale: scaleBrl,
    transferNote: "Para Nubank",
};

export const REGIONS = { br: BR, es: ES, fr: FR, pt: PT, us: US };
