import { PULL_PAGE_MAX } from "@outlayr/backend/confect/sync";
import { api } from "@outlayr/backend/convex/_generated/api";
import type { DehydratedDbState } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { ConvexHttpClient } from "convex/browser";
import * as Schema from "effect/Schema";

import type { MintedPhotos } from "@/components/dashboard/shell/photos";

import {
    accountsQuery,
    connectionsQuery,
    limitsQuery,
    notionQuery,
    planQuery,
    pushConfigQuery,
    referralsQuery,
    sessionRows,
    sessionsQuery,
    sharedLinksQuery,
} from "./account-state";
import type { Profile } from "./account-state";
import { convexUrls, serverConvexUrl } from "./convex";
import { ledgerSeed, syncedTableNames } from "./ledger-db";
import type { PulledPage, PulledRow } from "./ledger-sync";
import { timed } from "./server-timing";

const PHOTO_BATCH = 100;

export interface ServerLedger {
    collections: DehydratedDbState["collections"];
    photos: MintedPhotos;
    profile: Profile | undefined;
}

const SessionAnswer = Schema.Struct({
    session: Schema.Struct({ id: Schema.String }),
    user: Schema.Struct({
        email: Schema.String,
        emailVerified: Schema.Boolean,
        id: Schema.String,
        image: Schema.optional(Schema.NullOr(Schema.String)),
        name: Schema.String,
    }),
});

const imageKeysOf = (rows: readonly PulledRow[]) =>
    rows.flatMap(({ deletedAt, fields }) =>
        // oxlint-disable-next-line anti-slop/no-runtime-typeof -- pullSince types every table's fields loosely; this is the boundary.
        deletedAt === null && typeof fields.imageKey === "string" ? [fields.imageKey] : []
    );

// Each page's photos are minted while the next page is pulled. The HTTP client runs mutations one at a time
// unless told to skip its queue, which put every batch behind the last.
async function pullLedger(client: ConvexHttpClient) {
    const tables = [...syncedTableNames()];
    const mintedAt = Date.now();
    const rows: PulledRow[] = [];
    const keys = new Set<string>();
    const minting: Promise<MintedPhotos["minted"]>[] = [];
    const mint = (batch: string[]) => {
        const urls = client.mutation(api.photos.readUrls, { keys: batch }, { skipQueue: true });
        // Handled at once, so a failure during the next page cannot crash the process. Promise.all still throws it.
        urls.catch(() => undefined);
        minting.push(urls);
    };
    let cursor = 0;
    let limit: number | undefined = PULL_PAGE_MAX;
    for (;;) {
        let page: PulledPage;
        try {
            // oxlint-disable-next-line no-await-in-loop -- each page starts at the cursor the last one reached.
            page = await client.query(api.sync.pullSince, { cursor, limit, tables });
        } catch (error) {
            if (limit === undefined) {
                throw error;
            }
            // A ledger whose tables are all large passes Convex's read limit at the big page; the default one fits.
            limit = undefined;
            continue;
        }
        rows.push(...page.rows);
        const fresh = [...new Set(imageKeysOf(page.rows))].filter((key) => !keys.has(key));
        for (const key of fresh) {
            keys.add(key);
        }
        for (let index = 0; index < fresh.length; index += PHOTO_BATCH) {
            mint(fresh.slice(index, index + PHOTO_BATCH));
        }
        ({ cursor } = page);
        if (!page.hasMore) {
            break;
        }
    }
    const minted = await timed(
        "photos",
        () => Promise.all(minting),
        (batches) => `${batches.length} batches`
    );
    const photos: MintedPhotos = { keys: [...keys], minted: minted.flat(), mintedAt };
    return { cursor, photos, rows };
}

// The same request better-auth's own getToken makes: the visitor's cookies, addressed to the Convex site.
async function authGet<S extends Schema.ConstraintDecoder<unknown>>(
    convexSiteUrl: string,
    path: string,
    schema: S
): Promise<S["Type"]> {
    const headers = new Headers(getRequestHeaders());
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    headers.set("accept-encoding", "identity");
    headers.set("host", new URL(convexSiteUrl).host);
    const response = await fetch(`${convexSiteUrl}/api/auth${path}`, { headers });
    return Schema.decodeUnknownPromise(schema)(response.ok ? await response.json() : null);
}

async function readProfile(convexSiteUrl: string): Promise<Profile | undefined> {
    const answer = await authGet(convexSiteUrl, "/get-session", SessionAnswer).catch(() => undefined);
    return (
        answer && {
            email: answer.user.email,
            emailVerified: answer.user.emailVerified,
            id: answer.user.id,
            image: answer.user.image ?? null,
            name: answer.user.name,
            sessionId: answer.session.id,
        }
    );
}

// Everything the first frame of a signed-in page shows, read with the visitor's token before the server renders.
export const serverLedger = createIsomorphicFn()
    .server(async (token: string): Promise<ServerLedger> => {
        const { convexSiteUrl } = convexUrls();
        const client = new ConvexHttpClient(serverConvexUrl(), { auth: token });
        const profile = timed("profile", () => readProfile(convexSiteUrl));
        const [{ cursor, photos, rows }, rates] = await Promise.all([
            timed(
                "pull",
                () => pullLedger(client),
                (pulled) => `${pulled.rows.length} rows`
            ),
            timed("rates", () => client.query(api.ledger.exchangeRates, {})),
        ]);
        return { collections: ledgerSeed(rows, cursor, rates), photos, profile: await profile };
    })
    .client((): Promise<ServerLedger> => Promise.reject(new Error("The ledger is read on the server only")));

const Sessions = Schema.Array(
    Schema.Struct({
        id: Schema.String,
        updatedAt: Schema.Union([Schema.String, Schema.Number]),
        userAgent: Schema.optional(Schema.NullOr(Schema.String)),
    })
);
const SignIns = Schema.Array(
    Schema.Struct({
        createdAt: Schema.Union([Schema.String, Schema.Number]),
        id: Schema.String,
        providerId: Schema.String,
    })
);

// Settings pages read these at once, so the server answers them before it renders instead of the browser after.
export const serverAccountState = createIsomorphicFn()
    .server(async (client: QueryClient, convex: ConvexHttpClient | undefined) => {
        const { convexSiteUrl } = convexUrls();
        const plan = convex
            ? [client.prefetchQuery({ ...planQuery, queryFn: () => convex.action(api.billing.plan, {}) })]
            : [];
        await timed("account", () =>
            Promise.all([
                client.prefetchQuery(limitsQuery),
                client.prefetchQuery(notionQuery),
                client.prefetchQuery(referralsQuery),
                client.prefetchQuery(connectionsQuery),
                client.prefetchQuery(sharedLinksQuery),
                client.prefetchQuery(pushConfigQuery),
                ...plan,
                client.prefetchQuery({
                    ...sessionsQuery,
                    queryFn: async () => sessionRows(await authGet(convexSiteUrl, "/list-sessions", Sessions)),
                }),
                client.prefetchQuery({
                    ...accountsQuery,
                    queryFn: async () => {
                        const signIns = await authGet(convexSiteUrl, "/list-accounts", SignIns);
                        return signIns.map(({ createdAt, id, providerId }) => ({
                            id,
                            linkedAt: new Date(createdAt).getTime(),
                            providerId,
                        }));
                    },
                }),
            ])
        );
    })
    .client(() => Promise.resolve());
