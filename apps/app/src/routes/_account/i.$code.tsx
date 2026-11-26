import { api } from "@outlayr/backend/convex/_generated/api";
import { normalizeReferralCode } from "@outlayr/money/contract";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { ConvexHttpClient } from "convex/browser";

import { InviteClaim } from "@/components/invite/claim-page";
import { serverConvexUrl } from "@/lib/convex";
import { pageHead } from "@/lib/route-title";

const inviteHead = (ctx: { matches: readonly { loaderData?: unknown }[] }) => ({
    meta: [...pageHead("invite")(ctx).meta, { content: "noindex", name: "robots" }],
});

export const Route = createFileRoute("/_account/i/$code")({
    component: Invite,
    head: inviteHead,
    loader: async ({ params }) => {
        const code = normalizeReferralCode(params.code);
        if (code === null) {
            return { code: null, name: null, valid: false };
        }
        const inviter = await new ConvexHttpClient(serverConvexUrl()).query(api.referrals.inviter, { code });
        return { code, name: inviter?.name ?? null, valid: inviter !== null };
    },
});

function Invite() {
    const data = Route.useLoaderData();
    const token = useRouteContext({ from: "/_account", select: (context) => context.token });
    return <InviteClaim code={data.code} name={data.name} signedIn={token !== null} valid={data.valid} />;
}
