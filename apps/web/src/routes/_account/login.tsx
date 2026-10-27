import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { SignInFlow } from "@/components/account/sign-in-flow";
import { safeRedirect } from "@/lib/account";

export const Route = createFileRoute("/_account/login")({
    beforeLoad: ({ context, search }) => {
        if (context.token) {
            throw redirect({ href: safeRedirect(search.redirect) });
        }
    },
    component: Login,
    head: () => ({ meta: [{ title: "Sign in · Outlayr" }] }),
    validateSearch: z.object({ redirect: z.string().optional() }),
});

function Login() {
    const target = safeRedirect(Route.useSearch().redirect);
    return <SignInFlow onDone={() => window.location.assign(target)} target={target} />;
}
