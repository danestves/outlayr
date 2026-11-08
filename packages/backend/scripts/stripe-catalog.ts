import { allProPrices, proPriceKey, PRO_PLANS, stripeMinorUnits } from "@outlayr/money/pro-prices";
import type { ProPlan, ProPrice } from "@outlayr/money/pro-prices";

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_VERSION = "2026-04-22.dahlia";
const REVENUECAT_API = "https://api.revenuecat.com/v2";
const SAAS_PERSONAL_TAX_CODE = "txcd_10103000";
const ATTACH_BATCH = 50;
const RETRY_MS = 5000;

const required = (name: string) => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`${name} is not set`);
    }
    return value;
};

const stripeKey = required("STRIPE_SECRET_KEY");
if (stripeKey.startsWith("sk_live") && !process.argv.includes("--live")) {
    throw new Error("Refusing a live Stripe key without --live");
}
const revenueCatKey = required("REVENUECAT_V2_SECRET_KEY");
const project = required("REVENUECAT_PROJECT_ID");
const app = required("REVENUECAT_STRIPE_APP_ID");

async function send(url: string, init: RequestInit): Promise<Response> {
    const response = await fetch(url, init);
    if (response.status !== 429) {
        return response;
    }
    await new Promise((resolve) => {
        setTimeout(resolve, RETRY_MS);
    });
    return send(url, init);
}

async function stripe<T>(path: string, body?: Record<string, string>): Promise<T> {
    const response = await send(`${STRIPE_API}${path}`, {
        body: body ? new URLSearchParams(body) : null,
        headers: { Authorization: `Bearer ${stripeKey}`, "Stripe-Version": STRIPE_VERSION },
        method: body ? "POST" : "GET",
    });
    if (!response.ok) {
        throw new Error(`Stripe ${path}: ${response.status} ${await response.text()}`);
    }
    return (await response.json()) as T;
}

async function revenueCat<T>(path: string, body?: unknown): Promise<T> {
    const response = await send(`${REVENUECAT_API}/projects/${project}${path}`, {
        body: body ? JSON.stringify(body) : null,
        headers: { Authorization: `Bearer ${revenueCatKey}`, "Content-Type": "application/json" },
        method: body ? "POST" : "GET",
    });
    if (!response.ok) {
        throw new Error(`RevenueCat ${path}: ${response.status} ${await response.text()}`);
    }
    return (await response.json()) as T;
}

interface StripePrice {
    id: string;
    lookup_key: string | null;
}

async function activePrices() {
    const prices = new Map<string, string>();
    let after: string | undefined;
    for (;;) {
        const cursor = after ? `&starting_after=${after}` : "";
        const page = await stripe<{ data: StripePrice[]; has_more: boolean }>(`/prices?active=true&limit=100${cursor}`);
        for (const price of page.data) {
            if (price.lookup_key) {
                prices.set(price.lookup_key, price.id);
            }
        }
        after = page.data.at(-1)?.id;
        if (!page.has_more) {
            return prices;
        }
    }
}

async function pagedRevenueCat<T>(path: string) {
    const items: T[] = [];
    let next: string | null = `${path}?limit=100`;
    while (next) {
        const page: { items: T[]; next_page: string | null } = await revenueCat(next);
        items.push(...page.items);
        next = page.next_page?.replace(/^.*\/projects\/[^/]+/u, "") ?? null;
    }
    return items;
}

const productId = (plan: ProPlan) => `outlayr_pro_${plan}`;

async function ensureProducts() {
    for (const plan of PRO_PLANS) {
        const found = await send(`${STRIPE_API}/products/${productId(plan)}`, {
            headers: { Authorization: `Bearer ${stripeKey}` },
        });
        if (found.status === 404) {
            await stripe("/products", {
                id: productId(plan),
                name: `Outlayr Pro (${plan})`,
                tax_code: SAAS_PERSONAL_TAX_CODE,
            });
        }
    }
}

const createPrice = (price: ProPrice) => {
    const body: Record<string, string> = {
        currency: price.currency.toLowerCase(),
        lookup_key: proPriceKey(price),
        product: productId(price.plan),
        tax_behavior: "inclusive",
        unit_amount: String(stripeMinorUnits(price)),
    };
    if (price.plan !== "lifetime") {
        body["recurring[interval]"] = price.plan === "monthly" ? "month" : "year";
    }
    return stripe<StripePrice>("/prices", body);
};

await ensureProducts();

const existing = await activePrices();
const failures: string[] = [];
const wanted = new Map<ProPrice, string>();
for (const price of allProPrices()) {
    const key = proPriceKey(price);
    try {
        wanted.set(price, existing.get(key) ?? (await createPrice(price)).id);
    } catch (error) {
        failures.push(`${key}: ${String(error)}`);
    }
}
console.log(`stripe: ${wanted.size} prices ready, ${existing.size} existed`);

interface RevenueCatProduct {
    app_id: string;
    id: string;
    store_identifier: string;
}

const products = await pagedRevenueCat<RevenueCatProduct>("/products");
const byStoreId = new Map(
    products.filter((product) => product.app_id === app).map((product) => [product.store_identifier, product.id])
);
const productIds: string[] = [];
for (const [price, priceId] of wanted) {
    let id = byStoreId.get(priceId);
    if (!id) {
        const created = await revenueCat<{ id: string }>("/products", {
            app_id: app,
            display_name: `Pro ${price.plan} ${price.currency} ${price.amount}`,
            store_identifier: priceId,
            type: price.plan === "lifetime" ? "one_time" : "subscription",
        });
        ({ id } = created);
    }
    productIds.push(id);
}
console.log(`revenuecat: ${productIds.length} products ready`);

const { items: entitlements } = await revenueCat<{ items: { id: string; lookup_key: string }[] }>("/entitlements");
const entitlement = entitlements.find((item) => item.lookup_key === "pro");
if (!entitlement) {
    throw new Error("No pro entitlement");
}
const attached = new Set(
    (await pagedRevenueCat<{ id: string }>(`/entitlements/${entitlement.id}/products`)).map((product) => product.id)
);
const missing = productIds.filter((id) => !attached.has(id));
for (let start = 0; start < missing.length; start += ATTACH_BATCH) {
    await revenueCat(`/entitlements/${entitlement.id}/actions/attach_products`, {
        product_ids: missing.slice(start, start + ATTACH_BATCH),
    });
}
console.log(`entitlement pro: attached ${missing.length}, ${attached.size} already there`);

if (failures.length > 0) {
    console.error(`${failures.length} prices failed:\n${failures.join("\n")}`);
    process.exitCode = 1;
}
