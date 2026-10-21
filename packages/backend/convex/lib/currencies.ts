import type { MarketRateType as MoneyMarketRateType } from "@outlayr/money/rates";
import { v } from "convex/values";
import type { Infer } from "convex/values";

export { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
export { utcDateString } from "@outlayr/money/dates";

export type MarketRateType = MoneyMarketRateType;

// Spelled out, not spread from the shared array, so Convex infers the literal union for mutation args.
export const marketRateType = v.union(v.literal("official"), v.literal("eur_reference"), v.literal("binance"));

export const entryRateType = v.union(v.literal("official"), v.literal("eur_reference"), v.literal("custom"));

export const rateSource = v.union(v.literal("frankfurter"), v.literal("cotizave"), v.literal("openexchangerates"));

export type RateSource = Infer<typeof rateSource>;
