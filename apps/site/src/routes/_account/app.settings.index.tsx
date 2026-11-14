import { createFileRoute, redirect } from "@tanstack/react-router";

import { SettingsNav } from "@/components/dashboard/settings/nav";

const DESKTOP = "(min-width: 64rem)";

export const Route = createFileRoute("/_account/app/settings/")({
    beforeLoad: () => {
        if (matchMedia(DESKTOP).matches) {
            throw redirect({ replace: true, to: "/app/settings/account" });
        }
    },
    component: SettingsIndex,
});

function SettingsIndex() {
    return (
        <div className="pt-2">
            <SettingsNav list />
        </div>
    );
}
