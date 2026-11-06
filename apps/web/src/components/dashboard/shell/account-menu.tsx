import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { useIntlayer } from "react-intlayer";
import * as Skullet from "skullet";

import { Icon } from "@/components/icon";
import { authClient } from "@/lib/auth-client";
import { forgetLedger } from "@/lib/ledger-cache";

export async function signOut() {
    Skullet.forgetShapes();
    await forgetLedger();
    await authClient.signOut();
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
                        className="text-muted-foreground size-9 rounded-full text-[11px] font-semibold"
                        size="icon"
                        variant="secondary"
                    />
                }
            >
                {initialsOf(who)}
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture" side="right">
                <Menu.Item onClick={signOut}>
                    <Icon name="sign-out" />
                    {account.signOut}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}
