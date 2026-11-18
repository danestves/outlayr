import { toAccountKind } from "./account-kind";
import { merchantKey } from "./merchant-key";
import { buildPatternIndex, containsTokenSequence } from "./pattern-index";

// Account names only: in `resolveMerchant` these would suppress the model call for a payee named "Chase".
export const INSTALLMENT_REGIONS = [
    "AE",
    "AT",
    "AU",
    "CA",
    "CO",
    "DE",
    "ES",
    "FR",
    "GB",
    "IT",
    "JP",
    "MX",
    "NL",
    "NZ",
    "SA",
    "SE",
    "SG",
    "US",
    "VE",
] as const;

export type InstallmentRegion = (typeof INSTALLMENT_REGIONS)[number];

// Venezuela's apps quote in dollars and are paid in bolívares at BCV.
const INSTALLMENT_CURRENCIES: Readonly<Record<InstallmentRegion, string>> = {
    AE: "AED",
    AT: "EUR",
    AU: "AUD",
    CA: "CAD",
    CO: "COP",
    DE: "EUR",
    ES: "EUR",
    FR: "EUR",
    GB: "GBP",
    IT: "EUR",
    JP: "JPY",
    MX: "MXN",
    NL: "EUR",
    NZ: "NZD",
    SA: "SAR",
    SE: "SEK",
    SG: "SGD",
    US: "USD",
    VE: "USD",
};

interface InstitutionEntry {
    /** What its app's notifications mean by a symbol other currencies share: Banesco's "Bs" is the bolívar. */
    readonly currency?: string;
    readonly domain: string;
    readonly id: string;
    readonly installmentsIn?: readonly InstallmentRegion[];
    readonly label: string;
    /** Already in `merchantKey` form; a pattern matches its token sequence anywhere in the name. */
    readonly patterns: readonly string[];
}

const INSTITUTIONS: readonly InstitutionEntry[] = [
    {
        domain: "chase.com",
        currency: "USD",
        id: "chase",
        label: "Chase",
        patterns: ["chase", "chase bank", "jpmorgan chase", "jp morgan chase"],
    },
    {
        domain: "bankofamerica.com",
        currency: "USD",
        id: "bank-of-america",
        label: "Bank of America",
        patterns: ["bank of america", "bofa"],
    },
    {
        domain: "wellsfargo.com",
        currency: "USD",
        id: "wells-fargo",
        label: "Wells Fargo",
        patterns: ["wells fargo", "wellsfargo"],
    },
    { domain: "citi.com", currency: "USD", id: "citi", label: "Citi", patterns: ["citi", "citibank"] },
    {
        domain: "capitalone.com",
        currency: "USD",
        id: "capital-one",
        label: "Capital One",
        patterns: ["capital one", "capitalone"],
    },
    {
        domain: "usbank.com",
        currency: "USD",
        id: "us-bank",
        label: "U.S. Bank",
        patterns: ["us bank", "u s bank", "usbank"],
    },
    { domain: "pnc.com", currency: "USD", id: "pnc", label: "PNC", patterns: ["pnc", "pnc bank"] },
    { domain: "truist.com", currency: "USD", id: "truist", label: "Truist", patterns: ["truist"] },
    { domain: "td.com", id: "td-bank", label: "TD Bank", patterns: ["td bank"] },
    {
        domain: "americanexpress.com",
        id: "american-express",
        label: "American Express",
        patterns: ["american express", "amex"],
    },
    {
        domain: "discover.com",
        currency: "USD",
        id: "discover",
        label: "Discover",
        patterns: ["discover", "discover card"],
    },
    {
        domain: "schwab.com",
        currency: "USD",
        id: "charles-schwab",
        label: "Charles Schwab",
        patterns: ["charles schwab", "schwab"],
    },
    { domain: "fidelity.com", currency: "USD", id: "fidelity", label: "Fidelity", patterns: ["fidelity"] },
    { domain: "vanguard.com", currency: "USD", id: "vanguard", label: "Vanguard", patterns: ["vanguard"] },
    { domain: "ally.com", currency: "USD", id: "ally", label: "Ally", patterns: ["ally", "ally bank"] },
    { domain: "sofi.com", currency: "USD", id: "sofi", label: "SoFi", patterns: ["sofi"] },
    { domain: "chime.com", currency: "USD", id: "chime", label: "Chime", patterns: ["chime"] },
    {
        domain: "navyfederal.org",
        currency: "USD",
        id: "navy-federal",
        label: "Navy Federal",
        patterns: ["navy federal", "navy federal credit union"],
    },
    { domain: "affirm.com", id: "affirm", installmentsIn: ["US", "CA"], label: "Affirm", patterns: ["affirm"] },
    {
        domain: "afterpay.com",
        id: "afterpay",
        installmentsIn: ["US", "CA", "AU", "NZ"],
        label: "Afterpay",
        patterns: ["afterpay", "after pay", "cash app afterpay"],
    },
    { domain: "sezzle.com", id: "sezzle", installmentsIn: ["US", "CA"], label: "Sezzle", patterns: ["sezzle"] },
    { domain: "splitit.com", id: "splitit", label: "Splitit", patterns: ["splitit", "split it"] },

    { domain: "paypal.com", id: "paypal", label: "PayPal", patterns: ["paypal"] },
    { currency: "CNY", domain: "alipay.com", id: "alipay", label: "Alipay", patterns: ["alipay"] },
    {
        currency: "CNY",
        domain: "wechat.com",
        id: "wechat-pay",
        label: "WeChat Pay",
        patterns: ["wechat", "wechat pay", "weixin"],
    },
    { domain: "venmo.com", currency: "USD", id: "venmo", label: "Venmo", patterns: ["venmo"] },
    // "cash app", never bare "cash": plain cash is not a company.
    { domain: "cash.app", currency: "USD", id: "cash-app", label: "Cash App", patterns: ["cash app", "cashapp"] },
    { domain: "zellepay.com", currency: "USD", id: "zelle", label: "Zelle", patterns: ["zelle"] },
    { domain: "wise.com", id: "wise", label: "Wise", patterns: ["wise", "transferwise"] },
    { domain: "revolut.com", id: "revolut", label: "Revolut", patterns: ["revolut"] },
    { domain: "payoneer.com", id: "payoneer", label: "Payoneer", patterns: ["payoneer"] },
    { domain: "stripe.com", id: "stripe", label: "Stripe", patterns: ["stripe"] },
    { domain: "coinbase.com", id: "coinbase", label: "Coinbase", patterns: ["coinbase"] },
    { domain: "binance.com", id: "binance", label: "Binance", patterns: ["binance"] },
    { domain: "robinhood.com", currency: "USD", id: "robinhood", label: "Robinhood", patterns: ["robinhood"] },
    { domain: "airtm.com", currency: "USD", id: "airtm", label: "Airtm", patterns: ["airtm"] },
    { domain: "zinli.com", currency: "USD", id: "zinli", label: "Zinli", patterns: ["zinli"] },

    { domain: "n26.com", currency: "EUR", id: "n26", label: "N26", patterns: ["n26"] },
    { domain: "monzo.com", currency: "GBP", id: "monzo", label: "Monzo", patterns: ["monzo"] },
    {
        domain: "starlingbank.com",
        currency: "GBP",
        id: "starling",
        label: "Starling Bank",
        patterns: ["starling", "starling bank"],
    },
    { domain: "hsbc.com", id: "hsbc", label: "HSBC", patterns: ["hsbc"] },
    { domain: "barclays.co.uk", currency: "GBP", id: "barclays", label: "Barclays", patterns: ["barclays"] },
    { domain: "lloydsbank.com", currency: "GBP", id: "lloyds", label: "Lloyds", patterns: ["lloyds", "lloyds bank"] },
    { domain: "natwest.com", currency: "GBP", id: "natwest", label: "NatWest", patterns: ["natwest"] },
    { domain: "db.com", currency: "EUR", id: "deutsche-bank", label: "Deutsche Bank", patterns: ["deutsche bank"] },
    { domain: "ing.com", id: "ing", label: "ING", patterns: ["ing", "ing bank", "ing direct"] },
    { domain: "bbva.com", id: "bbva", label: "BBVA", patterns: ["bbva"] },
    {
        domain: "santander.com",
        id: "santander",
        label: "Santander",
        patterns: ["santander", "banco santander"],
    },
    {
        domain: "caixabank.com",
        currency: "EUR",
        id: "caixabank",
        label: "CaixaBank",
        patterns: ["caixabank", "la caixa"],
    },
    {
        domain: "bancsabadell.com",
        currency: "EUR",
        id: "sabadell",
        label: "Banco Sabadell",
        patterns: ["sabadell", "banco sabadell"],
    },
    { domain: "bankinter.com", currency: "EUR", id: "bankinter", label: "Bankinter", patterns: ["bankinter"] },
    {
        domain: "klarna.com",
        id: "klarna",
        installmentsIn: ["US", "GB", "DE", "AT", "NL", "SE", "ES", "IT", "FR", "AU"],
        label: "Klarna",
        patterns: ["klarna"],
    },
    {
        domain: "clearpay.co.uk",
        currency: "GBP",
        id: "clearpay",
        installmentsIn: ["GB", "ES", "FR", "IT"],
        label: "Clearpay",
        patterns: ["clearpay", "clear pay"],
    },
    {
        domain: "scalapay.com",
        currency: "EUR",
        id: "scalapay",
        installmentsIn: ["IT", "FR", "ES"],
        label: "Scalapay",
        patterns: ["scalapay"],
    },
    // "alma pay", never bare "alma": it is a first name and a Spanish word.
    {
        domain: "almapay.com",
        currency: "EUR",
        id: "alma",
        installmentsIn: ["FR"],
        label: "Alma",
        patterns: ["alma pay", "almapay"],
    },
    {
        domain: "oney.com",
        currency: "EUR",
        id: "oney",
        installmentsIn: ["FR", "ES"],
        label: "Oney",
        patterns: ["oney"],
    },
    { domain: "zilch.com", currency: "GBP", id: "zilch", installmentsIn: ["GB"], label: "Zilch", patterns: ["zilch"] },
    {
        domain: "riverty.com",
        id: "riverty",
        installmentsIn: ["DE", "NL", "AT"],
        label: "Riverty",
        patterns: ["riverty"],
    },

    // "zip pay" and its old name, never bare "zip": it is a common word.
    {
        domain: "zip.co",
        id: "zip",
        installmentsIn: ["AU", "NZ", "US"],
        label: "Zip",
        patterns: ["zip pay", "zip co", "quadpay", "quad pay"],
    },
    // Atome has no global site; `atome.com` is another company.
    { domain: "atome.sg", id: "atome", installmentsIn: ["SG"], label: "Atome", patterns: ["atome"] },
    { domain: "tabby.ai", id: "tabby", installmentsIn: ["AE", "SA"], label: "Tabby", patterns: ["tabby"] },
    { domain: "tamara.co", id: "tamara", installmentsIn: ["SA", "AE"], label: "Tamara", patterns: ["tamara"] },
    { domain: "paidy.com", currency: "JPY", id: "paidy", installmentsIn: ["JP"], label: "Paidy", patterns: ["paidy"] },

    { domain: "nubank.com.br", currency: "BRL", id: "nubank", label: "Nubank", patterns: ["nubank", "nu bank"] },
    {
        domain: "mercadopago.com",
        id: "mercado-pago",
        label: "Mercado Pago",
        patterns: ["mercado pago", "mercadopago", "mercado credito"],
    },
    { domain: "itau.com.br", currency: "BRL", id: "itau", label: "Itaú", patterns: ["itau", "itau unibanco"] },
    { domain: "bradesco.com.br", currency: "BRL", id: "bradesco", label: "Bradesco", patterns: ["bradesco"] },
    {
        domain: "bb.com.br",
        currency: "BRL",
        id: "banco-do-brasil",
        label: "Banco do Brasil",
        patterns: ["banco do brasil"],
    },
    {
        domain: "caixa.gov.br",
        currency: "BRL",
        id: "caixa-economica",
        label: "Caixa Econômica",
        patterns: ["caixa economica", "caixa economica federal"],
    },
    {
        domain: "bancointer.com.br",
        currency: "BRL",
        id: "banco-inter",
        label: "Banco Inter",
        patterns: ["banco inter"],
    },
    { domain: "c6bank.com.br", currency: "BRL", id: "c6-bank", label: "C6 Bank", patterns: ["c6 bank", "c6bank"] },
    { domain: "picpay.com", currency: "BRL", id: "picpay", label: "PicPay", patterns: ["picpay"] },
    { domain: "banorte.com", currency: "MXN", id: "banorte", label: "Banorte", patterns: ["banorte"] },
    { domain: "banamex.com", currency: "MXN", id: "banamex", label: "Banamex", patterns: ["banamex", "citibanamex"] },
    { domain: "bancolombia.com", currency: "COP", id: "bancolombia", label: "Bancolombia", patterns: ["bancolombia"] },
    { domain: "davivienda.com", currency: "COP", id: "davivienda", label: "Davivienda", patterns: ["davivienda"] },
    { domain: "nequi.com.co", currency: "COP", id: "nequi", label: "Nequi", patterns: ["nequi"] },
    { domain: "daviplata.com", currency: "COP", id: "daviplata", label: "Daviplata", patterns: ["daviplata"] },
    {
        domain: "bancogalicia.com.ar",
        currency: "ARS",
        id: "banco-galicia",
        label: "Banco Galicia",
        patterns: ["banco galicia", "galicia"],
    },
    { domain: "uala.com.ar", currency: "ARS", id: "uala", label: "Ualá", patterns: ["uala"] },
    {
        domain: "bancochile.cl",
        currency: "CLP",
        id: "banco-de-chile",
        label: "Banco de Chile",
        patterns: ["banco de chile"],
    },
    { domain: "viabcp.com", currency: "PEN", id: "bcp", label: "BCP", patterns: ["bcp", "banco de credito del peru"] },
    { domain: "interbank.pe", currency: "PEN", id: "interbank", label: "Interbank", patterns: ["interbank"] },
    { domain: "scotiabank.com", id: "scotiabank", label: "Scotiabank", patterns: ["scotiabank"] },
    { domain: "rbc.com", currency: "CAD", id: "rbc", label: "RBC", patterns: ["rbc", "royal bank of canada"] },
    {
        domain: "kueskipay.com",
        currency: "MXN",
        id: "kueski-pay",
        installmentsIn: ["MX"],
        label: "Kueski Pay",
        patterns: ["kueski", "kueski pay", "kueskipay"],
    },
    {
        domain: "aplazo.mx",
        currency: "MXN",
        id: "aplazo",
        installmentsIn: ["MX"],
        label: "Aplazo",
        patterns: ["aplazo"],
    },
    {
        domain: "coppel.com",
        currency: "MXN",
        id: "coppel",
        installmentsIn: ["MX"],
        label: "Coppel",
        patterns: ["coppel", "credito coppel"],
    },
    { domain: "addi.com", currency: "COP", id: "addi", installmentsIn: ["CO"], label: "Addi", patterns: ["addi"] },
    {
        domain: "sistecredito.com",
        currency: "COP",
        id: "sistecredito",
        installmentsIn: ["CO"],
        label: "Sistecrédito",
        patterns: ["sistecredito", "siste credito"],
    },

    { domain: "banesco.com", currency: "VES", id: "banesco", label: "Banesco", patterns: ["banesco"] },
    {
        domain: "mercantilbanco.com",
        currency: "VES",
        id: "mercantil",
        label: "Banco Mercantil",
        patterns: ["mercantil", "banco mercantil"],
    },
    {
        domain: "bnc.com.ve",
        currency: "VES",
        id: "bnc",
        label: "BNC",
        patterns: ["bnc", "banco nacional de credito"],
    },
    {
        domain: "provincial.com",
        currency: "VES",
        id: "provincial",
        label: "BBVA Provincial",
        patterns: ["bbva provincial", "provincial"],
    },
    {
        domain: "bdv.com.ve",
        currency: "VES",
        id: "banco-de-venezuela",
        label: "Banco de Venezuela",
        patterns: ["banco de venezuela", "bdv"],
    },
    { domain: "bancamiga.com", currency: "VES", id: "bancamiga", label: "Bancamiga", patterns: ["bancamiga"] },
    { domain: "banplus.com", currency: "VES", id: "banplus", label: "Banplus", patterns: ["banplus"] },
    { domain: "100banco.com", currency: "VES", id: "100-banco", label: "100% Banco", patterns: ["100 banco"] },
    {
        domain: "cashea.app",
        currency: "USD",
        id: "cashea",
        installmentsIn: ["VE"],
        label: "Cashea",
        patterns: ["cashea"],
    },
    { domain: "krece.app", currency: "USD", id: "krece", installmentsIn: ["VE"], label: "Krece", patterns: ["krece"] },
    { domain: "lysto.app", currency: "USD", id: "lysto", installmentsIn: ["VE"], label: "Lysto", patterns: ["lysto"] },
    {
        domain: "chollo.app",
        currency: "USD",
        id: "chollo",
        installmentsIn: ["VE"],
        label: "Chollo",
        patterns: ["chollo"],
    },
] as const;

export type InstallmentApp = Pick<InstitutionEntry, "domain" | "id" | "label"> & { readonly currency: string };

export function installmentRegion(regionCode: string | null | undefined): InstallmentRegion | null {
    const code = regionCode?.toUpperCase();
    return INSTALLMENT_REGIONS.find((region) => region === code) ?? null;
}

export function installmentAppsIn(region: InstallmentRegion | null): InstallmentApp[] {
    return region === null
        ? []
        : INSTITUTIONS.filter((entry) => entry.installmentsIn?.includes(region)).map(({ domain, id, label }) => ({
              currency: INSTALLMENT_CURRENCIES[region],
              domain,
              id,
              label,
          }));
}

export type FoundInstallmentApp = InstallmentApp & { readonly regions: readonly InstallmentRegion[] };

export function searchInstallmentApps(query: string, region: InstallmentRegion | null): FoundInstallmentApp[] {
    const key = merchantKey(query);
    if (key.length === 0) {
        return [];
    }
    const found = INSTITUTIONS.flatMap(({ domain, id, installmentsIn, label }) => {
        const [first] = installmentsIn ?? [];
        if (first === undefined || !merchantKey(label).includes(key)) {
            return [];
        }
        const home = region !== null && installmentsIn?.includes(region) ? region : first;
        const regions = [home, ...(installmentsIn ?? []).filter((other) => other !== home)];
        return [{ currency: INSTALLMENT_CURRENCIES[home], domain, id, label, regions }];
    });
    return found.sort((a, b) => Number(b.regions[0] === region) - Number(a.regions[0] === region));
}

const INSTITUTION_INDEX: ReadonlyMap<string, InstitutionEntry> = buildPatternIndex(INSTITUTIONS);

const INSTALLMENT_APP_LABELS: ReadonlyMap<string, string> = new Map(
    INSTITUTIONS.filter((entry) => entry.installmentsIn).map((entry) => [merchantKey(entry.label), entry.domain])
);

const INSTALLMENT_APP_DOMAINS: ReadonlySet<string> = new Set(INSTALLMENT_APP_LABELS.values());

// Label first: "Zip" and "Alma" brand nothing on their own, so the pattern lookup alone misses them.
export function installmentAppDomain(name: string): string | null {
    const key = merchantKey(name);
    const domain = INSTALLMENT_APP_LABELS.get(key) ?? resolveInstitutionDomain(key);
    return domain !== null && INSTALLMENT_APP_DOMAINS.has(domain) ? domain : null;
}

export function installmentAppId(name: string): string | null {
    const domain = installmentAppDomain(name);
    return domain === null ? null : (INSTITUTIONS.find((entry) => entry.domain === domain)?.id ?? null);
}

export function isInstallmentAppAccount(account: { readonly kind: string; readonly name: string }): boolean {
    return toAccountKind(account.kind) === "liability" && installmentAppDomain(account.name) !== null;
}

// No fuzzy tier: a near-miss would brand an account with another bank's logo, which is worse than none.
const SEARCHABLE = INSTITUTIONS.map(({ domain, label }) => ({ domain, key: merchantKey(label), label }));

/** Names with a logo that match what was typed, those starting with it first. */
export function searchInstitutions(query: string) {
    const key = merchantKey(query);
    if (key.length === 0) {
        return [];
    }
    return SEARCHABLE.filter((entry) => entry.key.includes(key)).sort(
        (a, b) => Number(b.key.startsWith(key)) - Number(a.key.startsWith(key)) || a.label.localeCompare(b.label)
    );
}

export function institutionCurrency(name: string): string | null {
    const domain = resolveInstitutionDomain(merchantKey(name));
    return INSTITUTIONS.find((entry) => entry.domain === domain)?.currency ?? null;
}

export function resolveInstitutionDomain(key: string): string | null {
    if (key.length === 0) {
        return null;
    }
    const exact = INSTITUTION_INDEX.get(key);
    if (exact != null) {
        return exact.domain;
    }
    const tokens = key.split(" ");
    for (const [pattern, entry] of INSTITUTION_INDEX) {
        if (containsTokenSequence(tokens, pattern.split(" "))) {
            return entry.domain;
        }
    }
    return null;
}
