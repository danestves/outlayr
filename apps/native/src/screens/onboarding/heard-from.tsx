import AiChat02Icon from "@hugeicons-pro/core-stroke-rounded/AiChat02Icon";
import AppStoreIcon from "@hugeicons-pro/core-stroke-rounded/AppStoreIcon";
import InstagramIcon from "@hugeicons-pro/core-stroke-rounded/InstagramIcon";
import Linkedin01Icon from "@hugeicons-pro/core-stroke-rounded/Linkedin01Icon";
import MoreHorizontalIcon from "@hugeicons-pro/core-stroke-rounded/MoreHorizontalIcon";
import NewTwitterIcon from "@hugeicons-pro/core-stroke-rounded/NewTwitterIcon";
import PlayStoreIcon from "@hugeicons-pro/core-stroke-rounded/PlayStoreIcon";
import RedditIcon from "@hugeicons-pro/core-stroke-rounded/RedditIcon";
import Search01Icon from "@hugeicons-pro/core-stroke-rounded/Search01Icon";
import TiktokIcon from "@hugeicons-pro/core-stroke-rounded/TiktokIcon";
import UserGroupIcon from "@hugeicons-pro/core-stroke-rounded/UserGroupIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import { Stack } from "expo-router";
import { Input } from "panelui-native/components/input";
import { RadioGroup } from "panelui-native/components/radio-group";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { FirstRun } from "@/components/first-run";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { HEARD_FROM_DETAIL_MAX, heardFromOrder, heardFromProperties } from "@/domain/heard-from";
import type { HeardFromSource } from "@/domain/heard-from";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { posthog } from "@/lib/posthog";
import { useHardwareBack } from "@/screens/import/use-hardware-back";

const ICONS: Record<HeardFromSource, IconSvgElement> = {
    ai_assistant: AiChat02Icon,
    app_store: Platform.OS === "android" ? PlayStoreIcon : AppStoreIcon,
    friend: UserGroupIcon,
    instagram: InstagramIcon,
    linkedin: Linkedin01Icon,
    other: MoreHorizontalIcon,
    reddit_hn: RedditIcon,
    search: Search01Icon,
    tiktok: TiktokIcon,
    x: NewTwitterIcon,
};

const LABELS = {
    ai_assistant: "onboarding.heardFrom.source.ai_assistant",
    app_store: "onboarding.heardFrom.source.app_store",
    friend: "onboarding.heardFrom.source.friend",
    instagram: "onboarding.heardFrom.source.instagram",
    linkedin: "onboarding.heardFrom.source.linkedin",
    other: "onboarding.heardFrom.source.other",
    reddit_hn: "onboarding.heardFrom.source.reddit_hn",
    search: "onboarding.heardFrom.source.search",
    tiktok: "onboarding.heardFrom.source.tiktok",
    x: "onboarding.heardFrom.source.x",
} as const satisfies Record<HeardFromSource, TranslationKey>;

interface HeardFromProps {
    error: string | null;
    eyebrow: string;
    onDone: () => void;
}

export function HeardFrom({ error, eyebrow, onDone }: HeardFromProps) {
    const t = useTranslation();
    // SAFETY: both are declared in global.css for both schemes, so they always resolve.
    const [muted, vermilion] = useCSSVariable(["--color-fr-muted", "--color-fr-vermilion"]) as [string, string];
    const [order] = useState(() => heardFromOrder());
    const [picked, setPicked] = useState<HeardFromSource | null>(null);
    const [detail, setDetail] = useState("");
    const answeredRef = useRef(false);
    useHardwareBack(onDone);

    const answer = (source: HeardFromSource) => {
        if (!answeredRef.current) {
            answeredRef.current = true;
            posthog?.capture("heard_from_answered", heardFromProperties(source, detail));
        }
        onDone();
    };

    const choose = (value: string) => {
        const source = order.find((candidate) => candidate === value);
        if (source === undefined) {
            return;
        }
        setPicked(source);
        if (source !== "other") {
            answer(source);
        }
    };

    return (
        <KeyboardAvoidingView behavior="padding" className="flex-1">
            <Stack.Screen options={{ gestureEnabled: false, headerBackVisible: false }} />
            <FirstRun
                action={picked === "other" ? { label: t("common.done"), onPress: () => answer("other") } : undefined}
                centered
                error={error}
                eyebrow={eyebrow}
                skip={{ label: t("onboarding.heardFrom.skip"), onPress: onDone }}
                title={t("onboarding.heardFrom.title")}
            >
                <ScrollView
                    automaticallyAdjustKeyboardInsets
                    className="shrink grow-0"
                    keyboardShouldPersistTaps="handled"
                >
                    <RadioGroup className="gap-0" onValueChange={choose} value={picked ?? undefined} variant="card">
                        {order.map((source, index) => (
                            <RadioGroup.Item
                                className={cn(
                                    "border-fr-rule items-center rounded-none border-0 border-b bg-transparent px-0 py-3",
                                    index === 0 && "border-t"
                                )}
                                key={source}
                                value={source}
                            >
                                <View className="flex-row items-center gap-3.5">
                                    <HugeiconsIcon
                                        color={source === picked ? vermilion : muted}
                                        icon={ICONS[source]}
                                        size={20}
                                    />
                                    <View className="flex-1">
                                        <Text className="text-body text-fr-ink">{t(LABELS[source])}</Text>
                                        {source === "ai_assistant" ? (
                                            <Text className="text-footnote text-fr-muted">
                                                {t("onboarding.heardFrom.source.ai_assistant.hint")}
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>
                            </RadioGroup.Item>
                        ))}
                    </RadioGroup>
                    {picked === "other" ? (
                        <View className="border-fr-rule border-b py-2">
                            <Input
                                autoFocus
                                className="bg-fr-card text-fr-ink rounded-xl font-sans"
                                maxLength={HEARD_FROM_DETAIL_MAX}
                                onChangeText={setDetail}
                                onSubmitEditing={() => answer("other")}
                                placeholder={t("onboarding.heardFrom.detail")}
                                returnKeyType="done"
                                selectionColor={vermilion}
                                value={detail}
                            />
                        </View>
                    ) : null}
                </ScrollView>
            </FirstRun>
        </KeyboardAvoidingView>
    );
}
