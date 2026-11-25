import * as Config from "effect/Config";
import type * as Effect from "effect/Effect";
import type * as HttpClient from "effect/http/HttpClient";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

export const BankingProviderName = Schema.Literals(["stripe"]);
export type BankingProviderName = typeof BankingProviderName.Type;

export const BankAccountKind = Schema.Literals(["cash", "credit", "investment", "other"]);
export type BankAccountKind = typeof BankAccountKind.Type;

// `relink` keeps past data readable but nothing new arrives until the user signs in to the bank again.
export const BankAccountStatus = Schema.Literals(["active", "relink", "disconnected"]);
export type BankAccountStatus = typeof BankAccountStatus.Type;

export const BankAccount = Schema.Struct({
    id: Schema.String,
    institution: Schema.String,
    kind: BankAccountKind,
    last4: Schema.NullOr(Schema.String),
    name: Schema.String,
    status: BankAccountStatus,
});
export type BankAccount = typeof BankAccount.Type;

export const BankTransactionStatus = Schema.Literals(["pending", "posted", "void"]);
export type BankTransactionStatus = typeof BankTransactionStatus.Type;

export const BankTransaction = Schema.Struct({
    accountId: Schema.String,
    // Smallest currency unit, negative when money leaves the account.
    amountMinor: Schema.Int,
    currency: Schema.String.check(Schema.isPattern(/^[A-Z]{3}$/)),
    description: Schema.String,
    id: Schema.String,
    status: BankTransactionStatus,
    transactedAt: Schema.Int,
});
export type BankTransaction = typeof BankTransaction.Type;

// Signals only: events arrive late, twice or out of order, so read the account or pull from the cursor.
export interface BankingEvent {
    readonly accountId: string;
    readonly kind: "account" | "transactions";
}

export class BankingError extends Schema.TaggedError<BankingError>()("BankingError", {
    cause: Schema.optional(Schema.Defect()),
    operation: Schema.String,
    provider: BankingProviderName,
    reason: Schema.Literals(["relink", "disconnected", "rateLimited", "rejected", "unverified", "transport"]),
    status: Schema.optional(Schema.Number),
}) {
    override get message(): string {
        const status = this.status === undefined ? "" : ` ${this.status}`;
        return `${this.provider} ${this.operation} failed: ${this.reason}${status}`;
    }
}

export interface LinkRequest {
    // One of the provider's `countries`; it decides which banks the picker lists.
    readonly country: string;
    readonly holder: string;
}

export interface LinkSession {
    readonly clientSecret: string;
    readonly id: string;
    readonly kind: "sdk";
}

export interface TransactionPage {
    // Hand back on the next pull to get only what was added or changed since this one.
    readonly cursor: Option.Option<string>;
    readonly transactions: readonly BankTransaction[];
}

type Call<A> = Effect.Effect<A, BankingError, HttpClient.HttpClient>;

export interface BankingClient {
    readonly account: (accountId: string) => Call<BankAccount>;
    // Retrying after a timeout must not leave the user with a second holder.
    readonly createHolder: (user: { readonly email: string; readonly id: string }) => Call<string>;
    readonly disconnect: (accountId: string) => Call<void>;
    // Fails with `rejected` when the session was not started for `holder`.
    readonly finishLink: (holder: string, sessionId: string) => Call<readonly BankAccount[]>;
    readonly readWebhook: (body: string, headers: Headers) => Effect.Effect<Option.Option<BankingEvent>, BankingError>;
    // Disconnects every account and deletes every holder made for this user. Needs nothing we stored, so account
    // deletion can run it after our rows are gone. Safe to repeat.
    readonly forgetUser: (userId: string) => Call<void>;
    readonly startLink: (request: LinkRequest) => Call<LinkSession>;
    // An account with no finished refresh yet returns no transactions and keeps the cursor.
    readonly transactions: (accountId: string, cursor: Option.Option<string>) => Call<TransactionPage>;
}

export interface BankingProvider {
    // ISO 3166-1 alpha-2 countries whose banks the provider can link.
    readonly countries: readonly string[];
    readonly connect: Config.Config<Option.Option<BankingClient>>;
}

export const secret = (name: string) =>
    Config.Redacted(name).pipe(Config.option, Config.map(Option.filter((value) => Redacted.value(value) !== "")));
