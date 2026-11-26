import { Navigate, createFileRoute, redirect } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

import { SettingsNav } from "@/components/dashboard/settings/nav";
import { pageHead } from "@/lib/route-title";

const DESKTOP = "(min-width: 64rem)";

const onWidthChange = (onChange: () => void) => {
    const query = matchMedia(DESKTOP);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
};

export const Route = createFileRoute("/_account/_app/settings/")({
    head: pageHead("settings"),
    beforeLoad: () => {
        if (!import.meta.env.SSR && matchMedia(DESKTOP).matches) {
            throw redirect({ replace: true, to: "/settings/account" });
        }
    },
    component: SettingsIndex,
});

// The server cannot see the width, so a desktop load of this page moves on once it hydrates.
function SettingsIndex() {
    const desktop = useSyncExternalStore(
        onWidthChange,
        () => matchMedia(DESKTOP).matches,
        () => false
    );
    if (desktop) {
        return <Navigate replace to="/settings/account" />;
    }
    return (
        <div className="pt-2 lg:hidden">
            <SettingsNav list />
        </div>
    );
}
