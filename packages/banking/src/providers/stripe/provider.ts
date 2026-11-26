import * as Clock from "effect/Clock";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import { BankingError, secret } from "../../provider";
import type { BankingClient, BankingEvent, BankingProvider, Institution, LinkRequest } from "../../provider";
import { List, StripeAccount, StripeEvent, StripeSession, StripeTransaction, listAll, stripeCall } from "./api";
import { verifySignature } from "./signature";
import { toBankAccount, toBankTransaction } from "./transform";

const COUNTRIES = ["US", "CA"];
const HOLDER_KEY = "outlayr_user_id";

// Stripe publishes no bank list, so a single row per country opens its own picker instead of one bank.
const CATCH_ALL: readonly Institution[] = [
    { catchAll: true, country: "US", id: "US", logo: null, name: "US banks" },
    { catchAll: true, country: "CA", id: "CA", logo: null, name: "Canadian banks" },
];

const ACCOUNT_EVENTS = new Set([
    "financial_connections.account.deactivated",
    "financial_connections.account.disconnected",
    "financial_connections.account.reactivated",
]);

const RefreshedAccount = Schema.Struct({
    id: Schema.String,
    transaction_refresh: Schema.NullOr(Schema.Struct({ status: Schema.String })),
});

const DECODE_REFRESHED = Schema.decodeUnknownEffect(RefreshedAccount);
const DECODE_EVENT = Schema.decodeUnknownEffect(Schema.fromJsonString(StripeEvent));

const failure = (operation: string, reason: BankingError["reason"], cause?: unknown) =>
    new BankingError({ cause, operation, provider: "stripe", reason });

const encode = (value: string) => encodeURIComponent(value);

const accountPath = (accountId: string) => `/financial_connections/accounts/${encode(accountId)}`;

const eventFor = (type: string, accountId: string, refreshStatus: string | undefined): Option.Option<BankingEvent> => {
    if (ACCOUNT_EVENTS.has(type)) {
        return Option.some({ accountId, kind: "account" });
    }
    const refreshed = type === "financial_connections.account.refreshed_transactions" && refreshStatus === "succeeded";
    return refreshed ? Option.some({ accountId, kind: "transactions" }) : Option.none();
};

const makeClient = (key: Redacted.Redacted, webhookSecret: string): BankingClient => ({
    account: (accountId) =>
        stripeCall(key, StripeAccount, "account", accountPath(accountId)).pipe(Effect.map(toBankAccount)),
    createHolder: ({ email, id }) =>
        stripeCall(key, Schema.Struct({ id: Schema.String }), "createHolder", "/customers", {
            form: [
                ["email", email],
                [`metadata[${HOLDER_KEY}]`, id],
            ],
            idempotencyKey: `outlayr-bank-holder-${id}`,
        }).pipe(Effect.map((customer) => customer.id)),
    disconnect: (accountId) =>
        stripeCall(key, Schema.Unknown, "disconnect", `${accountPath(accountId)}/disconnect`, { form: [] }).pipe(
            Effect.asVoid
        ),
    finishLink: Effect.fn("StripeBanking.finishLink")(function* finishLink(holder: string, sessionId: string) {
        const session = yield* stripeCall(
            key,
            StripeSession,
            "finishLink",
            `/financial_connections/sessions/${encode(sessionId)}`
        );
        if (session.account_holder?.customer !== holder) {
            return yield* failure("finishLink", "rejected");
        }
        const accounts = yield* listAll(key, StripeAccount, "finishLink", "/financial_connections/accounts", [
            ["session", session.id],
        ]);
        const unsubscribed = accounts.filter(
            (account) => account.status === "active" && !account.subscriptions?.includes("transactions")
        );
        yield* Effect.gen(function* subscribe() {
            for (const account of unsubscribed) {
                yield* stripeCall(key, Schema.Unknown, "finishLink", `${accountPath(account.id)}/subscribe`, {
                    form: [["features[]", "transactions"]],
                });
            }
        }).pipe(
            Effect.catchCause((cause) =>
                Effect.gen(function* disconnectAll() {
                    // Only this call's accounts: disconnecting one a replay already subscribed would undo a good link.
                    for (const account of unsubscribed) {
                        yield* stripeCall(key, Schema.Unknown, "finishLink", `${accountPath(account.id)}/disconnect`, {
                            form: [],
                        }).pipe(Effect.catchCause(() => Effect.void));
                    }
                    yield* Effect.failCause(cause);
                })
            )
        );
        return accounts.map(toBankAccount);
    }),
    readWebhook: Effect.fn("StripeBanking.readWebhook")(function* readWebhook(body: string, headers: Headers) {
        const header = headers.get("stripe-signature");
        const nowMs = yield* Clock.currentTimeMillis;
        if (header === null || !(yield* verifySignature(webhookSecret, header, body, nowMs))) {
            return yield* failure("readWebhook", "unverified");
        }
        const event = yield* DECODE_EVENT(body).pipe(
            Effect.mapError((cause) => failure("readWebhook", "unverified", cause))
        );
        if (!event.type.startsWith("financial_connections.account.")) {
            return Option.none<BankingEvent>();
        }
        const account = yield* DECODE_REFRESHED(event.data.object).pipe(
            Effect.mapError((cause) => failure("readWebhook", "transport", cause))
        );
        return eventFor(event.type, account.id, account.transaction_refresh?.status);
    }),
    forgetUser: Effect.fn("StripeBanking.forgetUser")(function* forgetUser(userId: string, stored: readonly string[]) {
        const query = `metadata['${HOLDER_KEY}']:'${userId.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
        const found = yield* stripeCall(
            key,
            List(Schema.Struct({ id: Schema.String })),
            "forgetUser",
            `/customers/search?query=${encode(query)}`
        );
        const holders = [...new Set([...stored, ...found.data.map(({ id }) => id)])];
        for (const id of holders) {
            // A retried deletion can reach a holder Stripe already deleted.
            const accounts = yield* listAll(key, StripeAccount, "forgetUser", "/financial_connections/accounts", [
                ["account_holder[customer]", id],
            ]).pipe(
                Effect.catchIf(
                    (error: BankingError) => error.status === 404,
                    () => Effect.succeed([])
                )
            );
            for (const account of accounts.filter(({ status }) => status !== "disconnected")) {
                yield* stripeCall(key, Schema.Unknown, "forgetUser", `${accountPath(account.id)}/disconnect`, {
                    form: [],
                });
            }
            yield* stripeCall(key, Schema.Unknown, "forgetUser", `/customers/${encode(id)}`, { method: "DELETE" }).pipe(
                Effect.catchIf(
                    (error: BankingError) => error.status === 404,
                    () => Effect.void
                )
            );
        }
    }),
    institutions: () => Effect.succeed(CATCH_ALL),
    startLink: Effect.fn("StripeBanking.startLink")(function* startLink({ holder, institution, repair }: LinkRequest) {
        const { country } = institution;
        if (!COUNTRIES.includes(country)) {
            return yield* failure("startLink", "rejected");
        }
        const account =
            repair === null ? null : yield* stripeCall(key, StripeAccount, "startLink", accountPath(repair));
        const authorization = account?.authorization ?? null;
        // Without an authorization Stripe cannot reopen the old connection, and a plain session would leave it expired.
        if (repair !== null && authorization === null) {
            return yield* failure("startLink", "rejected");
        }
        // The pinned API version honours only the first `countries` entry, so a session lists one country's banks.
        // A relink needs no filter at all, since the authorization already names the institution and its bank.
        const scope =
            authorization === null
                ? ([["filters[countries][]", country]] as const)
                : ([["relink_options[authorization]", authorization]] as const);
        const session = yield* stripeCall(key, StripeSession, "startLink", "/financial_connections/sessions", {
            form: [
                ["account_holder[type]", "customer"],
                ["account_holder[customer]", holder],
                ["permissions[]", "transactions"],
                ["prefetch[]", "transactions"],
                ...scope,
            ],
        });
        if (session.client_secret === null) {
            return yield* failure("startLink", "transport");
        }
        return { clientSecret: session.client_secret, id: session.id, kind: "sdk" as const };
    }),
    transactions: Effect.fn("StripeBanking.transactions")(function* transactions(
        accountId: string,
        cursor: Option.Option<string>
    ) {
        const account = yield* stripeCall(key, StripeAccount, "transactions", accountPath(accountId));
        if (account.status !== "active") {
            return yield* failure("transactions", account.status === "inactive" ? "relink" : "disconnected");
        }
        const refresh = account.transaction_refresh;
        // Listing before any refresh has finished is a Stripe error, not an empty list.
        if (Option.isNone(cursor) && refresh?.status !== "succeeded") {
            return { cursor, transactions: [] };
        }
        const rows = yield* listAll(key, StripeTransaction, "transactions", "/financial_connections/transactions", [
            ["account", accountId],
            ...Option.match(cursor, {
                onNone: () => [],
                onSome: (after) => [["transaction_refresh[after]", after] as const],
            }),
        ]);
        return {
            cursor: refresh?.status === "succeeded" ? Option.some(refresh.id) : cursor,
            transactions: rows.map(toBankTransaction),
        };
    }),
});

export const stripe: BankingProvider = {
    connect: Config.all({
        key: secret("STRIPE_SECRET_KEY"),
        webhookSecret: secret("STRIPE_BANKING_WEBHOOK_SECRET"),
    }).pipe(
        Config.map(({ key, webhookSecret }) =>
            Option.all({ key, webhookSecret }).pipe(
                Option.map((values) => makeClient(values.key, Redacted.value(values.webhookSecret)))
            )
        )
    ),
};
