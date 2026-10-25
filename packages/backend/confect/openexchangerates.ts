import { v } from "convex/values";
import { z } from "zod";

import { internal } from "../convex/_generated/api";
import { internalAction } from "../convex/_generated/server";
import { utcDateString } from "./lib/currencies";

const LATEST_URL = "https://openexchangerates.org/api/latest.json";
const RATES_TIMEOUT_MS = 20_000;
const MS_PER_SECOND = 1000;
const BASE = "USD";
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

const latestResponse = z.object({
    base: z.literal(BASE),
    rates: z.record(z.string(), z.number().finite().positive().nullable().catch(null)),
    timestamp: z.number().int().positive(),
});

export const fetchRates = internalAction({
    args: {},
    handler: async (ctx) => {
        const appId = process.env.OXR_APP_ID;
        if (!appId) {
            throw new Error("OXR_APP_ID is not set; cannot fetch Open Exchange Rates");
        }

        let payload: unknown;
        try {
            const response = await fetch(`${LATEST_URL}?app_id=${encodeURIComponent(appId)}`, {
                signal: AbortSignal.timeout(RATES_TIMEOUT_MS),
            });
            if (!response.ok) {
                console.error(`Open Exchange Rates fetch failed with HTTP ${response.status}`);
                return null;
            }
            payload = await response.json();
        } catch (error) {
            console.error("Open Exchange Rates fetch request failed", error);
            return null;
        }

        const parsed = latestResponse.safeParse(payload);
        if (!parsed.success) {
            console.error("Open Exchange Rates response did not match the USD-based latest contract");
            return null;
        }

        const rates = Object.entries(parsed.data.rates).flatMap(([quote, rate]) =>
            rate !== null && quote !== BASE && CURRENCY_CODE_PATTERN.test(quote)
                ? [{ quote, rate, rateType: "official" as const }]
                : []
        );
        if (rates.length === 0) {
            console.error("Open Exchange Rates response contained no valid rates");
            return null;
        }

        await ctx.runMutation(internal.exchangeRates.upsertRates, {
            date: utcDateString(parsed.data.timestamp * MS_PER_SECOND),
            fetchedAt: Date.now(),
            rates,
            source: "openexchangerates",
        });
        return null;
    },
    returns: v.null(),
});
