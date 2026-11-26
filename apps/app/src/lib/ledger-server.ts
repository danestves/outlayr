import { ANCHOR_PAIR_CATALOG, PAIRS_PER_PAGE } from "@outlayr/backend/confect/exchangeRates";
import { PULL_PAGE_MAX } from "@outlayr/backend/confect/sync";
import { api } from "@outlayr/backend/convex/_generated/api";
import { utcDateString } from "@outlayr/money/dates";
import { parseFavourites } from "@outlayr/money/favourite-currencies";
import { settingsOf } from "@outlayr/money/ledger-view";
import type { LedgerOpening } from "@outlayr/money/ledger-view";
import type { DehydratedDbState } from "@tanstack/react-db";
import type { QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, getRequestHeaders } from "@tanstack/react-start/server";
import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
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
import type { RateRow } from "./ledger-books";
import { ledgerSeed, pulledBooks, syncedTableNames } from "./ledger-db";
import type { ExchangeRate } from "./ledger-db";
import type { PulledPage, PulledRow } from "./ledger-sync";
import { lightSince, opensLight } from "./light-views";
import type { LightPath } from "./light-views";
import { currentProfileId, PROFILE_COOKIE, parseProfileId, profileArgs } from "./profile";
import { profileAccess } from "./profile-access";
import { profileLossCode } from "./profile-loss";
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
    paywalled: boolean;
    profile: Profile | undefined;
    profileId: string | null;
    profiles: PulledPage;
    ratesPublic: boolean;
}

const proRequired = (error: Error) =>
    (error instanceof ConvexError ? String(error.data) : error.message).includes("Pro is required");

const forgetRequestProfile = (profileId: string) => {
    if (parseProfileId(getCookie(PROFILE_COOKIE)) === profileId) {
        deleteCookie(PROFILE_COOKIE, { path: "/" });
    }
};

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

const rateWindowAt = () => Date.parse(utcDateString(Date.now()));

const publicRateRow = (
    row: Pick<RateRow, "date" | "fetchedAt" | "quote" | "rate" | "rateType" | "source">
): RateRow => ({
    ...row,
    _creationTime: row.fetchedAt,
    _id: `${row.quote}:${row.rateType}:${row.date}`,
});

const sharedRates = async (client: ConvexHttpClient, rows: readonly PulledRow[]): Promise<readonly RateRow[]> => {
    const books = pulledBooks(rows, []);
    const favourites = books.appMeta.find((row) => row.key === "favouriteCurrencies")?.value ?? null;
    const quotes = new Set(
        [
            settingsOf(books.appMeta).currency,
            ...parseFavourites(favourites),
            ...books.accounts.filter((row) => row.deletedAt === null).map((row) => row.currency),
        ].filter((code) => code !== "USD")
    );
    const cursors = [
        ...new Set(
            [...quotes].flatMap((quote) => {
                const index = ANCHOR_PAIR_CATALOG.findIndex(
                    (pair) => pair.quote === quote && pair.rateType === "official"
                );
                return index === -1 ? [] : [Math.floor(index / PAIRS_PER_PAGE) * PAIRS_PER_PAGE];
            })
        ),
    ];
    const at = rateWindowAt();
    const pages = await Promise.all(cursors.map((cursor) => client.query(api.exchangeRates.pullRates, { at, cursor })));
    return pages
        .flatMap((page) => page.rows)
        .filter((row) => row.rateType === "official" && quotes.has(row.quote))
        .map(publicRateRow);
};

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
            let registryFailed = false;
            let registryError: Error | null = null;
            const registry = timed(
                "profiles",
                () => pullProfiles(client, requestedProfileId !== null),
                (page) => `${page.rows.length} rows`
            ).catch((error) => {
                registryFailed = true;
                registryError = error instanceof Error ? error : new Error(String(error));
                return EMPTY_PAGE;
            });
            const profilesPage = await registry;
            const own = !registryFailed && profilesOf(profilesPage).some((row) => row.id === requestedProfileId);
            let joined: readonly JoinedProfile[] | null = null;
            let joinedKnown = false;
            let joinedError: Error | null = null;
            if (requestedProfileId !== null && !own) {
                const answer = await timed("joined", () =>
                    client.query(api.profileSharing.joined, {}).catch((error) => {
                        joinedError = error instanceof Error ? error : new Error(String(error));
                        return null;
                    })
                );
                if (answer !== null) {
                    joined = answer;
                    joinedKnown = true;
                }
            }
            let profileId: string | null = null;
            let lostProfileId: string | null = null;
            if (requestedProfileId !== null) {
                if (own) {
                    profileId = requestedProfileId;
                } else if (joinedKnown) {
                    if (profileAccess(requestedProfileId, own, joined ?? []) === "joined") {
                        profileId = requestedProfileId;
                    } else if (registryFailed) {
                        if (registryError !== null && proRequired(registryError)) {
                            profileId = requestedProfileId;
                        } else {
                            throw registryError ?? new Error("Could not read the visitor's profiles");
                        }
                    } else {
                        lostProfileId = requestedProfileId;
                    }
                } else if (registryFailed) {
                    throw registryError ?? new Error("Could not read the visitor's profiles");
                } else {
                    throw joinedError ?? new Error("Could not verify the profile's membership");
                }
            }
            if (lostProfileId !== null) {
                forgetRequestProfile(lostProfileId);
            }
            let profileRates = profileId !== null;
            let rateFailure: Error | null = null;
            let viewerRates: Promise<readonly ExchangeRate[]> | null = null;
            const loadRates = async (): Promise<readonly ExchangeRate[]> => {
                try {
                    return await client.query(api.ledger.exchangeRates, {});
                } catch (error) {
                    rateFailure = error instanceof Error ? error : new Error(String(error));
                    return [];
                }
            };
            const ratesForViewer = () => (viewerRates ??= timed("rates", loadRates));
            const pull = async (scope: string | null) =>
                (light !== null && !profileRates
                    ? await timed(
                          "recent",
                          () => pullLight(client, ratesForViewer(), scope, light),
                          (pulled) =>
                              pulled ? `${pulled.rows.length} rows, ${pulled.opening.cells.length} cells` : "none"
                      )
                    : null) ??
                (await timed(
                    "pull",
                    () => pullLedger(client, scope),
                    (pulled) => `${pulled.rows.length} rows`
                ));
            const read = async (scope: string | null) => {
                const members =
                    scope === null
                        ? null
                        : timed("members", () =>
                              client.query(api.profileSharing.members, { profileId: scope }).catch(() => null)
                          );
                const [{ cursor, opening, rows }, memberRows] = await Promise.all([pull(scope), members]);
                return { cursor, memberRows, opening, rows };
            };
            let loaded: Awaited<ReturnType<typeof read>>;
            let paywalled = false;
            const readPersonal = async () => {
                try {
                    return await read(null);
                } catch (fallback) {
                    const failure = fallback instanceof Error ? fallback : new Error(String(fallback));
                    if (!proRequired(failure)) {
                        throw failure;
                    }
                    paywalled = true;
                    return { cursor: 0, memberRows: null, opening: null, rows: [] };
                }
            };
            if (lostProfileId === null) {
                try {
                    loaded = await read(profileId);
                } catch (error) {
                    if (profileId === null || !(error instanceof Error) || profileLossCode(error) === null) {
                        throw error;
                    }
                    lostProfileId = profileId;
                    forgetRequestProfile(profileId);
                    profileId = null;
                    profileRates = false;
                    loaded = await readPersonal();
                }
            } else {
                loaded = await readPersonal();
            }
            if (!profileRates && rateFailure !== null && !proRequired(rateFailure)) {
                throw rateFailure;
            }
            let rateRows: readonly ExchangeRate[];
            if (paywalled) {
                rateRows = [];
            } else if (profileRates) {
                rateRows = await timed("rates-shared", () => sharedRates(client, loaded.rows)).catch(() =>
                    ratesForViewer()
                );
            } else {
                rateRows = await ratesForViewer();
            }
            return {
                collections: ledgerSeed(loaded.rows, loaded.cursor, rateRows),
                joined,
                lostProfileId,
                members: loaded.memberRows,
                opening: loaded.opening,
                paywalled,
                profile: await profile,
                profileId,
                profiles: profilesPage,
                ratesPublic: profileRates,
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
