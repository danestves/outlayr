import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { describe, expect, it } from "vite-plus/test";

import type { BankingClient, BankingError } from "../../provider";
import { stripe } from "./provider";

const WEBHOOK_SECRET = "whsec_banking_test";
const ENV = { STRIPE_BANKING_WEBHOOK_SECRET: WEBHOOK_SECRET, STRIPE_SECRET_KEY: "sk_test_banking" };

const client = (env: Record<string, string>): BankingClient =>
    Option.getOrThrow(
        Effect.runSync(
            stripe.connect.pipe(Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env })))
        )
    );

const signedHeader = async (body: string) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(WEBHOOK_SECRET),
        { hash: "SHA-256", name: "HMAC" },
        false,
        ["sign"]
    );
    const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
    const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `t=${timestamp},v1=${hex}`;
};

const failureReason = async (effect: Effect.Effect<unknown, BankingError>) => {
    const exit = await Effect.runPromiseExit(effect);
    if (Exit.isSuccess(exit)) {
        throw new Error("Expected a failure");
    }
    return exit.cause.reasons.find((reason) => reason._tag === "Fail")?.error.reason;
};

const event = (type: string, object: unknown) => JSON.stringify({ data: { object }, type });

const read = async (body: string) =>
    Effect.runPromise(client(ENV).readWebhook(body, new Headers({ "stripe-signature": await signedHeader(body) })));

const refreshed = (status: string) =>
    event("financial_connections.account.refreshed_transactions", { id: "fca_1", transaction_refresh: { status } });

interface Recorded {
    readonly body: string;
    readonly method: string;
    readonly url: string;
}

const stubHttp = (respond: (request: Recorded) => Response) => {
    const requests: Recorded[] = [];
    const http = HttpClient.make((request) =>
        Effect.gen(function* recordRequest() {
            const web = yield* HttpClientRequest.toWeb(request).pipe(Effect.orDie);
            const recorded = { body: yield* Effect.promise(() => web.text()), method: web.method, url: web.url };
            requests.push(recorded);
            return HttpClientResponse.fromWeb(request, respond(recorded));
        })
    );
    return { layer: Layer.succeed(HttpClient.HttpClient, http), requests };
};

const stripeAccount = (id: string, subscriptions: string[] | null = null) => ({
    category: "cash" as const,
    display_name: null,
    id,
    institution_name: "Bank",
    last4: "4242",
    status: "active" as const,
    subscriptions,
    transaction_refresh: null,
});

describe("readWebhook", () => {
    it("reports the account whose transactions refreshed", async () => {
        await expect(read(refreshed("succeeded"))).resolves.toStrictEqual(
            Option.some({ accountId: "fca_1", kind: "transactions" })
        );
    });

    it("skips a refresh that failed, so the cursor is not pulled for nothing", async () => {
        await expect(read(refreshed("failed"))).resolves.toStrictEqual(Option.none());
    });

    it("reports a deactivated account as an account change, not a status to apply", async () => {
        const body = event("financial_connections.account.deactivated", { id: "fca_1", transaction_refresh: null });
        await expect(read(body)).resolves.toStrictEqual(Option.some({ accountId: "fca_1", kind: "account" }));
    });

    it("rejects an unsigned body", async () => {
        const body = refreshed("succeeded");
        await expect(failureReason(client(ENV).readWebhook(body, new Headers()))).resolves.toBe("unverified");
    });

    it("ignores an event type the provider does not map", async () => {
        await expect(read(event("customer.created", { id: "cus_1" }))).resolves.toStrictEqual(Option.none());
    });
});

describe("finishLink", () => {
    it("disconnects every account in the session when subscribing one fails", async () => {
        const http = stubHttp(({ method, url }) => {
            if (url.includes("/financial_connections/sessions/")) {
                return Response.json({
                    account_holder: { customer: "cus_1" },
                    client_secret: "secret",
                    id: "fcs_1",
                });
            }
            if (url.includes("/financial_connections/accounts?")) {
                return Response.json({ data: [stripeAccount("fca_1"), stripeAccount("fca_2")], has_more: false });
            }
            if (method === "POST" && url.endsWith("/subscribe")) {
                return Response.json({ error: "nope" }, { status: 500 });
            }
            return Response.json({});
        });

        await expect(
            failureReason(client(ENV).finishLink("cus_1", "fcs_1", null).pipe(Effect.provide(http.layer)))
        ).resolves.toBe("transport");
        expect(http.requests.filter(({ url }) => url.endsWith("/disconnect"))).toHaveLength(2);
    });

    it("leaves an account an earlier call subscribed connected when a later subscribe fails", async () => {
        const http = stubHttp(({ method, url }) => {
            if (url.includes("/financial_connections/sessions/")) {
                return Response.json({
                    account_holder: { customer: "cus_1" },
                    client_secret: "secret",
                    id: "fcs_1",
                });
            }
            if (url.includes("/financial_connections/accounts?")) {
                return Response.json({
                    data: [stripeAccount("fca_1", ["transactions"]), stripeAccount("fca_2")],
                    has_more: false,
                });
            }
            if (method === "POST" && url.endsWith("/subscribe")) {
                return Response.json({ error: "nope" }, { status: 500 });
            }
            return Response.json({});
        });

        await expect(
            failureReason(client(ENV).finishLink("cus_1", "fcs_1", null).pipe(Effect.provide(http.layer)))
        ).resolves.toBe("transport");
        expect(
            http.requests
                .filter(({ url }) => url.endsWith("/subscribe") || url.endsWith("/disconnect"))
                .map(({ url }) => url)
        ).toStrictEqual([
            "https://api.stripe.com/v1/financial_connections/accounts/fca_2/subscribe",
            "https://api.stripe.com/v1/financial_connections/accounts/fca_2/disconnect",
        ]);
    });
});

describe("startLink", () => {
    it("opens the session filtered to the institution's country", async () => {
        const http = stubHttp(() =>
            Response.json({ account_holder: { customer: "cus_1" }, client_secret: "secret", id: "fcs_1" })
        );

        const session = await Effect.runPromise(
            client(ENV)
                .startLink({
                    holder: "cus_1",
                    institution: { catchAll: true, country: "CA", id: "CA", logo: null, name: "Canadian banks" },
                    repair: null,
                })
                .pipe(Effect.provide(http.layer))
        );

        expect(session).toStrictEqual({ clientSecret: "secret", id: "fcs_1", kind: "sdk" });
        const [request] = http.requests;
        expect(
            request === undefined ? [] : new URLSearchParams(request.body).getAll("filters[countries][]")
        ).toStrictEqual(["CA"]);
    });

    it("relinks the expired account with its authorization instead of a country filter", async () => {
        const http = stubHttp(({ url }) => {
            if (url.endsWith("/financial_connections/accounts/fca_1")) {
                return Response.json({ ...stripeAccount("fca_1"), authorization: "fcauth_1" });
            }
            return Response.json({ account_holder: { customer: "cus_1" }, client_secret: "secret", id: "fcs_1" });
        });

        const session = await Effect.runPromise(
            client(ENV)
                .startLink({
                    holder: "cus_1",
                    institution: { catchAll: true, country: "CA", id: "CA", logo: null, name: "Canadian banks" },
                    repair: "fca_1",
                })
                .pipe(Effect.provide(http.layer))
        );

        expect(session).toStrictEqual({ clientSecret: "secret", id: "fcs_1", kind: "sdk" });
        const form = new URLSearchParams(http.requests.find(({ method }) => method === "POST")?.body);
        expect(form.get("relink_options[authorization]")).toBe("fcauth_1");
        expect(form.getAll("filters[countries][]")).toStrictEqual([]);
    });

    it("refuses to relink an account with no authorization, before opening any session", async () => {
        const http = stubHttp(() => Response.json(stripeAccount("fca_1")));

        await expect(
            failureReason(
                client(ENV)
                    .startLink({
                        holder: "cus_1",
                        institution: { catchAll: true, country: "CA", id: "CA", logo: null, name: "Canadian banks" },
                        repair: "fca_1",
                    })
                    .pipe(Effect.provide(http.layer))
            )
        ).resolves.toBe("rejected");
        expect(http.requests).toHaveLength(1);
    });

    it("rejects an institution in a country Stripe cannot link", async () => {
        const http = stubHttp(() => Response.json({}));
        await expect(
            failureReason(
                client(ENV)
                    .startLink({
                        holder: "cus_1",
                        institution: { catchAll: true, country: "GB", id: "GB", logo: null, name: "UK banks" },
                        repair: null,
                    })
                    .pipe(Effect.provide(http.layer))
            )
        ).resolves.toBe("rejected");
    });
});

describe("forgetUser", () => {
    it("deletes holders stored in our rows even when the search does not find them", async () => {
        const http = stubHttp(({ url }) => {
            if (url.includes("/customers/search")) {
                return Response.json({ data: [{ id: "cus_old" }], has_more: false });
            }
            if (url.includes("/financial_connections/accounts?")) {
                const customer = new URL(url).searchParams.get("account_holder[customer]");
                return Response.json({ data: [stripeAccount(`fca_${customer}`)], has_more: false });
            }
            return Response.json({});
        });

        await Effect.runPromise(client(ENV).forgetUser("user-1", ["cus_new"]).pipe(Effect.provide(http.layer)));

        expect(
            http.requests
                .filter(({ method, url }) => method === "DELETE" && url.includes("/customers/"))
                .map(({ url }) => url)
        ).toStrictEqual(["https://api.stripe.com/v1/customers/cus_new", "https://api.stripe.com/v1/customers/cus_old"]);
        expect(http.requests.filter(({ url }) => url.endsWith("/disconnect"))).toHaveLength(2);
    });
});
