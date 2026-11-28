import { convexQuery } from "@convex-dev/react-query";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useMirror } from "@outlayr/shared/lifecycle";
import { queryOptions, skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import { authClient } from "./auth-client";
import { convexClient } from "./convex";
import { currentProfileId } from "./profile";
import { profilesQuery } from "./profile-registry";
import { currentPush } from "./web-push";
import { webhooksOpen } from "./webhooks";

const FOR_THE_SESSION = Number.POSITIVE_INFINITY;
const PLAN_FRESH_MS = 5 * 60_000;
const AUTH_FRESH_MS = 60_000;

const kept = { gcTime: FOR_THE_SESSION } as const;

export const limitsQuery = { ...convexQuery(api.limits.mine, {}), ...kept };
export const notionQuery = { ...convexQuery(api.notion.connected, {}), ...kept };
export const referralsQuery = { ...convexQuery(api.referrals.overview, {}), ...kept };
export const connectionsQuery = { ...convexQuery(api.mcp.listConnections, {}), ...kept };
export const bankOverviewQuery = { ...convexQuery(api.banking.overview, {}), ...kept };
export const sharedLinksQuery = { ...convexQuery(api.sharedReports.mine, {}), ...kept };
export const pushConfigQuery = { ...convexQuery(api.webPush.config, {}), ...kept };
export const webhooksQuery = { ...convexQuery(api.webhooks.status, {}), ...kept };
export const joinedProfilesQuery = { ...convexQuery(api.profileSharing.joined, {}), ...kept };
export const profileSharingEnabledQuery = { ...convexQuery(api.profileSharing.enabled, {}), ...kept };

export const profileMembersQuery = (profileId: string | null) => ({
    ...convexQuery(api.profileSharing.members, profileId === null ? "skip" : { profileId }),
    ...kept,
});

export const reminderQuery = (endpoint: string | null | undefined) => ({
    ...convexQuery(api.webPush.mine, endpoint ? { endpoint } : "skip"),
    ...kept,
});

export const bankSearchQuery = (q: string, region: string | null) => ({
    ...convexQuery(api.banking.searchInstitutions, { q, region }),
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
    updatedAt: Date | number | string;
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
        return data.map(({ createdAt, id, providerId }) => ({
            id,
            linkedAt: new Date(createdAt).getTime(),
            providerId,
        }));
    },
    queryKey: ["auth", "accounts"],
    staleTime: AUTH_FRESH_MS,
});

export const useProfile = () => useQuery(profileQuery).data;

export function useProfileMirror() {
    const client = useQueryClient();
    const { data: session } = authClient.useSession();
    useMirror([client, session], () => {
        if (session) {
            client.setQueryData(profileQuery.queryKey, profileOf(session));
        }
    });
}

export function seedProfile(client: QueryClient, profile: Profile | undefined) {
    if (profile) {
        client.setQueryData(profileQuery.queryKey, profile);
    }
}

export const offerProfile = (client: QueryClient, profile: Profile | undefined) =>
    seedProfile(client, client.getQueryData(profileQuery.queryKey) ?? profile);

const unlessKnown = { staleTime: Number.POSITIVE_INFINITY } as const;

export function warmAccountState(client: QueryClient) {
    void client.prefetchQuery({ ...limitsQuery, ...unlessKnown });
    void client.prefetchQuery({ ...notionQuery, ...unlessKnown });
    void client.prefetchQuery({ ...referralsQuery, ...unlessKnown });
    void client.prefetchQuery({ ...connectionsQuery, ...unlessKnown });
    void client.prefetchQuery({ ...bankOverviewQuery, ...unlessKnown });
    void client.prefetchQuery({ ...sharedLinksQuery, ...unlessKnown });
    void client.prefetchQuery({ ...pushConfigQuery, ...unlessKnown });
    if (webhooksOpen(Date.now())) {
        void client.prefetchQuery({ ...webhooksQuery, ...unlessKnown });
    }
    void client.prefetchQuery({ ...joinedProfilesQuery, ...unlessKnown });
    void client.prefetchQuery({ ...profileSharingEnabledQuery, ...unlessKnown });
    const profileId = currentProfileId();
    if (profileId !== null) {
        void client.prefetchQuery({ ...profileMembersQuery(profileId), ...unlessKnown });
    }
    void client.prefetchQuery({ ...planQuery, ...unlessKnown });
    void client.prefetchQuery({ ...profilesQuery, ...unlessKnown });
    void client.prefetchQuery({ ...sessionsQuery, ...unlessKnown });
    void client.prefetchQuery({ ...accountsQuery, ...unlessKnown });
    void client
        .fetchQuery({ ...pushEndpointQuery, ...unlessKnown })
        .then(({ endpoint }) => client.prefetchQuery({ ...reminderQuery(endpoint), ...unlessKnown }))
        .catch(() => undefined);
}
