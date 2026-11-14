import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import CheckmarkBadge01Icon from "@hugeicons/core-free-icons/CheckmarkBadge01Icon";
import Download04Icon from "@hugeicons/core-free-icons/Download04Icon";
import Logout03Icon from "@hugeicons/core-free-icons/Logout03Icon";
import Moon02Icon from "@hugeicons/core-free-icons/Moon02Icon";
import Plug01Icon from "@hugeicons/core-free-icons/Plug01Icon";
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon";
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { chooseTheme, subscribeTheme } from "@outlayr/shared/theme";
import { Link } from "@tanstack/react-router";
import { Avatar } from "panelui-web/avatar";
import { Menu } from "panelui-web/menu";
import { Switch } from "panelui-web/switch";
import { useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { useIntlayer } from "react-intlayer";
import * as Skullet from "skullet";

import { useProfile } from "@/lib/account-state";
import { authClient } from "@/lib/auth-client";
import { forgetLedger } from "@/lib/ledger-cache";
import { announceSessionChange } from "@/lib/session";

export async function signOut() {
    Skullet.forgetShapes();
    await authClient.signOut();
    announceSessionChange();
    await forgetLedger();
    window.location.assign("/login");
}

const AVATAR: CSSProperties & { "--avatar-color": string; "--avatar-size": string } = {
    "--avatar-color": "var(--color-app-tint)",
    "--avatar-size": "34px",
};

const AVATAR_INITIALS =
    "flex-none [&_[data-slot=avatar-face]>span]:bg-[color-mix(in_oklab,var(--avatar-color)_24%,var(--color-app-group))] [&_[data-slot=avatar-face]>span]:text-[color-mix(in_oklab,var(--avatar-color),var(--foreground)_40%)] [&_[data-slot=avatar-face]>span]:text-xs [&_[data-slot=avatar-face]>span]:tracking-normal [&_[data-slot=avatar-face]]:after:hidden";

const isDark = () => document.documentElement.dataset.theme === "dark";

function DarkModeItem() {
    const { account } = useIntlayer("dashboard");
    const dark = useSyncExternalStore(subscribeTheme, isDark, () => false);
    return (
        <Menu.Item
            aria-checked={dark}
            closeOnClick={false}
            onClick={() => chooseTheme(dark ? "light" : "dark")}
            role="menuitemcheckbox"
        >
            <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} />
            {account.darkMode}
            <Switch aria-hidden checked={dark} className="pointer-events-none ml-auto" size="sm" tabIndex={-1} />
        </Menu.Item>
    );
}

export function UserMenu({ collapsed, side = "right" }: { collapsed: boolean; side?: "right" | "top" }) {
    const profile = useProfile();
    const { account } = useIntlayer("dashboard");
    const name = profile?.name || profile?.email || "";
    return (
        <Menu>
            <Menu.Trigger
                aria-label={account.label.value}
                className={`hover:bg-app-fill data-[popup-open]:bg-app-fill mt-auto flex items-center gap-2.5 rounded-xl text-left ${collapsed ? "justify-center p-1" : "p-2.5"}`}
            >
                <Avatar className={AVATAR_INITIALS} name={name} style={AVATAR} />
                {collapsed ? null : (
                    <>
                        <span className="min-w-0 flex-1">
                            <b className="flex min-h-[18px] items-center gap-1.5 text-[13px] leading-[18px] font-medium">
                                <span className="truncate">{name}</span>
                                <HugeiconsIcon
                                    className="text-app-tint shrink-0"
                                    icon={CheckmarkBadge01Icon}
                                    size={14}
                                    strokeWidth={1.5}
                                />
                            </b>
                            <small className="text-muted-foreground block min-h-4 truncate text-xs leading-4">
                                {profile?.email}
                            </small>
                        </span>
                        <HugeiconsIcon
                            className="text-muted-foreground ml-auto shrink-0"
                            icon={ArrowRight01Icon}
                            size={18}
                            strokeWidth={1.5}
                        />
                    </>
                )}
            </Menu.Trigger>
            <Menu.Content
                align={side === "top" ? "start" : "end"}
                className="app-shell ph-no-capture w-[min(300px,calc(100vw-32px))] max-lg:[&_[role^=menuitem]]:h-11"
                side={side}
                sideOffset={side === "top" ? 8 : 25}
            >
                <DarkModeItem />
                <Menu.Separator />
                <Menu.Item disabled>
                    <HugeiconsIcon icon={Plug01Icon} strokeWidth={2} />
                    {account.connections}
                </Menu.Item>
                <Menu.Item render={<Link to="/app/settings" />}>
                    <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
                    {account.settings}
                </Menu.Item>
                <Menu.Item disabled>
                    <HugeiconsIcon icon={Download04Icon} strokeWidth={2} />
                    {account.exportData}
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item disabled>
                    <HugeiconsIcon icon={UserAdd01Icon} strokeWidth={2} />
                    {account.invite}
                </Menu.Item>
                <Menu.Item onClick={signOut}>
                    <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} />
                    {account.signOut}
                </Menu.Item>
                <div className="text-muted-foreground p-2 text-[13px] leading-[18px]">
                    {account.plan} · <a href="/terms">{account.terms}</a>
                </div>
            </Menu.Content>
        </Menu>
    );
}
