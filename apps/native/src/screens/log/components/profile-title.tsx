import { MenuView } from "@expo/ui/community/menu";
import type { MenuState } from "@expo/ui/community/menu";
import ArrowDown01Icon from "@hugeicons-pro/core-solid-rounded/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { AccountTile } from "@/components/account-tile";
import { Text } from "@/components/text";
import { useProfiles } from "@/data/profiles";
import { useOpenPaywall } from "@/hooks/use-pro-gate";
import { useProLocked } from "@/hooks/use-pro-locked";
import { useTranslation } from "@/i18n/context";
import { activeProfileId } from "@/lib/active-profile";
import { switchProfileCommand } from "@/state/profiles-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

const PERSONAL_ACTION = "profiles.personal";
const NEW_ACTION = "profiles.new";
const EDIT_ACTION = "profiles.edit";
const TILE_SIZE = 30;

const menuState = (on: boolean): MenuState => (on ? "on" : "off");

const PERSONAL_IDENTITY = {
    customColor: null,
    emoji: null,
    icon: "Home01",
    imageColor: null,
    imageUri: null,
    kind: "asset",
    name: "",
} as const;

export function ProfileTitle() {
    const t = useTranslation();
    const colors = useColors();
    const router = useRouter();
    const locked = useProLocked();
    const openPaywall = useOpenPaywall();
    const switchProfile = useAtomAction(switchProfileCommand);
    const profiles = useProfiles();
    const activeId = activeProfileId();
    const active = profiles.find((profile) => profile.id === activeId);
    const name = active?.name ?? t("profiles.personal");

    return (
        <MenuView
            actions={[
                {
                    displayInline: true,
                    id: "profiles.list",
                    subactions: [
                        { id: PERSONAL_ACTION, state: menuState(!active), title: t("profiles.personal") },
                        ...profiles.map((profile) => ({
                            id: profile.id,
                            state: menuState(profile.id === activeId),
                            title: profile.name,
                        })),
                    ],
                    title: t("profiles.title"),
                },
                { id: NEW_ACTION, image: "plus" as const, title: t("profiles.new") },
                ...(active ? [{ id: EDIT_ACTION, image: "pencil" as const, title: t("profiles.edit") }] : []),
            ]}
            onPressAction={({ nativeEvent }) => {
                const picked = nativeEvent.event;
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
                switchProfile(target);
            }}
            shouldOpenOnLongPress={false}
        >
            <View
                accessibilityHint={t("profiles.a11y.switch")}
                accessibilityLabel={name}
                accessibilityRole="button"
                className="flex-row items-center gap-2.5 self-start pt-1 pb-3"
            >
                <AccountTile account={active ? { ...active, kind: "asset" } : PERSONAL_IDENTITY} size={TILE_SIZE} />
                <Text
                    className="text-foreground font-sans-bold shrink"
                    numberOfLines={1}
                    style={{ fontSize: 30, lineHeight: 36 }}
                >
                    {name}
                </Text>
                <HugeiconsIcon color={colors.muted} icon={ArrowDown01Icon} size={16} />
            </View>
        </MenuView>
    );
}
