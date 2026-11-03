import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { EmptyState } from "@/components/empty-state";
import { Bar, GhostAvatar, GhostPanel, GhostRow, Hairline, Slot } from "@/components/empty-state-parts";
import { Arrive } from "@/components/mark-motion";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { MARK_CEILING } from "@/theme/empty-state-ink";

const PANEL = MARK_CEILING.takeover;
const INSET = 14;

export function LogEmptyState() {
    const t = useTranslation();
    const router = useRouter();
    return (
        <EmptyState
            action={
                <Pressable
                    accessibilityRole="button"
                    className="bg-accent rounded-full px-7 py-3.5 active:opacity-80"
                    onPress={() => router.push("/transactions/create")}
                >
                    <Text className="font-sans-semibold text-accent-foreground text-body">{t("log.empty.action")}</Text>
                </Pressable>
            }
            body={t("log.empty.body")}
            mark={<LedgerWaiting />}
            tier="takeover"
            title={t("log.empty.title")}
        />
    );
}

function LedgerWaiting() {
    return (
        <GhostPanel
            style={{
                borderRadius: 18,
                paddingHorizontal: INSET,
                paddingVertical: 13,
            }}
            width={PANEL}
        >
            <View className="flex-row items-center justify-between pb-2.5">
                <Bar height={7} width={64} />
                <Bar height={7} width={36} />
            </View>
            <Hairline />
            <Slot
                height={44}
                radius={11}
                style={{
                    justifyContent: "center",
                    marginVertical: 9,
                    paddingHorizontal: 9,
                }}
                width={PANEL - INSET * 2}
            >
                <Arrive>
                    <View className="flex-row items-center">
                        <GhostAvatar size={24} />
                        <View style={{ gap: 4, marginLeft: 9 }}>
                            <Bar height={7} width={78} />
                            <Bar height={5} width={42} />
                        </View>
                    </View>
                </Arrive>
            </Slot>
            <Hairline opacity={0.6} />
            <GhostRow amountWidth={40} avatarSize={24} noteWidth={72} opacity={0.3} subWidth={38} />
        </GhostPanel>
    );
}
