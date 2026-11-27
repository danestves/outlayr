import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import Settings02Icon from "@hugeicons/core-free-icons/Settings02Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useMatch, useNavigate } from "@tanstack/react-router";
import { Menu } from "panelui-web/menu";
import { useNavRail } from "panelui-web/nav-rail";
import { useToast } from "panelui-web/toast";
import { useMemo, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { MenuContent } from "@/components/ui/menu-content";
import { planQuery } from "@/lib/account-state";
import { HELD_STATES } from "@/lib/billing";
import { activeProfileOf, profileLook, profilesOf, profilesQuery } from "@/lib/profile-registry";
import { switchToProfile } from "@/lib/profile-switch";
import { cn } from "@/lib/utils";

import { ProfileEditor } from "./editor";
import { PERSONAL_LOOK, ProfileTile } from "./tile";

const proState = (state: string) => HELD_STATES.has(state) || state === "granted";

export function ProfileSwitcher() {
    const copy = useIntlayer("profiles");
    const loaded = useMatch({ from: "/_account/_app", select: (match) => match.loaderData, shouldThrow: false });
    const profileId = loaded?.profileId ?? null;
    const registry = useQuery(profilesQuery);
    const profiles = useMemo(() => profilesOf(registry.data), [registry.data]);
    const active = activeProfileOf(profiles, profileId);
    const plan = useQuery(planQuery);
    const navigate = useNavigate();
    const toast = useToast();
    const { collapsed } = useNavRail();
    const [creating, setCreating] = useState(false);
    const name = active?.name ?? copy.personal.value;
    const look = active ? profileLook(active) : PERSONAL_LOOK;

    const switchTo = async (next: string | null) => {
        if (next === profileId) {
            return;
        }
        try {
            await switchToProfile(next);
        } catch {
            toast.add({ title: copy.switchFailed.value, type: "destructive" });
        }
    };

    const newProfile = () => {
        if (plan.data != null && !proState(plan.data.state)) {
            navigate({ search: { reason: "profiles" }, to: "/settings/plan" }).catch(() => undefined);
            return;
        }
        setCreating(true);
    };

    return (
        <>
            <Menu>
                <Menu.Trigger
                    aria-label={`${copy.a11ySwitch.value}: ${name}`}
                    className={cn(
                        "group/brand hover:bg-foreground/[0.04] focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-1.5 py-1 text-start transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-inset",
                        collapsed && "flex-none justify-center gap-0 px-0"
                    )}
                >
                    <ProfileTile look={look} size="lg" />
                    {collapsed ? null : (
                        <>
                            <span className="max-w-40 min-w-0 flex-1 truncate text-sm font-semibold tracking-[-0.01em]">
                                {name}
                            </span>
                            <HugeiconsIcon
                                className="text-muted-foreground shrink-0"
                                icon={ArrowDown01Icon}
                                size={14}
                                strokeWidth={2}
                            />
                        </>
                    )}
                </Menu.Trigger>
                <MenuContent align="start" className="w-64" side="right" sideOffset={6}>
                    <Menu.Group>
                        <Menu.GroupLabel>{copy.title}</Menu.GroupLabel>
                        <Menu.Item onClick={() => switchTo(null).catch(() => undefined)}>
                            <ProfileTile look={PERSONAL_LOOK} size="sm" />
                            <span className="min-w-0 flex-1 truncate">{copy.personal}</span>
                            {profileId === null ? <HugeiconsIcon icon={Tick02Icon} size={15} /> : null}
                        </Menu.Item>
                        {profiles.map((profile) => (
                            <Menu.Item key={profile.id} onClick={() => switchTo(profile.id).catch(() => undefined)}>
                                <ProfileTile look={profileLook(profile)} size="sm" />
                                <span className="min-w-0 flex-1 truncate">{profile.name}</span>
                                {profile.id === profileId ? <HugeiconsIcon icon={Tick02Icon} size={15} /> : null}
                            </Menu.Item>
                        ))}
                    </Menu.Group>
                    <Menu.Separator />
                    <Menu.Item onClick={newProfile}>
                        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
                        {copy.newProfile}
                    </Menu.Item>
                    <Menu.Item onClick={() => navigate({ to: "/settings/profile" }).catch(() => undefined)}>
                        <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
                        {copy.profileSettings}
                    </Menu.Item>
                </MenuContent>
            </Menu>
            {creating ? (
                <ProfileEditor
                    key="new"
                    onClose={() => setCreating(false)}
                    onCreated={(id) => switchTo(id).catch(() => undefined)}
                    open
                    profiles={profiles}
                    target={null}
                />
            ) : null}
        </>
    );
}
