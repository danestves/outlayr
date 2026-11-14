import { Outlet, createFileRoute } from "@tanstack/react-router";

import { SettingsLayout } from "@/components/dashboard/settings/settings-layout";

export const Route = createFileRoute("/_account/_app/settings")({ component: Settings });

function Settings() {
    return (
        <SettingsLayout>
            <Outlet />
        </SettingsLayout>
    );
}
