import { Outlet, createFileRoute } from "@tanstack/react-router";

import { SettingsLayout } from "@/components/dashboard/settings/settings-layout";
import { serverAccountState } from "@/lib/ledger-server";

export const Route = createFileRoute("/_account/_app/settings")({
    component: Settings,
    loader: ({ context, location }) =>
        serverAccountState(
            context.queryClient,
            context.convexQueryClient?.serverHttpClient,
            location.pathname === "/settings/connections/webhooks"
        ),
});

function Settings() {
    return (
        <SettingsLayout>
            <Outlet />
        </SettingsLayout>
    );
}
