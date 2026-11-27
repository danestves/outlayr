import { api } from "@outlayr/backend/convex/_generated/api";
import { LANGUAGES } from "@outlayr/shared/i18n";
import { useOnMount } from "@outlayr/shared/lifecycle";
import { APP_URL, SITE_URL } from "@outlayr/shared/urls";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ConvexHttpClient } from "convex/browser";
import * as Schema from "effect/Schema";

import { SignInFlow } from "@/components/account/sign-in-flow";
import { safeRedirect } from "@/lib/account";
import { settleFinishedDeletion } from "@/lib/account-deletion";
import { convexUrls } from "@/lib/convex";
import { localizedText } from "@/lib/route-title";
import { announceSessionChange } from "@/lib/session";
import { forgetLedger } from "@/lib/unsent";

const CANONICAL = `${APP_URL}/login`;

export const Route = createFileRoute("/_account/login")({
    beforeLoad: ({ context, search }) => {
        if (context.token) {
            throw redirect({ href: safeRedirect(search.redirect) });
        }
    },
    component: Login,
    head: ({ matches }) => {
        const title = localizedText("signIn", matches);
        const description = localizedText("signInDescription", matches);
        return {
            links: [{ href: CANONICAL, rel: "canonical" }],
            meta: [
                { title },
                { content: description, name: "description" },
                { content: "index, follow", name: "robots" },
                { content: "Outlayr", property: "og:site_name" },
                { content: "website", property: "og:type" },
                { content: title, property: "og:title" },
                { content: description, property: "og:description" },
                { content: CANONICAL, property: "og:url" },
                { content: `${SITE_URL}${LANGUAGES.en.image}`, property: "og:image" },
                { content: "1200", property: "og:image:width" },
                { content: "630", property: "og:image:height" },
                { content: "summary_large_image", name: "twitter:card" },
                { content: "@tryoutlayr", name: "twitter:site" },
            ],
        };
    },
    validateSearch: Schema.toStandardSchemaV1(Schema.Struct({ redirect: Schema.optional(Schema.String) })),
});

function Login() {
    const target = safeRedirect(Route.useSearch().redirect);
    useOnMount(() => {
        const poll = (resumeSecret: string) =>
            new ConvexHttpClient(convexUrls().convexUrl).query(api.accountDeletion.poll, {
                at: Date.now(),
                resumeSecret,
            });
        settleFinishedDeletion(poll, forgetLedger).catch((error) => {
            console.warn("Could not check the deletion job", error);
        });
    });
    const finish = () => {
        announceSessionChange();
        window.location.assign(target);
    };
    return <SignInFlow onDone={finish} target={target} />;
}
