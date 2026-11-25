import {
    collectFinancialConnectionsAccounts,
    FinancialConnections,
    handleURLCallback,
    initStripe,
} from "@stripe/stripe-react-native";
import * as Effect from "effect/Effect";

import { ENV } from "@/env";

const PUBLISHABLE_KEY = ENV.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const URL_SCHEME = "outlayr";
const SCHEME_PREFIX = /^[a-zA-Z][\w+.-]*:\/\//;

export const STRIPE_READY = Boolean(PUBLISHABLE_KEY);

export type BankSheetResult = { kind: "canceled" } | { kind: "collected"; sessionId: string } | { kind: "failed" };

let started: Promise<void> | null = null;

function ensureStripe(publishableKey: string): Promise<void> {
    started ??= initStripe({ publishableKey, urlScheme: URL_SCHEME }).catch((error) => {
        started = null;
        throw error;
    });
    return started;
}

async function collect(clientSecret: string): Promise<BankSheetResult> {
    if (!PUBLISHABLE_KEY) {
        return { kind: "failed" };
    }
    await ensureStripe(PUBLISHABLE_KEY);
    const { error, session } = await collectFinancialConnectionsAccounts(clientSecret);
    if (session) {
        return { kind: "collected", sessionId: session.id };
    }
    return error.code === FinancialConnections.FinancialConnectionsSheetError.Canceled
        ? { kind: "canceled" }
        : { kind: "failed" };
}

export const collectBankAccounts = Effect.fn("StripeLink.collectBankAccounts")(function* collectBankAccounts(
    clientSecret: string
) {
    return yield* Effect.tryPromise(() => collect(clientSecret)).pipe(
        Effect.tapError((error) => Effect.logWarning("[outlayr] Stripe bank sheet threw", error)),
        Effect.orElseSucceed((): BankSheetResult => ({ kind: "failed" }))
    );
});

/** A bank app hands the sign-in back on `outlayr://safepay/…`; the router must never see it. */
export function stripeReturnUrl(path: string): string | null {
    const bare = path.replace(SCHEME_PREFIX, "").replace(/^\/+/, "");
    const [host] = bare.split(/[/?]/);
    return host?.toLowerCase() === "safepay" ? `${URL_SCHEME}://${bare}` : null;
}

export function handOverStripeReturn(url: string): void {
    handleURLCallback(url).catch((error) => console.warn("[outlayr] Stripe return failed", error));
}
