import { PULL_PAGE_MAX } from "@outlayr/backend/confect/sync";
import { api } from "@outlayr/backend/convex/_generated/api";
import type { LedgerOpening } from "@outlayr/money/ledger-view";
import type { DehydratedDbState } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { ConvexHttpClient } from "convex/browser";
import * as Schema from "effect/Schema";

import {
    accountsQuery,
    connectionsQuery,
    limitsQuery,
    notionQuery,
    planQuery,
    profileMembersQuery,
    profileSharingEnabledQuery,
    pushConfigQuery,
    referralsQuery,
    seedProfile,
    sessionRows,
    sessionsQuery,
    sharedLinksQuery,
    webhooksQuery,
} from "./account-state";
import type { Profile } from "./account-state";
import { convexUrls, serverConvexUrl } from "./convex";
import { ledgerSeed, pulledBooks, syncedTableNames } from "./ledger-db";
import type { ExchangeRate } from "./ledger-db";
import type { PulledPage, PulledRow } from "./ledger-sync";
import { lightSince, opensLight } from "./light-views";
import type { LightPath } from "./light-views";
import { currentProfileId, profileArgs } from "./profile";
import { acceptedProfileId } from "./profile-access";
import { profilesOf } from "./profile-registry";
import type { JoinedProfile, ProfileMembersView } from "./profile-sharing";
import { timed } from "./server-timing";
import { tokenProfile } from "./session";

export interface ServerLedger {
    collections: DehydratedDbState["collections"];
    joined: readonly JoinedProfile[] | null;
    lostProfileId: string | null;
    members: ProfileMembersView | null;
    opening: LedgerOpening | null;
    profile: Profile | undefined;
    profileId: string | null;
    profiles: PulledPage;
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

async function pullLedger(client: ConvexHttpClient, profileId: string | null) {
    const tables = [...syncedTableNames()];
    const scope = profileArgs(profileId);
    const rows: PulledRow[] = [];
    let cursor = 0;
    let limit: number | undefined = PULL_PAGE_MAX;
    for (;;) {
        let page: PulledPage;
        try {
            // oxlint-disable-next-line no-await-in-loop -- each page starts at the cursor the last one reached.
            page = await client.query(api.sync.pullSince, { cursor, limit, tables, ...scope });
        } catch (error) {
            if (limit === undefined) {
                throw error;
            }
            // A ledger whose tables are all large passes Convex's read limit at the big page; the default one fits.
            limit = undefined;
            continue;
        }
        rows.push(...page.rows);
        ({ cursor } = page);
        if (!page.hasMore) {
            return { cursor, opening: null, rows };
        }
    }
}

interface LightLoad {
    asOf: number;
    path: LightPath;
}

async function pullLight(
    client: ConvexHttpClient,
    rates: Promise<readonly ExchangeRate[]>,
    profileId: string | null,
    { asOf, path }: LightLoad
) {
    const tables = syncedTableNames().filter((table) => table !== "transactionTags");
    const page = await client
        .query(api.sync.pullRecent, { since: lightSince(path, asOf), tables, ...profileArgs(profileId) })
        .catch(() => undefined);
    if (page === undefined) {
        return null;
    }
    if (page === null) {
        client.mutation(api.ledgerCells.build, profileArgs(profileId)).catch(() => undefined);
        return null;
    }
    const opening = { cells: page.opening, cutoff: page.since };
    return opensLight(path, pulledBooks(page.rows, await rates), asOf, opening)
        ? { cursor: 0, opening, rows: page.rows }
        : null;
}

const EMPTY_PAGE: PulledPage = { cursor: 0, hasMore: false, rows: [] };

async function pullProfiles(client: ConvexHttpClient, required: boolean) {
    try {
        return await client.query(api.sync.pullSince, {
            cursor: 0,
            limit: PULL_PAGE_MAX,
            tables: ["profiles"],
        });
    } catch (error) {
        if (required) {
            throw error;
        }
        return EMPTY_PAGE;
    }
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
    .server(
        async (token: string, light: LightLoad | null, requestedProfileId: string | null): Promise<ServerLedger> => {
            const { convexSiteUrl } = convexUrls();
            const client = new ConvexHttpClient(serverConvexUrl(), { auth: token });
            const profile = tokenProfile(token) ?? timed("profile", () => readProfile(convexSiteUrl));
            const rates = timed("rates", () => client.query(api.ledger.exchangeRates, {}));
            const [profilesPage, rateRows] = await Promise.all([
                timed(
                    "profiles",
                    () => pullProfiles(client, requestedProfileId !== null),
                    (page) => `${page.rows.length} rows`
                ),
                rates,
            ]);
            const own = profilesOf(profilesPage).some((row) => row.id === requestedProfileId);
            let joined: readonly JoinedProfile[] | null = null;
            let joinedKnown = false;
            if (requestedProfileId !== null && !own) {
                const answer = await timed("joined", () =>
                    client.query(api.profileSharing.joined, {}).catch(() => null)
                );
                if (answer !== null) {
                    joined = answer;
                    joinedKnown = true;
                }
            }
            const profileId = acceptedProfileId(requestedProfileId, own, joined ?? []);
            const pull = async () =>
                (light
                    ? await timed(
                          "recent",
                          () => pullLight(client, Promise.resolve(rateRows), profileId, light),
                          (pulled) =>
                              pulled ? `${pulled.rows.length} rows, ${pulled.opening.cells.length} cells` : "none"
                      )
                    : null) ??
                (await timed(
                    "pull",
                    () => pullLedger(client, profileId),
                    (pulled) => `${pulled.rows.length} rows`
                ));
            const members =
                profileId === null
                    ? null
                    : timed("members", () => client.query(api.profileSharing.members, { profileId }).catch(() => null));
            const [{ cursor, opening, rows }, memberRows] = await Promise.all([pull(), members]);
            return {
                collections: ledgerSeed(rows, cursor, rateRows),
                joined,
                lostProfileId:
                    requestedProfileId !== null && profileId === null && (own || joinedKnown)
                        ? requestedProfileId
                        : null,
                members: memberRows,
                opening,
                profile: await profile,
                profileId,
                profiles: profilesPage,
            };
        }
    )
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
    .server(async (client: QueryClient, convex: ConvexHttpClient | undefined, webhooks: boolean) => {
        const { convexSiteUrl } = convexUrls();
        const plan = convex
            ? [client.prefetchQuery({ ...planQuery, queryFn: () => convex.action(api.billing.plan, {}) })]
            : [];
        const profileId = currentProfileId();
        const members =
            convex && profileId !== null
                ? [
                      client.prefetchQuery({
                          ...profileMembersQuery(profileId),
                          queryFn: () => convex.query(api.profileSharing.members, { profileId }),
                      }),
                  ]
                : [];
        const sharing = convex
            ? [
                  client.prefetchQuery({
                      ...profileSharingEnabledQuery,
                      queryFn: () => convex.query(api.profileSharing.enabled, {}),
                  }),
              ]
            : [];
        await timed("account", () =>
            Promise.all([
                client.prefetchQuery(limitsQuery),
                client.prefetchQuery(notionQuery),
                client.prefetchQuery(referralsQuery),
                client.prefetchQuery(connectionsQuery),
                client.prefetchQuery(sharedLinksQuery),
                client.prefetchQuery(pushConfigQuery),
                ...(webhooks ? [client.prefetchQuery(webhooksQuery)] : []),
                ...plan,
                ...members,
                ...sharing,
                readProfile(convexSiteUrl).then((profile) => seedProfile(client, profile)),
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
