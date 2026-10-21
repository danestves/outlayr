import { SegmentedButton, SingleChoiceSegmentedButtonRow, Text as ComposeText } from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import CancelCircleIcon from "@hugeicons-pro/core-solid-rounded/CancelCircleIcon";
import Image01Icon from "@hugeicons-pro/core-stroke-rounded/Image01Icon";
import Search01Icon from "@hugeicons-pro/core-stroke-rounded/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Image } from "expo-image";
import { launchImageLibraryAsync } from "expo-image-picker";
import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FlatList, Pressable, ScrollView, useWindowDimensions, View } from "react-native";

import {
    adoptPickedPhoto,
    IDENTITY_TAB_LABEL,
    initialIdentityTab,
    pickedPhotoUri,
    TRANSACTION_TABS,
    withEmoji,
    withIcon,
} from "@/components/identity-picker-shared";
import type { IdentityPickerContentProps, IdentityTab } from "@/components/identity-picker-shared";
import {
    ColorSwatch,
    SYMBOL_COLUMNS,
    SYMBOL_GAP,
    SYMBOL_MARGIN,
    SymbolEmojiCell,
    SymbolIconCell,
    symbolCellSize,
} from "@/components/identity-symbol-cells";
import { MaterialHost } from "@/components/material-host";
import { SheetHeader } from "@/components/sheet-header";
import { Text, TextInput } from "@/components/text";
import { CATEGORY_PALETTE } from "@/data/categories-core";
import { CATEGORY_EMOJI_GROUPS, CATEGORY_ICON_GROUPS, iconKeysMatching } from "@/domain/category-icon-catalog";
import type { TranslateFn } from "@/i18n/context";
import { useTranslation } from "@/i18n/context";
import { launchPick } from "@/lib/pending-pick";
import { useHaptics } from "@/lib/use-haptics";
import { SANS_BY_WEIGHT } from "@/theme/body-fonts";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

export { CATEGORY_TABS, TRANSACTION_TABS } from "@/components/identity-picker-shared";

/** App-icon squircle for the photo well (radius ≈ 0.226 · size, matching the hero). */
const PHOTO_WELL = 132;
const PHOTO_WELL_RADIUS = 30;
const SEARCH_HEIGHT = 48;
const PRESSED_ALPHA = 0.1;
const MIN_TARGET = 48;
/** What a 40dp swatch needs on each side to reach `MIN_TARGET`. */
const SWATCH_SLOP = 4;
const NO_USED_COLORS: string[] = [];

type GridRow =
    | { key: string; kind: "header"; title: string }
    | { key: string; kind: "cells"; items: readonly string[] };

function chunk<T>(items: readonly T[], size: number): T[][] {
    const rows: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        rows.push(items.slice(index, index + size));
    }
    return rows;
}

function gridRows(groups: readonly { title: string; items: readonly string[] }[]): GridRow[] {
    return groups.flatMap((group) => [
        { key: `h:${group.title}`, kind: "header" as const, title: group.title },
        ...chunk(group.items, SYMBOL_COLUMNS).map((items, index) => ({
            items,
            key: `${group.title}:${index}`,
            kind: "cells" as const,
        })),
    ]);
}

function glyphRows(tab: IdentityTab, query: string, t: TranslateFn): GridRow[] {
    if (tab === "emoji") {
        return gridRows(CATEGORY_EMOJI_GROUPS.map((group) => ({ items: group.emoji, title: t(group.titleKey) })));
    }
    if (query.trim() !== "") {
        return chunk(iconKeysMatching(query), SYMBOL_COLUMNS).map((items, index) => ({
            items,
            key: `q:${index}`,
            kind: "cells" as const,
        }));
    }
    return gridRows(CATEGORY_ICON_GROUPS.map((group) => ({ items: group.keys, title: t(group.titleKey) })));
}

/** Picks apply as they are made, so the header's close button is the Done. */
export function IdentityPickerHost({
    value,
    onChange,
    tabs = TRANSACTION_TABS,
    tint,
    usedColors = NO_USED_COLORS,
    showsColorRail = true,
    onDone,
}: IdentityPickerContentProps) {
    const { width } = useWindowDimensions();
    const t = useTranslation();
    const m3 = useMaterialColors();
    const haptics = useHaptics();
    const cell = symbolCellSize(width);
    const [tab, setTab] = useState<IdentityTab>(() => initialIdentityTab(value, tabs));
    const [query, setQuery] = useState("");
    const [photoFailed, setPhotoFailed] = useState(false);
    const glyphTint = tint ?? value.color ?? CATEGORY_PALETTE[0];

    const pickColor = (color: string) => {
        haptics("selection");
        onChange({ ...value, color });
    };
    const pickGlyph = (item: string) => {
        haptics("selection");
        onChange(tab === "emoji" ? withEmoji(value, item) : withIcon(value, item));
    };

    const pickFromLibrary = async () => {
        const picked = pickedPhotoUri(
            await launchPick("identity-picker", () =>
                launchImageLibraryAsync({
                    allowsEditing: true,
                    aspect: [1, 1],
                    mediaTypes: ["images"],
                    quality: 0.9,
                })
            )
        );
        if (picked != null) {
            onChange(await adoptPickedPhoto(value, picked));
        }
    };

    // A rejected launch (revoked permission, host torn down) looks like a missed tap, so the prompt says so.
    const picking = useRef(false);
    const pickPhoto = () => {
        if (picking.current) {
            return;
        }
        picking.current = true;
        setPhotoFailed(false);
        pickFromLibrary()
            .catch((cause: unknown) => {
                console.error("Failed to pick a photo", cause);
                setPhotoFailed(true);
            })
            .finally(() => {
                picking.current = false;
            });
    };

    const rows = useMemo(() => (tab === "photo" ? [] : glyphRows(tab, query, t)), [tab, query, t]);
    // Glyph cells shrink below 48dp on narrow phones; the slop restores the target.
    const cellSlop = Math.max(0, (MIN_TARGET - cell) / 2);

    let panel: ReactNode;
    if (tab === "photo") {
        panel = (
            <PhotoPanel
                failed={photoFailed}
                onColorChange={(color) => {
                    haptics("selection");
                    onChange({ ...value, photoColor: color });
                }}
                onPick={pickPhoto}
                photoColor={value.photoColor}
                uri={value.photoUri}
            />
        );
    } else {
        const selected = tab === "emoji" ? value.emoji : value.icon;
        panel = (
            <FlatList
                ListEmptyComponent={
                    <Text className="text-caption pt-16 text-center font-sans" style={{ color: m3.onSurfaceVariant }}>
                        {t("transaction.identity.noIcons")}
                    </Text>
                }
                // Dragging the glyphs is the only way to put the search keyboard away.
                contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: SYMBOL_MARGIN }}
                data={rows}
                initialNumToRender={12}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) =>
                    item.kind === "header" ? (
                        <Text className="font-sans-medium text-caption py-2" style={{ color: m3.onSurfaceVariant }}>
                            {item.title}
                        </Text>
                    ) : (
                        <View className="flex-row" style={{ gap: SYMBOL_GAP, paddingBottom: SYMBOL_GAP }}>
                            {item.items.map((glyph) =>
                                tab === "emoji" ? (
                                    <SymbolEmojiCell
                                        emoji={glyph}
                                        hitSlop={cellSlop}
                                        key={glyph}
                                        onPress={() => pickGlyph(glyph)}
                                        selected={glyph === selected}
                                        size={cell}
                                        tint={glyphTint}
                                    />
                                ) : (
                                    <SymbolIconCell
                                        hitSlop={cellSlop}
                                        iconKey={glyph}
                                        key={glyph}
                                        onPress={() => pickGlyph(glyph)}
                                        selected={glyph === selected}
                                        size={cell}
                                        tint={glyphTint}
                                    />
                                )
                            )}
                        </View>
                    )
                }
                showsVerticalScrollIndicator={false}
            />
        );
    }

    return (
        <View className="bg-m3-surface-container-low flex-1">
            <SheetHeader
                onClose={onDone}
                title={t(tabs.includes("photo") ? "transaction.identity.hero.logo" : "transaction.identity.hero.icon")}
            />

            <MaterialHost matchContents={{ vertical: true }} style={{ marginBottom: 12, marginHorizontal: 16 }}>
                <SingleChoiceSegmentedButtonRow modifiers={[fillMaxWidth()]}>
                    {tabs.map((option) => (
                        <SegmentedButton key={option} onClick={() => setTab(option)} selected={tab === option}>
                            <SegmentedButton.Label>
                                <ComposeText style={{ fontFamily: SANS_BY_WEIGHT[400] }}>
                                    {t(IDENTITY_TAB_LABEL[option])}
                                </ComposeText>
                            </SegmentedButton.Label>
                        </SegmentedButton>
                    ))}
                </SingleChoiceSegmentedButtonRow>
            </MaterialHost>

            {/* The emoji palette has no keywords to search against. */}
            {tab === "icons" ? <SearchField onChange={setQuery} query={query} /> : null}

            {/* The photo tab has its own colour control. */}
            {showsColorRail && tab !== "photo" ? (
                <SwatchRail onSelect={pickColor} selected={value.color} usedColors={usedColors} />
            ) : null}

            <View className="flex-1">{panel}</View>
        </View>
    );
}

function SearchField({ query, onChange }: { query: string; onChange: (next: string) => void }) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    return (
        <View
            className="bg-m3-surface-container-high mx-4 mb-3 flex-row items-center rounded-full pl-4"
            style={{ height: SEARCH_HEIGHT }}
        >
            <HugeiconsIcon color={m3.onSurfaceVariant} icon={Search01Icon} size={20} />
            <TextInput
                accessibilityLabel={t("transaction.identity.searchIcons")}
                autoCapitalize="none"
                autoCorrect={false}
                className="text-body flex-1 px-3 font-sans"
                cursorColor={m3.primary}
                onChangeText={onChange}
                placeholder={t("transaction.identity.searchIcons")}
                placeholderTextColor={m3.onSurfaceVariant}
                returnKeyType="search"
                style={{ color: m3.onSurface, height: SEARCH_HEIGHT, paddingVertical: 0 }}
                value={query}
            />
            {query === "" ? null : (
                <Pressable
                    accessibilityLabel={t("common.clearSearch")}
                    accessibilityRole="button"
                    android_ripple={{ borderless: true, color: withAlpha(m3.onSurface, PRESSED_ALPHA), radius: 20 }}
                    className="size-12 items-center justify-center"
                    onPress={() => onChange("")}
                >
                    <HugeiconsIcon color={m3.onSurfaceVariant} icon={CancelCircleIcon} size={20} />
                </Pressable>
            )}
        </View>
    );
}

function SwatchRail({
    selected,
    usedColors,
    onSelect,
}: {
    selected: string | null;
    usedColors: readonly string[];
    onSelect: (hex: string) => void;
}) {
    const t = useTranslation();
    return (
        <ScrollView
            className="mb-2 grow-0"
            contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
            horizontal
            showsHorizontalScrollIndicator={false}
        >
            {CATEGORY_PALETTE.map((hex, index) => (
                <ColorSwatch
                    hex={hex}
                    hitSlop={SWATCH_SLOP}
                    key={hex}
                    label={t("transaction.identity.colorSwatch", {
                        position: index + 1,
                        total: CATEGORY_PALETTE.length,
                    })}
                    onPress={() => onSelect(hex)}
                    selected={selected === hex}
                    used={usedColors.includes(hex)}
                />
            ))}
        </ScrollView>
    );
}

function PhotoPanel({
    uri,
    photoColor,
    failed,
    onPick,
    onColorChange,
}: {
    failed: boolean;
    uri: string | null;
    photoColor: string | null;
    onPick: () => void;
    onColorChange: (color: string) => void;
}) {
    const m3 = useMaterialColors();
    const t = useTranslation();
    let prompt = t(uri ? "transaction.identity.changePhotoPrompt" : "transaction.identity.selectPhotoPrompt");
    if (failed) {
        prompt = t("alerts.photo.failed");
    }
    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: SYMBOL_MARGIN, paddingTop: 6 }}>
            <View className="items-center">
                <Pressable
                    accessibilityLabel={t(
                        uri ? "transaction.identity.changePhoto" : "transaction.identity.selectPhoto"
                    )}
                    accessibilityRole="button"
                    android_ripple={{ color: withAlpha(m3.onSurface, PRESSED_ALPHA) }}
                    className="bg-m3-surface-container-high items-center justify-center overflow-hidden"
                    onPress={onPick}
                    style={{ borderRadius: PHOTO_WELL_RADIUS, height: PHOTO_WELL, width: PHOTO_WELL }}
                >
                    {uri ? (
                        <Image contentFit="cover" source={{ uri }} style={{ height: PHOTO_WELL, width: PHOTO_WELL }} />
                    ) : (
                        <HugeiconsIcon color={m3.onSurfaceVariant} icon={Image01Icon} size={42} />
                    )}
                </Pressable>
                <Text
                    className="text-caption pt-2.5 pb-6 text-center font-sans"
                    style={{ color: failed ? m3.error : m3.onSurfaceVariant }}
                >
                    {prompt}
                </Text>
            </View>

            <View className="min-h-14 flex-row items-center gap-4">
                <View
                    className="border-m3-outline-variant size-6 rounded-full border"
                    style={{ backgroundColor: uri ? (photoColor ?? undefined) : undefined }}
                />
                <View className="flex-1">
                    <Text className="text-body font-sans" style={{ color: m3.onSurface }}>
                        {t("transaction.identity.autoDetected")}
                    </Text>
                    <Text className="text-caption font-sans" style={{ color: m3.onSurfaceVariant }}>
                        {t(uri ? "transaction.identity.primaryColor" : "transaction.identity.pickPhotoFirst")}
                    </Text>
                </View>
            </View>

            <View className="-mx-1 flex-row flex-wrap justify-center gap-2 pt-2">
                {CATEGORY_PALETTE.map((hex, index) => (
                    <ColorSwatch
                        hex={hex}
                        hitSlop={SWATCH_SLOP}
                        key={hex}
                        label={t("transaction.identity.colorSwatch", {
                            position: index + 1,
                            total: CATEGORY_PALETTE.length,
                        })}
                        onPress={() => onColorChange(hex)}
                        selected={photoColor === hex}
                    />
                ))}
            </View>
        </ScrollView>
    );
}
