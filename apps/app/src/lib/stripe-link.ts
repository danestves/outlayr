import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";

import { ENV } from "@/env";

const PUBLISHABLE_KEY = ENV.VITE_STRIPE_PUBLISHABLE_KEY;

export const STRIPE_READY = Boolean(PUBLISHABLE_KEY);

export type BankSheetResult = { kind: "canceled" } | { kind: "collected"; sessionId: string } | { kind: "failed" };

let started: Promise<Stripe | null> | null = null;

async function startStripe(key: string): Promise<Stripe | null> {
    try {
        return await loadStripe(key);
    } catch (error) {
        started = null;
        throw error;
    }
}

function stripeFor(key: string): Promise<Stripe | null> {
    started ??= startStripe(key);
    return started;
}

export async function collectBankAccounts(clientSecret: string): Promise<BankSheetResult> {
    if (!PUBLISHABLE_KEY) {
        return { kind: "failed" };
    }
    try {
        const stripe = await stripeFor(PUBLISHABLE_KEY);
        if (!stripe) {
            return { kind: "failed" };
        }
        const { error, financialConnectionsSession } = await stripe.collectFinancialConnectionsAccounts({
            clientSecret,
        });
        if (error) {
            return { kind: "failed" };
        }
        if (financialConnectionsSession.accounts.length > 0) {
            return { kind: "collected", sessionId: financialConnectionsSession.id };
        }
        // Closing the Stripe modal resolves with a session that collected no accounts.
        return { kind: "canceled" };
    } catch (error) {
        console.warn("[outlayr] Stripe bank sheet failed", error);
        return { kind: "failed" };
    }
}
