import { BottomSheetFlatList, BottomSheetModal, BottomSheetTextInput } from "@expo/ui/community/bottom-sheet";
import { useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { Pressable, View } from "react-native";

import type { TagRow } from "@/data/tags-core";
import { findTagByName, isUsableTagName, normalizeTagName } from "@/domain/tags";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useTranslation } from "@/i18n/context";
import { MARK_CEILING } from "@/theme/empty-state-ink";
import { useColors } from "@/theme/use-colors";

import { AppSymbol } from "./app-symbol";
import { EmptyState } from "./empty-state";
import { Slot } from "./empty-state-parts";
import { SEARCH_FIELD } from "./search-field-style";
import { SheetGestureRoot } from "./sheet-gesture-root";
import { Text } from "./text";
import { cn } from "./tw";

function TagSlot() {
    const height = 22;
    return <Slot height={height} radius={height / 2} width={MARK_CEILING.insetRow} />;
}

interface TagPickerSheetProps {
    onCreate: (name: string) => Promise<string | null>;
    onToggle: (tagId: string) => void;
    pendingTagNames?: readonly string[];
    ref?: Ref<BottomSheetModal>;
    selected: readonly string[];
    tags: readonly TagRow[];
}

const NO_PENDING_TAG_NAMES: string[] = [];

function CreateTagRow({ name, onPress }: { name: string; onPress: () => void }) {
    const colors = useColors();
    const t = useTranslation();
    return (
        <Pressable
            accessibilityRole="button"
            className="mx-5 mb-2 flex-row items-center gap-2 py-3 active:opacity-60"
            onPress={onPress}
        >
            <AppSymbol name="plus.circle.fill" size={18} tintColor={colors.tint} type="monochrome" />
            <Text className="font-sans-medium text-body text-foreground">{t("transaction.tags.create", { name })}</Text>
        </Pressable>
    );
}

export function TagPickerSheet({
    tags,
    selected,
    pendingTagNames = NO_PENDING_TAG_NAMES,
    onToggle,
    onCreate,
    ref,
}: TagPickerSheetProps) {
    const colors = useColors();
    const sheetBackground = { backgroundColor: useSheetSurface() };
    const t = useTranslation();
    const [query, setQuery] = useState("");

    const trimmed = normalizeTagName(query);
    const results = useMemo(() => {
        if (trimmed === "") {
            return tags;
        }
        const needle = trimmed.toLocaleLowerCase();
        return tags.filter((tag) => tag.name.toLocaleLowerCase().includes(needle));
    }, [tags, trimmed]);

    // Only when nothing answers to the name, so the row cannot mint a near-duplicate of a tag one line below.
    const canCreate = isUsableTagName(query) && findTagByName(tags, trimmed) === null;

    const pendingToOffer = useMemo(
        () =>
            pendingTagNames.filter(
                (name) =>
                    isUsableTagName(name) && normalizeTagName(name) !== trimmed && findTagByName(tags, name) === null
            ),
        [pendingTagNames, tags, trimmed]
    );

    // `canCreate` only changes once the insert commits, so without this a second tap reruns `ensureTag`'s
    // check-then-insert before the first row is visible to it.
    const creating = useRef(false);
    const createTag = (name: string) => {
        if (creating.current) {
            return;
        }
        creating.current = true;
        onCreate(name)
            .then((id) => {
                if (id) {
                    setQuery("");
                }
            })
            .catch((error) => {
                console.error("Failed to create the tag", error);
            })
            .finally(() => {
                creating.current = false;
            });
    };

    return (
        <BottomSheetModal
            backgroundStyle={sheetBackground}
            enableDynamicSizing={false}
            enablePanDownToClose
            ref={ref}
            snapPoints={["55%", "100%"]}
        >
            <SheetGestureRoot fill>
                <View className="flex-1">
                    <View className="items-center px-5 pt-3 pb-3">
                        <Text className="font-sans-semibold text-foreground text-headline">
                            {t("transaction.tags.title")}
                        </Text>
                    </View>

                    <View className="px-5 pb-2">
                        <View className="bg-surface flex-row items-center gap-2 rounded-full px-4 py-3">
                            <AppSymbol
                                name="magnifyingglass"
                                size={16}
                                tintColor={colors.muted}
                                type="monochrome"
                                weight="semibold"
                            />
                            <BottomSheetTextInput
                                autoCapitalize="none"
                                autoCorrect={false}
                                onChangeText={setQuery}
                                placeholder={t("transaction.tags.searchPlaceholder")}
                                placeholderTextColor={colors.muted}
                                style={[SEARCH_FIELD, { color: colors.foreground }]}
                                value={query}
                            />
                        </View>
                    </View>

                    {canCreate ? <CreateTagRow name={trimmed} onPress={() => createTag(trimmed)} /> : null}

                    {pendingToOffer.map((name) => (
                        <CreateTagRow key={name} name={name} onPress={() => createTag(normalizeTagName(name))} />
                    ))}

                    <BottomSheetFlatList
                        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 20 }}
                        data={results}
                        keyboardDismissMode="on-drag"
                        keyboardShouldPersistTaps="handled"
                        keyExtractor={(tag: TagRow) => tag.id}
                        ListEmptyComponent={
                            canCreate || pendingToOffer.length > 0 ? undefined : (
                                <EmptyState body={t("transaction.tags.empty")} mark={<TagSlot />} tier="insetRow" />
                            )
                        }
                        renderItem={({ item }: { item: TagRow }) => {
                            const on = selected.includes(item.id);
                            return (
                                <Pressable
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: on }}
                                    className="border-border flex-row items-center gap-3 border-b py-3.5 active:opacity-60"
                                    onPress={() => onToggle(item.id)}
                                >
                                    <AppSymbol
                                        name={on ? "checkmark.circle.fill" : "circle"}
                                        size={20}
                                        tintColor={on ? colors.tint : colors.muted}
                                        type="monochrome"
                                    />
                                    <Text className={cn("text-body flex-1", on ? "text-foreground" : "text-muted")}>
                                        {item.name}
                                    </Text>
                                </Pressable>
                            );
                        }}
                    />
                </View>
            </SheetGestureRoot>
        </BottomSheetModal>
    );
}
