import { convexQuery } from "@convex-dev/react-query";
import { api } from "@outlayr/backend/convex/_generated/api";
import {
    dehydrate,
    hydrate,
    matchQuery,
    queryOptions,
    skipToken,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type { DehydratedState, Query, QueryClient, QueryKey } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";

import { PHOTO_REMINT_MS, isPhotoKey, photoMintUsable } from "@/components/dashboard/shell/photos";

import { authClient } from "./auth-client";
import { convexClient } from "./convex";
import { currentPush } from "./web-push";

const FOR_THE_SESSION = Number.POSITIVE_INFINITY;
const PLAN_FRESH_MS = 5 * 60_000;
const AUTH_FRESH_MS = 60_000;

const kept = { gcTime: FOR_THE_SESSION } as const;

export const limitsQuery = { ...convexQuery(api.limits.mine, {}), ...kept };
export const notionQuery = { ...convexQuery(api.notion.connected, {}), ...kept };
export const referralsQuery = { ...convexQuery(api.referrals.overview, {}), ...kept };
export const connectionsQuery = { ...convexQuery(api.mcp.listConnections, {}), ...kept };
export const sharedLinksQuery = { ...convexQuery(api.sharedReports.mine, {}), ...kept };
export const pushConfigQuery = { ...convexQuery(api.webPush.config, {}), ...kept };

export const reminderQuery = (endpoint: string | null | undefined) => ({
    ...convexQuery(api.webPush.mine, endpoint ? { endpoint } : "skip"),
    ...kept,
});

export const pushEndpointQuery = queryOptions({
    ...kept,
    queryFn: async () => {
        const subscription = await currentPush();
        return { endpoint: subscription?.endpoint ?? null };
    },
    queryKey: ["web-push", "endpoint"],
});

export const planQuery = queryOptions({
    ...kept,
    queryFn: () => convexClient().action(api.billing.plan, {}),
    queryKey: ["billing", "plan"],
    retry: false,
    staleTime: PLAN_FRESH_MS,
});

type AuthSession = typeof authClient.$Infer.Session;

export interface Profile {
    email: string;
    emailVerified: boolean;
    id: string;
    image: string | null;
    name: string;
    sessionId: string;
}

const profileOf = ({ session, user }: AuthSession): Profile => ({
    email: user.email,
    emailVerified: user.emailVerified,
    id: user.id,
    image: user.image ?? null,
    name: user.name,
    sessionId: session.id,
});

const profileQuery = queryOptions<Profile>({
    ...kept,
    queryFn: skipToken,
    queryKey: ["auth", "profile"],
    staleTime: FOR_THE_SESSION,
});

interface ListedSession {
    id: string;
    updatedAt: Date | string;
    userAgent?: string | null;
}

export const sessionRows = (sessions: readonly ListedSession[]) =>
    sessions.map(({ id, updatedAt, userAgent }) => ({
        id,
        updatedAt: new Date(updatedAt).getTime(),
        userAgent: userAgent ?? null,
    }));

export const sessionsQuery = queryOptions({
    ...kept,
    queryFn: async () => {
        const { data, error } = await authClient.listSessions();
        if (error || !data) {
            throw new Error("Could not list sessions");
        }
        return sessionRows(data);
    },
    queryKey: ["auth", "sessions"],
    staleTime: AUTH_FRESH_MS,
});

export const accountsQuery = queryOptions({
    ...kept,
    queryFn: async () => {
        const { data, error } = await authClient.listAccounts();
        if (error || !data) {
            throw new Error("Could not list sign-in methods");
        }
        return data.map(({ createdAt, providerId }) => ({ linkedAt: new Date(createdAt).getTime(), providerId }));
    },
    queryKey: ["auth", "accounts"],
    staleTime: AUTH_FRESH_MS,
});

export const useProfile = () => useQuery(profileQuery).data;

export function useProfileMirror() {
    const client = useQueryClient();
    const { data: session } = authClient.useSession();
    // oxlint-disable-next-line outlayr/react-effect-budget -- the better-auth session store is an external system.
    useEffect(() => {
        if (session) {
            client.setQueryData(profileQuery.queryKey, profileOf(session));
        }
    }, [client, session]);
}

const COPIED: readonly QueryKey[] = [
    limitsQuery.queryKey,
    notionQuery.queryKey,
    referralsQuery.queryKey,
    connectionsQuery.queryKey,
    sharedLinksQuery.queryKey,
    pushConfigQuery.queryKey,
    pushEndpointQuery.queryKey,
    planQuery.queryKey,
    profileQuery.queryKey,
    sessionsQuery.queryKey,
    accountsQuery.queryKey,
];

const REMINDERS = reminderQuery(null).queryKey.slice(0, 2);

const NULL_IS_NO_ANSWER: readonly QueryKey[] = [planQuery.queryKey, limitsQuery.queryKey];

const oneOf = (keys: readonly QueryKey[], query: Query) =>
    keys.some((queryKey) => matchQuery({ exact: true, queryKey }, query));

const isAccountState = (query: Query) => oneOf(COPIED, query) || matchQuery({ queryKey: REMINDERS }, query);

const answered = (query: Query) =>
    query.state.status === "success" && !(query.state.data === null && oneOf(NULL_IS_NO_ANSWER, query));

export const accountStateOf = (client: QueryClient, now = Date.now()): DehydratedState =>
    dehydrate(client, {
        shouldDehydrateMutation: () => false,
        shouldDehydrateQuery: (query) =>
            answered(query) &&
            (isPhotoKey(query.queryKey) ? photoMintUsable(query.state.dataUpdatedAt, now) : isAccountState(query)),
    });

export function restoreAccountState(client: QueryClient, copied: DehydratedState | undefined, now = Date.now()) {
    if (!copied) {
        return;
    }
    const photos = copied.queries.filter(({ queryKey }) => isPhotoKey(queryKey));
    hydrate(
        client,
        { mutations: [], queries: copied.queries.filter(({ queryKey }) => !isPhotoKey(queryKey)) },
        { defaultOptions: { queries: kept } }
    );
    hydrate(
        client,
        { mutations: [], queries: photos.filter(({ state }) => photoMintUsable(state.dataUpdatedAt, now)) },
        { defaultOptions: { queries: { gcTime: PHOTO_REMINT_MS } } }
    );
}

const unlessKnown = { staleTime: Number.POSITIVE_INFINITY } as const;

export function warmAccountState(client: QueryClient) {
    void client.prefetchQuery({ ...limitsQuery, ...unlessKnown });
    void client.prefetchQuery({ ...notionQuery, ...unlessKnown });
    void client.prefetchQuery({ ...referralsQuery, ...unlessKnown });
    void client.prefetchQuery({ ...connectionsQuery, ...unlessKnown });
    void client.prefetchQuery({ ...sharedLinksQuery, ...unlessKnown });
    void client.prefetchQuery({ ...pushConfigQuery, ...unlessKnown });
    void client.prefetchQuery({ ...planQuery, ...unlessKnown });
    void client.prefetchQuery({ ...sessionsQuery, ...unlessKnown });
    void client.prefetchQuery({ ...accountsQuery, ...unlessKnown });
    void client
        .fetchQuery({ ...pushEndpointQuery, ...unlessKnown })
        .then(({ endpoint }) => client.prefetchQuery({ ...reminderQuery(endpoint), ...unlessKnown }))
        .catch(() => undefined);
}

const copiedAt = (client: QueryClient) =>
    Math.max(
        0,
        ...client
            .getQueryCache()
            .getAll()
            .filter((query) => isPhotoKey(query.queryKey) || isAccountState(query))
            .map((query) => query.state.dataUpdatedAt)
    );

export function useAccountStateStamp(client: QueryClient) {
    return useSyncExternalStore(
        (notify) => client.getQueryCache().subscribe(notify),
        () => copiedAt(client),
        () => 0
    );
}
