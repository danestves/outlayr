import { MenuView } from "@expo/ui/community/menu";
import type { MenuState } from "@expo/ui/community/menu";
import ArrowDown01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Cause from "effect/Cause";
import { Stack, useRouter } from "expo-router";
import { useRef } from "react";
import { View } from "react-native";

import { AccountTile } from "@/components/account-tile";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useProfiles } from "@/data/profiles";
import type { Profile } from "@/data/profiles-core";
import { useOpenPaywall } from "@/hooks/use-pro-gate";
import { useProLocked } from "@/hooks/use-pro-locked";
import { useProfileSharingEnabled } from "@/hooks/use-profile-sharing";
import { useTranslation } from "@/i18n/context";
import { activeProfileId } from "@/lib/active-profile";
import { useAuthSession } from "@/lib/auth-session";
import { useJoinedProfiles } from "@/lib/joined-profiles";
import type { JoinedProfile } from "@/lib/joined-profiles";
import { notifyFailure } from "@/lib/notify";
import { switchProfileCommand } from "@/state/profiles-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";
import { useTourTarget } from "@/tour/use-tour-target";

const PERSONAL_ACTION = "profiles.personal";
const NEW_ACTION = "profiles.new";
const EDIT_ACTION = "profiles.edit";
const SHARE_ACTION = "profiles.share";
const MEMBERS_ACTION = "profiles.members";
const TILE_SIZE = 24;

const menuState = (on: boolean): MenuState => (on ? "on" : "off");

function chipAccount(active: Profile | undefined, joined: JoinedProfile | undefined) {
    if (active) {
        return { ...active, kind: "asset" as const };
    }
    if (joined) {
        return { ...joined.look, imageUri: null, kind: "asset" as const };
    }
    return PERSONAL_IDENTITY;
}

const PERSONAL_IDENTITY = {
    customColor: null,
    emoji: null,
    icon: "Home01",
    imageColor: null,
    imageUri: null,
    kind: "asset",
    name: "",
} as const;

function ProfileChip() {
    const db = useDatabase();
    const t = useTranslation();
    const colors = useColors();
    const router = useRouter();
    const { accountId } = useAuthSession();
    const locked = useProLocked();
    const openPaywall = useOpenPaywall();
    const chip = useTourTarget("log.profiles", "half");
    // A switch reloads the app, so only a failure clears this.
    const switching = useRef(false);
    const switchProfile = useAtomAction(switchProfileCommand, {
        onFailure: (cause) => {
            switching.current = false;
            console.warn("[outlayr] profile switch failed", Cause.pretty(cause));
            notifyFailure({ title: t("profiles.error.switchFailed") });
        },
    });
    const profiles = useProfiles();
    const joined = useJoinedProfiles();
    const sharing = useProfileSharingEnabled();
    const activeId = activeProfileId();
    const active = profiles.find((profile) => profile.id === activeId);
    const joinedEntry = joined.find((profile) => profile.profileId === activeId);
    const name = active?.name ?? joinedEntry?.look.name ?? t("profiles.personal");
    const tile = chipAccount(active, joinedEntry);

    return (
        <MenuView
            actions={[
                {
                    displayInline: true,
                    id: "profiles.list",
                    subactions: [
                        {
                            id: PERSONAL_ACTION,
                            state: menuState(activeId === undefined),
                            title: t("profiles.personal"),
                        },
                        ...profiles.map((profile) => ({
                            id: profile.id,
                            state: menuState(profile.id === activeId),
                            title: profile.name,
                        })),
                        ...joined.map((profile) => ({
                            id: profile.profileId,
                            image: "person.2" as const,
                            state: menuState(profile.profileId === activeId),
                            title: profile.look.name,
                        })),
                    ],
                    title: t("profiles.title"),
                },
                ...(sharing && active
                    ? [{ id: SHARE_ACTION, image: "square.and.arrow.up" as const, title: t("sharing.action.share") }]
                    : []),
                ...(sharing && joinedEntry
                    ? [{ id: MEMBERS_ACTION, image: "person.2" as const, title: t("sharing.action.members") }]
                    : []),
                { id: NEW_ACTION, image: "plus" as const, title: t("profiles.new") },
                ...(active ? [{ id: EDIT_ACTION, image: "pencil" as const, title: t("profiles.edit") }] : []),
            ]}
            onPressAction={({ nativeEvent }) => {
                const picked = nativeEvent.event;
                if (picked === SHARE_ACTION || picked === MEMBERS_ACTION) {
                    router.push("/profiles/members");
                    return;
                }
                if (picked === EDIT_ACTION) {
                    router.push("/profiles/edit");
                    return;
                }
                if (picked === NEW_ACTION) {
                    if (locked) {
                        openPaywall("profiles");
                        return;
                    }
                    router.push("/profiles/new");
                    return;
                }
                const target = picked === PERSONAL_ACTION ? undefined : picked;
                if (target === activeId) {
                    return;
                }
                if (target !== undefined && locked) {
                    openPaywall("profiles");
                    return;
                }
                if (switching.current) {
                    return;
                }
                switching.current = true;
                switchProfile({ accountId, from: db, profileId: target });
            }}
            shouldOpenOnLongPress={false}
        >
            <View
                accessibilityHint={t("profiles.a11y.switch")}
                accessibilityLabel={name}
                accessibilityRole="button"
                className="min-h-11 flex-row items-center px-2"
                ref={chip}
            >
                <AccountTile account={tile} size={TILE_SIZE} />
                <Text className="text-foreground font-sans-semibold mr-1 ml-2 shrink text-[17px]" numberOfLines={1}>
                    {name}
                </Text>
                <HugeiconsIcon color={colors.muted} icon={ArrowDown01Icon} size={14} strokeWidth={2} />
            </View>
        </MenuView>
    );
}

const renderChip = () => <ProfileChip />;

export function ProfileTitle() {
    return <Stack.Screen options={{ headerTitle: renderChip }} />;
}
