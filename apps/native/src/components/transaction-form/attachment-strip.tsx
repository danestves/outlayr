import Image01Icon from "@hugeicons-pro/core-stroke-rounded/Image01Icon";
import Pdf01Icon from "@hugeicons-pro/core-stroke-rounded/Pdf01Icon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Pressable, ScrollView, View } from "react-native";

import { ActionMenu } from "@/components/action-menu";
import type { ActionMenuItem } from "@/components/action-menu";
import { Image } from "@/components/styled";
import { TapMenu } from "@/components/tap-menu";
import { Text } from "@/components/text";
import { attachmentKind, MAX_ATTACHMENTS } from "@/data/attachments-core";
import type { AttachmentDraft } from "@/data/attachments-core";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

const TILE = 66;
const GLYPH = 24;

interface AttachmentStripProps {
    attachments: readonly AttachmentDraft[];
    menu: readonly ActionMenuItem[];
    onPreview: (index: number) => void;
    onRemove: (index: number) => void;
}

function AttachmentTile({
    draft,
    onPreview,
    onRemove,
}: {
    draft: AttachmentDraft;
    onPreview: () => void;
    onRemove: () => void;
}) {
    const t = useTranslation();
    const colors = useColors();
    const pdf = attachmentKind(draft) === "pdf";
    const uri = draft.imageUri;
    const pending = uri === null;

    let label = t("transaction.attachments.photo");
    if (pending) {
        label = t("transaction.attachments.pending");
    } else if (pdf) {
        label = draft.name ?? "PDF";
    }

    return (
        <ActionMenu
            items={[
                {
                    destructive: true,
                    icon: "trash",
                    id: "remove",
                    label: t("transaction.attachments.remove"),
                    onPress: onRemove,
                },
            ]}
            style={{ width: TILE }}
        >
            <Pressable
                accessibilityLabel={label}
                accessibilityRole="button"
                className="bg-surface-secondary items-center justify-center overflow-hidden rounded-xl active:opacity-60"
                disabled={pending}
                onPress={onPreview}
                style={{ height: TILE, width: TILE }}
            >
                {uri !== null && !pdf ? (
                    <Image className="size-full" contentFit="cover" source={{ uri }} />
                ) : (
                    <View className="items-center gap-1 px-1.5">
                        <HugeiconsIcon color={colors.muted} icon={pdf ? Pdf01Icon : Image01Icon} size={GLYPH} />
                        {pdf && draft.name !== null ? (
                            <Text className="text-muted text-[10px] leading-[13px]" numberOfLines={1}>
                                {draft.name}
                            </Text>
                        ) : null}
                    </View>
                )}
            </Pressable>
        </ActionMenu>
    );
}

export function AttachmentStrip({ attachments, menu, onPreview, onRemove }: AttachmentStripProps) {
    const t = useTranslation();
    const colors = useColors();

    return (
        <ScrollView
            contentContainerClassName="gap-2"
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
        >
            {attachments.map((draft, index) => (
                <AttachmentTile
                    draft={draft}
                    key={draft.id ?? draft.imageUri ?? index}
                    onPreview={() => onPreview(index)}
                    onRemove={() => onRemove(index)}
                />
            ))}
            {attachments.length < MAX_ATTACHMENTS ? (
                <TapMenu accessibilityLabel={t("transaction.attachments.add")} items={menu}>
                    <View
                        accessibilityLabel={t("transaction.attachments.add")}
                        accessibilityRole="button"
                        accessible
                        className="border-separator items-center justify-center rounded-xl border border-dashed"
                        style={{ height: TILE, width: TILE }}
                    >
                        <HugeiconsIcon color={colors.muted} icon={PlusSignIcon} size={GLYPH} />
                    </View>
                </TapMenu>
            ) : null}
        </ScrollView>
    );
}
