import { api } from "@outlayr/backend/convex/_generated/api";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ConvexHttpClient } from "convex/browser";
import * as Schema from "effect/Schema";
import { useEffect } from "react";

import { SignInFlow } from "@/components/account/sign-in-flow";
import { safeRedirect } from "@/lib/account";
import { settleFinishedDeletion } from "@/lib/account-deletion";
import { convexUrls } from "@/lib/convex";
import { forgetLedger } from "@/lib/ledger-cache";
import { announceSessionChange } from "@/lib/session";

export const Route = createFileRoute("/_account/login")({
    beforeLoad: ({ context, search }) => {
        if (context.token) {
            throw redirect({ href: safeRedirect(search.redirect) });
        }
    },
    component: Login,
    head: () => ({ meta: [{ title: "Sign in · Outlayr" }] }),
    validateSearch: Schema.toStandardSchemaV1(Schema.Struct({ redirect: Schema.optional(Schema.String) })),
});

function Login() {
    const target = safeRedirect(Route.useSearch().redirect);
    // oxlint-disable-next-line outlayr/react-effect-budget -- signed-out cleanup when a deletion's last response was lost; the shared client waits for a token, so this uses HTTP.
    useEffect(() => {
        const poll = (resumeSecret: string) =>
            new ConvexHttpClient(convexUrls().convexUrl).query(api.accountDeletion.poll, {
                at: Date.now(),
                resumeSecret,
            });
        settleFinishedDeletion(poll, forgetLedger).catch((error) => {
            console.warn("Could not check the deletion job", error);
        });
    }, []);
    const finish = () => {
        announceSessionChange();
        window.location.assign(target);
    };
    return <SignInFlow onDone={finish} target={target} />;
}
