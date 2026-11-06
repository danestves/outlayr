import Logout from "@hugeicons/core-free-icons/Logout01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { useIntlayer } from "react-intlayer";
import * as Skullet from "skullet";

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

const INITIALS_SHOWN = 2;

const initialsOf = (name: string) =>
    name
        .split(/[\s@._-]+/)
        .filter((word) => word !== "")
        .slice(0, INITIALS_SHOWN)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

export function AccountMenu() {
    const { data: session } = authClient.useSession();
    const { account } = useIntlayer("dashboard");
    const who = session?.user.name || session?.user.email || "";
    return (
        <Menu>
            <Menu.Trigger
                render={
                    <Button
                        aria-label={account.label.value}
                        className="text-muted-foreground size-9 rounded-full text-xs font-medium"
                        size="icon"
                        variant="secondary"
                    />
                }
            >
                {initialsOf(who)}
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture" side="right">
                <Menu.Item onClick={signOut}>
                    <HugeiconsIcon className="size-4" icon={Logout} />
                    {account.signOut}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}
