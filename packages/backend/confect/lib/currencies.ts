import type { MarketRateType as MoneyMarketRateType } from "@outlayr/money/rates";
import { v } from "convex/values";
import * as Schema from "effect/Schema";

export { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
export { utcDateString } from "@outlayr/money/dates";

export type MarketRateType = MoneyMarketRateType;

export const entryRateType = v.union(v.literal("official"), v.literal("eur_reference"), v.literal("custom"));

export const RateSource = Schema.Literals(["frankfurter", "cotizave", "openexchangerates"]);

export type RateSource = typeof RateSource.Type;
