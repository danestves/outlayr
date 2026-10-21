import { Host } from "@expo/ui";
import {
    Button,
    ColorPicker,
    HStack,
    Picker,
    RNHostView,
    ScrollView,
    Spacer,
    Image as SwiftImage,
    Text as SwiftText,
    TextField,
    useNativeState,
    VStack,
} from "@expo/ui/swift-ui";
import {
    accessibilityLabel,
    background,
    buttonStyle,
    fixedSize,
    font,
    foregroundStyle,
    labelsHidden,
    multilineTextAlignment,
    padding,
    pickerStyle,
    scrollDismissesKeyboard,
    tag,
    textCase,
    textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import { Image } from "expo-image";
import { launchImageLibraryAsync } from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { PlatformColor, Pressable, useWindowDimensions } from "react-native";

import {
    adoptPickedPhoto,
    IDENTITY_TAB_LABEL,
    initialIdentityTab,
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
import { CATEGORY_PALETTE } from "@/data/categories-core";
import { CATEGORY_EMOJI_GROUPS, CATEGORY_ICON_GROUPS, iconKeysMatching } from "@/domain/category-icon-catalog";
import { useTranslation } from "@/i18n/context";
import { outline } from "@/lib/swift-ui-geometry";
import { useHaptics } from "@/lib/use-haptics";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

export { CATEGORY_TABS, TRANSACTION_TABS } from "@/components/identity-picker-shared";

const SECONDARY_LABEL = PlatformColor("secondaryLabel");
const SEARCH_FIELD_BACKGROUND = PlatformColor("systemGray6");
const SEARCH_FIELD_OUTLINE = outline.roundedRectangle({
    cornerRadius: 10,
    roundedCornerStyle: "continuous",
});
const CARD_OUTLINE = outline.roundedRectangle({
    cornerRadius: 14,
    roundedCornerStyle: "continuous",
});

const GROUP_TITLE = font({
    design: "rounded",
    textStyle: "subheadline",
    weight: "semibold",
});
const SECTION_LABEL = font({
    design: "rounded",
    textStyle: "caption",
    weight: "semibold",
});
const EMPTY_TEXT = font({ design: "rounded", textStyle: "subheadline" });
const SUBHEADLINE = font({ design: "rounded", textStyle: "subheadline" });
const CAPTION2 = font({ design: "rounded", textStyle: "caption2" });

/** App-icon squircle for the photo well (radius ≈ 0.226 · size, matching the hero). */
const PHOTO_WELL = 132;
const PHOTO_WELL_RADIUS = 30;

function chunk<T>(items: readonly T[], size: number): T[][] {
    const rows: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        rows.push(items.slice(index, index + size));
    }
    return rows;
}

/** The enclosing `<Host>` and the sheet chrome belong to the route. */
const NO_USED_COLORS: string[] = [];

function IdentityPickerContent({
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
    const cell = symbolCellSize(width);
    const [tab, setTab] = useState<IdentityTab>(() => initialIdentityTab(value, tabs));
    // Native state lets the clear button empty the field; React state recomputes the results.
    const queryState = useNativeState("");
    const [query, setQuery] = useState("");
    const [photoFailed, setPhotoFailed] = useState(false);
    const searching = query.trim() !== "";
    const searchResults = searching ? iconKeysMatching(query) : [];

    const haptics = useHaptics();
    const colors = useColors();
    const effectiveColor = value.color ?? CATEGORY_PALETTE[0];
    const glyphTint = tint ?? effectiveColor;

    const pickColor = (color: string) => {
        haptics("selection");
        onChange({ ...value, color });
    };
    const pickEmoji = (emoji: string) => {
        haptics("selection");
        onChange(withEmoji(value, emoji));
    };
    const pickIcon = (icon: string) => {
        haptics("selection");
        onChange(withIcon(value, icon));
    };

    const pickFromLibrary = async () => {
        const result = await launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            mediaTypes: ["images"],
            quality: 0.9,
        });
        if (result.canceled || result.assets.length === 0) {
            return;
        }
        onChange(await adoptPickedPhoto(value, result.assets[0].uri));
    };

    // A rejected launch (revoked permission, host torn down) looks like a missed tap, so it is said out loud,
    // inline under the well: the sheet covers the toast viewport, and an alert would be a second modal.
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

    let panel: ReactNode;
    if (tab === "photo") {
        panel = (
            <PhotoPanel
                failed={photoFailed}
                onColorChange={(color) => onChange({ ...value, photoColor: color })}
                onPick={pickPhoto}
                photoColor={value.photoColor}
                uri={value.photoUri}
            />
        );
    } else if (tab === "emoji") {
        panel = (
            <VStack alignment="leading" modifiers={[padding({ bottom: 24, horizontal: SYMBOL_MARGIN })]} spacing={20}>
                {CATEGORY_EMOJI_GROUPS.map((group) => (
                    <VStack alignment="leading" key={group.titleKey} spacing={SYMBOL_GAP}>
                        <GroupHeader title={t(group.titleKey)} />
                        <EmojiRows
                            cell={cell}
                            emojis={group.emoji}
                            onSelect={pickEmoji}
                            selectedEmoji={value.emoji ?? ""}
                            tint={glyphTint}
                        />
                    </VStack>
                ))}
            </VStack>
        );
    } else if (searching && searchResults.length === 0) {
        panel = (
            <VStack modifiers={[padding({ top: 60 })]}>
                <SwiftText modifiers={[EMPTY_TEXT, foregroundStyle(SECONDARY_LABEL)]}>
                    {t("transaction.identity.noIcons")}
                </SwiftText>
            </VStack>
        );
    } else if (searching) {
        panel = (
            <VStack alignment="leading" modifiers={[padding({ bottom: 24, horizontal: SYMBOL_MARGIN, top: 4 })]}>
                <IconRows
                    cell={cell}
                    keys={searchResults}
                    onSelect={pickIcon}
                    selectedIcon={value.icon ?? ""}
                    tint={glyphTint}
                />
            </VStack>
        );
    } else {
        panel = (
            <VStack alignment="leading" modifiers={[padding({ bottom: 24, horizontal: SYMBOL_MARGIN })]} spacing={20}>
                {CATEGORY_ICON_GROUPS.map((group) => (
                    <VStack alignment="leading" key={group.titleKey} spacing={SYMBOL_GAP}>
                        <GroupHeader title={t(group.titleKey)} />
                        <IconRows
                            cell={cell}
                            keys={group.keys}
                            onSelect={pickIcon}
                            selectedIcon={value.icon ?? ""}
                            tint={glyphTint}
                        />
                    </VStack>
                ))}
            </VStack>
        );
    }

    return (
        <VStack modifiers={[background(colors.groupedBackground)]} spacing={0}>
            <HStack modifiers={[padding({ bottom: 8, horizontal: 20, top: 16 })]}>
                <Spacer />
                <Button label={t("common.done")} modifiers={[font({ weight: "semibold" })]} onPress={onDone} />
            </HStack>

            <Picker
                modifiers={[pickerStyle("segmented"), padding({ bottom: 12, horizontal: 20 })]}
                // SAFETY: the picker reports an index into the options this component
                // renders, which are exactly `IdentityTab`'s members.
                onSelectionChange={(next) => setTab(next as IdentityTab)}
                selection={tab}
            >
                {tabs.map((option) => (
                    <SwiftText key={option} modifiers={[tag(option)]}>
                        {t(IDENTITY_TAB_LABEL[option])}
                    </SwiftText>
                ))}
            </Picker>

            {/* The emoji palette has no keywords to search against. */}
            {tab === "icons" ? (
                <HStack
                    modifiers={[
                        padding({ horizontal: 10, vertical: 8 }),
                        background(SEARCH_FIELD_BACKGROUND, SEARCH_FIELD_OUTLINE),
                        padding({ bottom: 12, horizontal: 20 }),
                    ]}
                    spacing={8}
                >
                    <SwiftImage color={SECONDARY_LABEL} size={15} systemName="magnifyingglass" />
                    <TextField
                        modifiers={[textInputAutocapitalization("never")]}
                        onTextChange={setQuery}
                        placeholder={t("transaction.identity.searchIcons")}
                        text={queryState}
                    />
                    {searching ? (
                        <Button
                            modifiers={[buttonStyle("plain"), accessibilityLabel(t("common.clearSearch"))]}
                            onPress={() => {
                                queryState.set("");
                                setQuery("");
                            }}
                        >
                            <SwiftImage color={SECONDARY_LABEL} size={15} systemName="xmark.circle.fill" />
                        </Button>
                    ) : null}
                </HStack>
            ) : null}

            {/* The photo tab has its own colour control. */}
            {showsColorRail && tab !== "photo" ? (
                <ColorRail onSelect={pickColor} selected={value.color} usedColors={usedColors} />
            ) : null}

            {/* Dragging the glyphs is the only way to put the search keyboard away. */}
            <ScrollView modifiers={[scrollDismissesKeyboard("immediately")]} showsIndicators={false}>
                {panel}
            </ScrollView>
        </VStack>
    );
}

/** Not pinned: @expo/ui's ScrollView has no `pinnedViews` equivalent. */
function GroupHeader({ title }: { title: string }) {
    return (
        <SwiftText modifiers={[GROUP_TITLE, foregroundStyle(SECONDARY_LABEL), padding({ vertical: 8 })]}>
            {title}
        </SwiftText>
    );
}

function IconRows({
    keys,
    tint,
    selectedIcon,
    cell,
    onSelect,
}: {
    keys: readonly string[];
    tint: string;
    selectedIcon: string;
    cell: number;
    onSelect: (key: string) => void;
}) {
    return (
        <VStack alignment="leading" spacing={SYMBOL_GAP}>
            {chunk(keys, SYMBOL_COLUMNS).map((row, index) => (
                <HStack key={String(index)} spacing={SYMBOL_GAP}>
                    {row.map((key) => (
                        <RNHostView key={key} matchContents>
                            <SymbolIconCell
                                iconKey={key}
                                onPress={() => onSelect(key)}
                                selected={key === selectedIcon}
                                size={cell}
                                tint={tint}
                            />
                        </RNHostView>
                    ))}
                </HStack>
            ))}
        </VStack>
    );
}

function EmojiRows({
    emojis,
    tint,
    selectedEmoji,
    cell,
    onSelect,
}: {
    emojis: readonly string[];
    tint: string;
    selectedEmoji: string;
    cell: number;
    onSelect: (emoji: string) => void;
}) {
    return (
        <VStack alignment="leading" spacing={SYMBOL_GAP}>
            {chunk(emojis, SYMBOL_COLUMNS).map((row, index) => (
                <HStack key={String(index)} spacing={SYMBOL_GAP}>
                    {row.map((emoji) => (
                        <RNHostView key={emoji} matchContents>
                            <SymbolEmojiCell
                                emoji={emoji}
                                onPress={() => onSelect(emoji)}
                                selected={emoji === selectedEmoji}
                                size={cell}
                                tint={tint}
                            />
                        </RNHostView>
                    ))}
                </HStack>
            ))}
        </VStack>
    );
}

function ColorRail({
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
        <ScrollView axes="horizontal" modifiers={[padding({ bottom: 8 })]} showsIndicators={false}>
            <HStack modifiers={[padding({ horizontal: 20 })]} spacing={12}>
                {CATEGORY_PALETTE.map((hex, index) => (
                    <RNHostView key={hex} matchContents>
                        <ColorSwatch
                            hex={hex}
                            label={t("transaction.identity.colorSwatch", {
                                position: index + 1,
                                total: CATEGORY_PALETTE.length,
                            })}
                            onPress={() => onSelect(hex)}
                            selected={selected === hex}
                            used={usedColors.includes(hex)}
                        />
                    </RNHostView>
                ))}
                {/* Bare on purpose: the wheel streams a colour per finger move and would buzz the whole drag. */}
                <ColorPicker
                    label={t("transaction.identity.color")}
                    modifiers={[labelsHidden(), fixedSize()]}
                    onSelectionChange={onSelect}
                    selection={selected ?? CATEGORY_PALETTE[0]}
                />
            </HStack>
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
    const colors = useColors();
    const t = useTranslation();
    return (
        <VStack modifiers={[padding({ bottom: 24, horizontal: SYMBOL_MARGIN, top: 6 })]} spacing={0}>
            <RNHostView matchContents>
                <PhotoWell colors={colors} onPress={onPick} uri={uri} />
            </RNHostView>

            <SwiftText
                modifiers={[
                    SUBHEADLINE,
                    foregroundStyle(failed ? colors.danger : SECONDARY_LABEL),
                    multilineTextAlignment("center"),
                    padding({ bottom: 24, top: 10 }),
                ]}
            >
                {failed
                    ? t("alerts.photo.failed")
                    : t(uri ? "transaction.identity.changePhotoPrompt" : "transaction.identity.selectPhotoPrompt")}
            </SwiftText>

            <VStack alignment="leading" spacing={8}>
                <SwiftText modifiers={[SECTION_LABEL, textCase("uppercase"), foregroundStyle(SECONDARY_LABEL)]}>
                    {t("transaction.identity.color")}
                </SwiftText>

                <HStack
                    modifiers={[padding({ horizontal: 15, vertical: 13 }), background(colors.surface, CARD_OUTLINE)]}
                    spacing={12}
                >
                    <SwiftImage
                        color={uri ? colors.income : withAlpha(colors.muted, 0.35)}
                        size={14}
                        systemName="checkmark"
                    />
                    <VStack alignment="leading" spacing={1}>
                        <SwiftText modifiers={[SUBHEADLINE]}>{t("transaction.identity.autoDetected")}</SwiftText>
                        <SwiftText modifiers={[CAPTION2, foregroundStyle(SECONDARY_LABEL)]}>
                            {t(uri ? "transaction.identity.primaryColor" : "transaction.identity.pickPhotoFirst")}
                        </SwiftText>
                    </VStack>
                    <Spacer />
                    <ColorPicker
                        label=""
                        modifiers={[labelsHidden(), fixedSize()]}
                        onSelectionChange={onColorChange}
                        selection={photoColor ?? CATEGORY_PALETTE[0]}
                    />
                </HStack>
            </VStack>
        </VStack>
    );
}

function PhotoWell({
    uri,
    colors,
    onPress,
}: {
    uri: string | null;
    colors: ReturnType<typeof useColors>;
    onPress: () => void;
}) {
    const t = useTranslation();
    return (
        <Pressable
            accessibilityLabel={t(uri ? "transaction.identity.changePhoto" : "transaction.identity.selectPhoto")}
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: withAlpha(colors.muted, 0.12),
                borderRadius: PHOTO_WELL_RADIUS,
                height: PHOTO_WELL,
                justifyContent: "center",
                opacity: pressed ? 0.8 : 1,
                overflow: "hidden",
                width: PHOTO_WELL,
            })}
        >
            {uri ? (
                <Image contentFit="cover" source={{ uri }} style={{ height: PHOTO_WELL, width: PHOTO_WELL }} />
            ) : (
                <SymbolView name="photo" size={42} tintColor={colors.muted} type="monochrome" />
            )}
        </Pressable>
    );
}

export function IdentityPickerHost(props: IdentityPickerContentProps) {
    return (
        <Host style={{ flex: 1 }}>
            <IdentityPickerContent {...props} />
        </Host>
    );
}
