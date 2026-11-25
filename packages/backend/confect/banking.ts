import { BankingProviderName } from "@outlayr/banking/provider";
import type { BankingClient, BankTransaction } from "@outlayr/banking/provider";
import { bankingProviders } from "@outlayr/banking/registry";
import { decimalsFor } from "@outlayr/money/currency";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { internal } from "../convex/_generated/api";
import type { ActionCtx } from "../convex/_generated/server";
import type { InboundWrite } from "./tables/inboundWrites";

export interface LinkedAccount {
    readonly institution: string;
    readonly last4: string | null;
    readonly provider: BankingProviderName;
}

export const toInboundWrite = (
    { institution, last4, provider }: LinkedAccount,
    tx: BankTransaction
): typeof InboundWrite.Type | null => {
    // A void must reach the phone even at zero so it can remove the entry.
    if (tx.amountMinor === 0 && tx.status !== "void") {
        return null;
    }
    return {
        amount: Math.abs(tx.amountMinor) / 10 ** decimalsFor(tx.currency),
        card: last4 === null ? institution : `${institution} ••${last4}`,
        currency: tx.currency,
        date: tx.transactedAt,
        dedupeKey: `bank:${provider}:${tx.id}`,
        income: tx.amountMinor > 0,
        note: tx.description,
        status: tx.status,
    };
};

export const configuredClients = Effect.fn("Banking.configuredClients")(function* configuredClients() {
    const clients: { readonly client: BankingClient; readonly name: BankingProviderName }[] = [];
    for (const name of BankingProviderName.literals) {
        const client = yield* bankingProviders[name].connect.pipe(Effect.orDie);
        if (Option.isSome(client)) {
            clients.push({ client: client.value, name });
        }
    }
    return clients;
});

export interface BankHolder {
    readonly holder: string;
    readonly provider: BankingProviderName;
}

// Stored ids cover customers the provider's search lags behind; a provider we cannot reach must fail the deletion.
export const forgetBankUser = Effect.fn("Banking.forgetBankUser")(function* forgetBankUser(
    userId: string,
    holders: readonly BankHolder[]
) {
    const clients = yield* configuredClients();
    for (const name of BankingProviderName.literals) {
        const client = clients.find((configured) => configured.name === name)?.client;
        const stored = holders.filter((row) => row.provider === name).map(({ holder }) => holder);
        if (client === undefined) {
            if (stored.length > 0) {
                return yield* Effect.die(
                    new Error(`[banking] cannot forget ${name} holders: provider is not configured`)
                );
            }
            continue;
        }
        yield* client.forgetUser(userId, stored);
    }
});

type ReceiveCtx = Pick<ActionCtx, "runMutation">;

const reply = (status: number, body: { readonly error: string } | { readonly received: boolean }) =>
    Response.json(body, { status });

export const receiveBankEvent = Effect.fn("Banking.receiveBankEvent")(function* receiveBankEvent(
    ctx: ReceiveCtx,
    request: Request,
    provider: BankingProviderName
) {
    const client = yield* bankingProviders[provider].connect.pipe(Effect.orDie);
    if (Option.isNone(client)) {
        return reply(404, { error: "unavailable" });
    }
    const body = yield* Effect.promise(() => request.text());
    const outcome = yield* client.value.readWebhook(body, request.headers).pipe(
        Effect.map((event) =>
            Option.match(event, {
                onNone: () => ({ kind: "ignored" as const }),
                onSome: (signal) => ({ kind: "event" as const, signal }),
            })
        ),
        Effect.catchTags({
            BankingError: (error) =>
                error.reason === "unverified"
                    ? Effect.succeed({ kind: "unverified" as const })
                    : Console.warn("[banking] webhook failed", error).pipe(Effect.as({ kind: "failed" as const })),
        })
    );
    if (outcome.kind === "unverified") {
        return reply(400, { error: "unverified" });
    }
    if (outcome.kind === "failed") {
        return reply(500, { error: "provider" });
    }
    if (outcome.kind === "event") {
        yield* Effect.promise(() =>
            ctx.runMutation(internal.banking.onEvent, {
                accountId: outcome.signal.accountId,
                kind: outcome.signal.kind,
                provider,
            })
        );
    }
    return reply(200, { received: outcome.kind === "event" });
});
