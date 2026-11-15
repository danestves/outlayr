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
import { convexUrls } from "./convex";
import { ledgerSeed, syncedTableNames } from "./ledger-db";
import type { PulledRow } from "./ledger-sync";

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

async function pullAll(client: ConvexHttpClient) {
    const tables = [...syncedTableNames()];
    const rows: PulledRow[] = [];
    let cursor = 0;
    for (;;) {
        // oxlint-disable-next-line no-await-in-loop -- each page starts at the cursor the last one reached.
        const page = await client.query(api.sync.pullSince, { cursor, tables });
        rows.push(...page.rows);
        ({ cursor } = page);
        if (!page.hasMore) {
            return { cursor, rows };
        }
    }
}

const imageKeysOf = (rows: readonly PulledRow[]) => [
    ...new Set(
        rows.flatMap(({ deletedAt, fields }) =>
            // oxlint-disable-next-line anti-slop/no-runtime-typeof -- pullSince types every table's fields loosely; this is the boundary.
            deletedAt === null && typeof fields.imageKey === "string" ? [fields.imageKey] : []
        )
    ),
];

async function mintPhotos(client: ConvexHttpClient, keys: readonly string[]): Promise<MintedPhotos> {
    const mintedAt = Date.now();
    const batches = Array.from({ length: Math.ceil(keys.length / PHOTO_BATCH) }, (_, index) =>
        keys.slice(index * PHOTO_BATCH, (index + 1) * PHOTO_BATCH)
    );
    const minted = await Promise.all(batches.map((batch) => client.mutation(api.photos.readUrls, { keys: batch })));
    return { keys, minted: minted.flat(), mintedAt };
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
        const { convexSiteUrl, convexUrl } = convexUrls();
        const client = new ConvexHttpClient(convexUrl, { auth: token });
        const profile = readProfile(convexSiteUrl);
        const [{ cursor, rows }, rates] = await Promise.all([
            pullAll(client),
            client.query(api.ledger.exchangeRates, {}),
        ]);
        const photos = await mintPhotos(client, imageKeysOf(rows));
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
    Schema.Struct({ createdAt: Schema.Union([Schema.String, Schema.Number]), providerId: Schema.String })
);

// Settings pages read these at once, so the server answers them before it renders instead of the browser after.
export const serverAccountState = createIsomorphicFn()
    .server(async (client: QueryClient, convex: ConvexHttpClient | undefined) => {
        const { convexSiteUrl } = convexUrls();
        const plan = convex
            ? [client.prefetchQuery({ ...planQuery, queryFn: () => convex.action(api.billing.plan, {}) })]
            : [];
        await Promise.all([
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
                    return signIns.map(({ createdAt, providerId }) => ({
                        linkedAt: new Date(createdAt).getTime(),
                        providerId,
                    }));
                },
            }),
        ]);
    })
    .client(() => Promise.resolve());
