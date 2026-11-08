import {
    RiArrowRightSLine,
    RiDownload2Line,
    RiLogoutBoxRLine,
    RiMoonLine,
    RiPlugLine,
    RiSettings2Line,
    RiUserAddLine,
    RiVerifiedBadgeFill,
} from "@remixicon/react";
import { Menu } from "panelui-web/menu";
import { useSyncExternalStore } from "react";
import { useIntlayer } from "react-intlayer";
import * as Skullet from "skullet";

import { authClient } from "@/lib/auth-client";
import { forgetLedger } from "@/lib/ledger-cache";
import { announceSessionChange } from "@/lib/session";
import { chooseTheme, subscribeTheme } from "@/lib/theme";

export async function signOut() {
    Skullet.forgetShapes();
    await authClient.signOut();
    announceSessionChange();
    await forgetLedger();
    window.location.assign("/login");
}

const INITIALS_SHOWN = 2;

const initialsOf = (name: string) =>
    name
        .split(/[\s@._-]+/)
        .filter((word) => word !== "")
        .slice(0, INITIALS_SHOWN)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

const isDark = () => document.documentElement.dataset.theme === "dark";

function DarkModeItem() {
    const { account } = useIntlayer("dashboard");
    const dark = useSyncExternalStore(subscribeTheme, isDark, () => false);
    return (
        <Menu.Item
            aria-checked={dark}
            className="dash-menu-item"
            closeOnClick={false}
            onClick={() => chooseTheme(dark ? "light" : "dark")}
            role="menuitemcheckbox"
        >
            <RiMoonLine className="size-[19px]" />
            {account.darkMode}
            <span className={`relative ml-auto h-4 w-7 rounded-full ${dark ? "bg-app-tint" : "bg-app-strong"}`}>
                <span className={`absolute top-0.5 size-3 rounded-full bg-white ${dark ? "right-0.5" : "left-0.5"}`} />
            </span>
        </Menu.Item>
    );
}

export function UserMenu({ collapsed, side = "right" }: { collapsed: boolean; side?: "right" | "top" }) {
    const { data: session } = authClient.useSession();
    const { account } = useIntlayer("dashboard");
    const name = session?.user.name || session?.user.email || "";
    return (
        <Menu>
            <Menu.Trigger
                aria-label={account.label.value}
                className="data-[popup-open]:bg-app-fill mt-auto flex items-center gap-2.5 rounded-xl p-2.5 text-left"
            >
                <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-app-tint)_24%,var(--color-app-group))] text-xs font-medium text-[color-mix(in_oklab,var(--color-app-tint),var(--color-app-ink)_40%)]">
                    {initialsOf(name)}
                </span>
                {collapsed ? null : (
                    <>
                        <span className="min-w-0 flex-1">
                            <b className="flex items-center gap-1.5 text-[13px] leading-[18px] font-medium">
                                <span className="truncate">{name}</span>
                                <RiVerifiedBadgeFill className="text-app-tint shrink-0" size={14} />
                            </b>
                            <small className="text-muted-foreground block truncate text-xs leading-4">
                                {session?.user.email}
                            </small>
                        </span>
                        <RiArrowRightSLine className="text-muted-foreground ml-auto shrink-0" size={18} />
                    </>
                )}
            </Menu.Trigger>
            <Menu.Content
                align={side === "top" ? "start" : "end"}
                className="app-shell dash-menu ph-no-capture w-[min(300px,calc(100vw-32px))] p-2"
                side={side}
                sideOffset={side === "top" ? 8 : 25}
            >
                <DarkModeItem />
                <div className="dash-menu-rule" />
                <Menu.Item aria-disabled className="dash-menu-item" closeOnClick={false}>
                    <RiPlugLine className="size-[19px]" />
                    {account.connections}
                </Menu.Item>
                <Menu.Item aria-disabled className="dash-menu-item" closeOnClick={false}>
                    <RiSettings2Line className="size-[19px]" />
                    {account.settings}
                </Menu.Item>
                <Menu.Item aria-disabled className="dash-menu-item" closeOnClick={false}>
                    <RiDownload2Line className="size-[19px]" />
                    {account.exportData}
                </Menu.Item>
                <div className="dash-menu-rule" />
                <Menu.Item aria-disabled className="dash-menu-item" closeOnClick={false}>
                    <RiUserAddLine className="size-[19px]" />
                    {account.invite}
                </Menu.Item>
                <Menu.Item className="dash-menu-item" onClick={signOut}>
                    <RiLogoutBoxRLine className="size-[19px]" />
                    {account.signOut}
                </Menu.Item>
                <div className="text-muted-foreground p-2 text-[13px] leading-[18px]">
                    {account.plan} · <a href="/terms">{account.terms}</a>
                </div>
            </Menu.Content>
        </Menu>
    );
}
