import Mail01Icon from "@hugeicons/core-free-icons/Mail01Icon";
import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";
import { Skeleton } from "skullet/react";

import { useProfile } from "@/lib/account-state";

import { EmailDialog, Tile } from "./account";
import { Row, SectionHead, SettingsCard } from "./parts";

export function Email() {
    const copy = useIntlayer("dashboard-email");
    const { account, sections } = useIntlayer("dashboard-settings");
    const user = useProfile();
    const [changing, setChanging] = useState(false);
    const kinds = [
        { key: "signIn", label: copy.signIn },
        { key: "welcome", label: copy.welcome },
        { key: "billing", label: copy.billing },
        { key: "policy", label: copy.policy },
    ];
    return (
        <>
            <SectionHead title={sections.email} />
            <div className="@container flex flex-col gap-4 pb-8">
                <div className="grid items-start gap-4 @4xl:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-4">
                        <SettingsCard title={copy.address}>
                            <Skeleton loading={user === undefined}>
                                <Row
                                    label={<span className="ph-no-capture break-all">{user?.email}</span>}
                                    leading={
                                        <Tile>
                                            <HugeiconsIcon icon={Mail01Icon} size={16} />
                                        </Tile>
                                    }
                                >
                                    {user?.emailVerified ? (
                                        <Badge dot variant="success">
                                            {account.verified}
                                        </Badge>
                                    ) : null}
                                    <Button onClick={() => setChanging(true)} size="sm" variant="outline">
                                        {account.change}
                                    </Button>
                                </Row>
                            </Skeleton>
                        </SettingsCard>
                        <SettingsCard title={copy.alwaysSent}>
                            {kinds.map(({ key, label }) => (
                                <Row key={key} label={label}>
                                    <HugeiconsIcon
                                        className="text-muted-foreground"
                                        icon={SquareLock02Icon}
                                        size={16}
                                    />
                                </Row>
                            ))}
                        </SettingsCard>
                    </div>
                </div>
            </div>
            <EmailDialog onClose={() => setChanging(false)} open={changing} />
        </>
    );
}
