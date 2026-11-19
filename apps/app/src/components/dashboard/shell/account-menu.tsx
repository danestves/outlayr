import { Popover } from "@base-ui/react/popover";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import CheckmarkBadge01Icon from "@hugeicons/core-free-icons/CheckmarkBadge01Icon";
import Download04Icon from "@hugeicons/core-free-icons/Download04Icon";
import Logout03Icon from "@hugeicons/core-free-icons/Logout03Icon";
import Moon02Icon from "@hugeicons/core-free-icons/Moon02Icon";
import Notification03Icon from "@hugeicons/core-free-icons/Notification03Icon";
import Plug01Icon from "@hugeicons/core-free-icons/Plug01Icon";
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon";
import UserAdd01Icon from "@hugeicons/core-free-icons/UserAdd01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { chooseTheme, subscribeTheme } from "@outlayr/shared/theme";
import { Link } from "@tanstack/react-router";
import { Avatar } from "panelui-web/avatar";
import { Menu } from "panelui-web/menu";
import { Sheet } from "panelui-web/sheet";
import { Switch } from "panelui-web/switch";
import { Fragment, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { useIntlayer } from "react-intlayer";
import * as Skullet from "skullet";

import { SiteLink } from "@/components/site-link";
import { IconButton } from "@/components/ui/icon-button";
import { MenuContent } from "@/components/ui/menu-content";
import { SheetContent } from "@/components/ui/sheet-content";
import { useProfile } from "@/lib/account-state";
import { authClient } from "@/lib/auth-client";
import { announceSessionChange } from "@/lib/session";
import { forgetLedger } from "@/lib/unsent";

import { NoticeList, SettingsLink, UnreadChip, UnreadDot, useNotices } from "./notifications";
import { leaveSession } from "./status";

export async function signOut() {
    leaveSession();
    Skullet.forgetShapes();
    await authClient.signOut();
    announceSessionChange();
    await forgetLedger();
    window.location.assign("/login");
}

type AvatarStyle = CSSProperties & { "--avatar-color": string; "--avatar-size": string };

const avatarStyle = (size: number): AvatarStyle => ({
    "--avatar-color": "var(--color-app-tint)",
    "--avatar-size": `${size}px`,
});

const LINKS = [
    { icon: Plug01Icon, key: "connections", to: "/settings/connections" },
    { icon: Settings02Icon, key: "settings", to: "/settings" },
    { icon: Download04Icon, key: "exportData", to: "/settings/data" },
    { icon: UserAdd01Icon, key: "invite", to: "/settings/invite" },
] as const;

const SHEET_ROW =
    "hover:bg-app-hover flex h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm [&_svg]:size-5";

const AVATAR_INITIALS =
    "flex-none [&_[data-slot=avatar-face]>span]:bg-[color-mix(in_oklab,var(--avatar-color)_24%,var(--color-app-group))] [&_[data-slot=avatar-face]>span]:text-[color-mix(in_oklab,var(--avatar-color),var(--foreground)_40%)] [&_[data-slot=avatar-face]>span]:text-xs [&_[data-slot=avatar-face]>span]:tracking-normal [&_[data-slot=avatar-face]]:after:hidden";

const isDark = () => document.documentElement.dataset.theme === "dark";

const useDark = () => useSyncExternalStore(subscribeTheme, isDark, () => false);

function useIdentity() {
    const profile = useProfile();
    return { email: profile?.email, name: profile?.name || profile?.email || "" };
}

function VerifiedName({ name }: { name: string }) {
    return (
        <>
            <span className="truncate">{name}</span>
            <HugeiconsIcon className="text-app-tint shrink-0" icon={CheckmarkBadge01Icon} size={14} strokeWidth={1.5} />
        </>
    );
}

function CardAvatar({ name, size }: { name: string; size: number }) {
    const unread = useNotices().feed?.unread ?? 0;
    return (
        <span className="relative flex-none">
            <Avatar className={AVATAR_INITIALS} name={name} style={avatarStyle(size)} />
            {unread > 0 ? <UnreadDot /> : null}
        </span>
    );
}

/** Opening the panel moves the read mark, so it keeps the mark it opened with to show what was new. */
function useNoticesOpen() {
    const { feed, markSeen } = useNotices();
    const [opened, setOpened] = useState<{ seenAt: number | null; unread: number } | null>(null);
    return {
        close: () => setOpened(null),
        open: () => {
            setOpened({ seenAt: feed?.seenAt ?? null, unread: feed?.unread ?? 0 });
            markSeen();
        },
        opened,
        unread: feed?.unread ?? 0,
    };
}

function DarkModeItem() {
    const { account } = useIntlayer("dashboard");
    const dark = useDark();
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

export function UserMenu({ collapsed }: { collapsed: boolean }) {
    const { email, name } = useIdentity();
    const { account } = useIntlayer("dashboard");
    const { notifications } = useIntlayer("dashboard-shell");
    const card = useRef<HTMLButtonElement>(null);
    const panel = useNoticesOpen();
    const label =
        panel.unread > 0
            ? `${account.label.value}, ${notifications.unread({ count: panel.unread }).value}`
            : account.label.value;
    return (
        <>
            <Menu>
                <Menu.Trigger
                    aria-label={label}
                    ref={card}
                    className={`hover:bg-app-fill data-[popup-open]:bg-app-fill mt-auto flex items-center gap-2.5 rounded-xl text-left ${collapsed ? "justify-center p-1" : "p-2.5"}`}
                >
                    <CardAvatar name={name} size={34} />
                    {collapsed ? null : (
                        <>
                            <span className="min-w-0 flex-1">
                                <b className="text-app-label flex min-h-[18px] items-center gap-1.5 font-medium">
                                    <VerifiedName name={name} />
                                </b>
                                <small className="text-muted-foreground block min-h-4 truncate text-xs leading-4">
                                    {email}
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
                <MenuContent align="end" className="w-[300px]" side="right" sideOffset={25}>
                    <Menu.Item onClick={panel.open}>
                        <HugeiconsIcon icon={Notification03Icon} strokeWidth={2} />
                        {notifications.title}
                        <span className="ml-auto">
                            <UnreadChip count={panel.unread} />
                        </span>
                    </Menu.Item>
                    <Menu.Separator />
                    <DarkModeItem />
                    {LINKS.map((link) => (
                        <Fragment key={link.key}>
                            {link.key === "connections" || link.key === "invite" ? <Menu.Separator /> : null}
                            <Menu.Item render={<Link to={link.to} />}>
                                <HugeiconsIcon icon={link.icon} strokeWidth={2} />
                                {account[link.key]}
                            </Menu.Item>
                        </Fragment>
                    ))}
                    <Menu.Item onClick={signOut}>
                        <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} />
                        {account.signOut}
                    </Menu.Item>
                    <div className="text-muted-foreground text-app-label p-2">
                        {account.plan} · <SiteLink to="/terms">{account.terms}</SiteLink>
                    </div>
                </MenuContent>
            </Menu>
            <Popover.Root onOpenChange={(next) => (next ? undefined : panel.close())} open={panel.opened !== null}>
                <Popover.Portal>
                    <Popover.Positioner align="end" anchor={card} className="z-50" side="right" sideOffset={25}>
                        <Popover.Popup
                            className="app-shell ph-no-capture bg-app-fill border-app-strong rounded-app-xl flex max-h-(--available-height) w-100 flex-col overflow-hidden border shadow-(--shadow-app-popover) outline-none"
                            finalFocus={card}
                        >
                            <header className="h-app-header flex shrink-0 items-center gap-2 px-4">
                                <Popover.Title className="text-app-title font-semibold">
                                    {notifications.title}
                                </Popover.Title>
                                <UnreadChip count={panel.opened?.unread ?? 0} />
                            </header>
                            <div className="min-h-0 flex-1 overflow-y-auto">
                                <NoticeList onNavigate={panel.close} seenAt={panel.opened?.seenAt ?? null} />
                            </div>
                            <SettingsLink onNavigate={panel.close} />
                        </Popover.Popup>
                    </Popover.Positioner>
                </Popover.Portal>
            </Popover.Root>
        </>
    );
}

export function AccountSheet() {
    const { email, name } = useIdentity();
    const { account } = useIntlayer("dashboard");
    const { notifications } = useIntlayer("dashboard-shell");
    const dark = useDark();
    const [open, setOpen] = useState(false);
    const panel = useNoticesOpen();
    const close = () => {
        setOpen(false);
        panel.close();
    };
    return (
        <Sheet onOpenChange={(next) => (next ? setOpen(true) : close())} open={open} side="top">
            <Sheet.Trigger
                aria-label={account.label.value}
                className="mx-[5px] flex size-11 items-center justify-center rounded-full"
            >
                <CardAvatar name={name} size={32} />
            </Sheet.Trigger>
            <SheetContent>
                {panel.opened === null ? null : (
                    <>
                        <Sheet.Header className="flex-row items-center gap-2">
                            <IconButton
                                icon={ArrowLeft01Icon}
                                label={notifications.back.value}
                                onClick={panel.close}
                                size="sm"
                            />
                            <Sheet.Title className="text-app-title">{notifications.title}</Sheet.Title>
                            <UnreadChip count={panel.opened.unread} />
                        </Sheet.Header>
                        <Sheet.Body className="px-0">
                            <NoticeList onNavigate={close} seenAt={panel.opened.seenAt} />
                        </Sheet.Body>
                        <Sheet.Footer className="px-0 pt-0">
                            <SettingsLink onNavigate={close} />
                        </Sheet.Footer>
                    </>
                )}
                {panel.opened === null ? (
                    <>
                        <Sheet.Header className="flex-row items-center gap-3">
                            <Avatar className={AVATAR_INITIALS} name={name} style={avatarStyle(40)} />
                            <span className="min-w-0">
                                <Sheet.Title className="flex items-center gap-1.5 text-[15px]">
                                    <VerifiedName name={name} />
                                </Sheet.Title>
                                <Sheet.Description className="truncate">{email}</Sheet.Description>
                            </span>
                        </Sheet.Header>
                        <Sheet.Body className="divide-border flex flex-col divide-y px-4 [&>*]:py-1.5">
                            <label className={SHEET_ROW}>
                                <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} />
                                {account.darkMode}
                                <Switch
                                    checked={dark}
                                    className="ml-auto"
                                    onCheckedChange={() => chooseTheme(dark ? "light" : "dark")}
                                />
                            </label>
                            <button className={SHEET_ROW} onClick={panel.open} type="button">
                                <HugeiconsIcon icon={Notification03Icon} strokeWidth={2} />
                                {notifications.title}
                                <span className="ml-auto">
                                    <UnreadChip count={panel.unread} />
                                </span>
                            </button>
                            <nav className="flex flex-col">
                                {LINKS.map((link) => (
                                    <Link
                                        className={SHEET_ROW}
                                        key={link.key}
                                        onClick={() => setOpen(false)}
                                        to={link.to}
                                    >
                                        <HugeiconsIcon icon={link.icon} strokeWidth={2} />
                                        {account[link.key]}
                                    </Link>
                                ))}
                            </nav>
                            <button className={SHEET_ROW} onClick={signOut} type="button">
                                <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} />
                                {account.signOut}
                            </button>
                        </Sheet.Body>
                        <Sheet.Footer className="text-muted-foreground text-[13px] leading-[18px]">
                            <span>
                                {account.plan} · <SiteLink to="/terms">{account.terms}</SiteLink>
                            </span>
                        </Sheet.Footer>
                    </>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
