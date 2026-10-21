import ArrowDataTransferHorizontalIcon from "@hugeicons-pro/core-stroke-rounded/ArrowDataTransferHorizontalIcon";
import FileImportIcon from "@hugeicons-pro/core-stroke-rounded/FileImportIcon";
import Mic01Icon from "@hugeicons-pro/core-stroke-rounded/Mic01Icon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import ReceiptDollarIcon from "@hugeicons-pro/core-stroke-rounded/ReceiptDollarIcon";
import ScanIcon from "@hugeicons-pro/core-stroke-rounded/ScanIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import type { IconSvgElement } from "@hugeicons/react-native";
import { router, useFocusEffect } from "expo-router";
import type { Href } from "expo-router";
import { Fab } from "panelui-native/components/fab";
import { useGlassMaterial } from "panelui-native/primitives/glass";
import { useCallback, useRef, useState } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScopedVariables, useCSSVariable } from "uniwind";

import { ImportSheet } from "@/components/import-sheet/import-sheet";
import type { ImportSheetHandle } from "@/components/import-sheet/import-sheet";
import { cn } from "@/components/tw";
import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts } from "@/data/accounts";
import { LARGEST_STANDARD_FONT_SCALE } from "@/hooks/use-accessibility-text-size";
import { useTranslation } from "@/i18n/context";
import { importDraftStore } from "@/lib/import-draft-store";
import { useHaptics } from "@/lib/use-haptics";
import { useColors } from "@/theme/use-colors";

const DIAL_BOTTOM_INSET = 16;
const NAV_BAR_HEIGHT = 44;
const DIAL_EDGE_INSET = 20;
const ACTION_ICON_SIZE = 22;
const TRIGGER_ICON_SIZE = 26;

const ACTION_HEIGHT = 56;
const TRIGGER_HEIGHT = 64;
const DIAL_GAP = 12;

const LABEL_WIDTHS = [280, 240, 200] as const;
const LABEL_MAX_CLASS = { 200: "max-w-[200px]", 240: "max-w-[240px]", 280: "max-w-[280px]" } as const;
const LABEL_GAP = 12;
const CHIP_PADDING_X = 10;
const DIAL_ROW_CHROME = DIAL_EDGE_INSET * 2 + ACTION_HEIGHT + LABEL_GAP + CHIP_PADDING_X * 2;
const LONGEST_LABEL_WIDTH = 190;
const LABEL_LINE_HEIGHT = 24;
const CHIP_PADDING_Y = 8;

type LabelLines = 1 | 2 | null;
type LabelWidth = (typeof LABEL_WIDTHS)[number];

const LABEL_CLAMP = { 1: "line-clamp-1", 2: "line-clamp-2" } as const;

function labelWidth(fontScale: number, windowWidth: number): LabelWidth {
    if (fontScale <= LARGEST_STANDARD_FONT_SCALE) {
        return 200;
    }
    return LABEL_WIDTHS.find((width) => width <= windowWidth - DIAL_ROW_CHROME) ?? 200;
}

function labelClassName(lines: LabelLines, width: LabelWidth) {
    return cn(lines === null ? null : LABEL_CLAMP[lines], LABEL_MAX_CLASS[width], "text-base");
}

function chipLines(fontScale: number, lines: LabelLines, width: LabelWidth) {
    const natural = Math.ceil((LONGEST_LABEL_WIDTH * fontScale) / width);
    return lines === null ? natural : Math.min(natural, lines);
}

function actionHeight(fontScale: number, lines: LabelLines, width: LabelWidth) {
    return Math.max(ACTION_HEIGHT, CHIP_PADDING_Y + chipLines(fontScale, lines, width) * LABEL_LINE_HEIGHT * fontScale);
}

const dialHeight = (actionCount: number, fontScale: number, lines: LabelLines, width: LabelWidth) =>
    actionHeight(fontScale, null, width) +
    (actionCount - 1) * (actionHeight(fontScale, lines, width) + DIAL_GAP) +
    DIAL_GAP +
    TRIGGER_HEIGHT;

function fittingActionCount(candidates: number, room: number, fontScale: number, lines: LabelLines, width: LabelWidth) {
    for (let count = candidates; count > 1; count -= 1) {
        if (dialHeight(count, fontScale, lines, width) <= room) {
            return count;
        }
    }
    return 1;
}

interface DialFit {
    lines: LabelLines;
    kept: number;
}

// Labels clamp to two lines, then one, before actions drop off the top; at an accessibility text size actions drop
// before the one-line clamp. "Add a transaction" is never clamped and always stays.
function fitDial(actionCount: number, room: number, fontScale: number, width: LabelWidth): DialFit {
    const fits = (count: number, lines: LabelLines) => dialHeight(count, fontScale, lines, width) <= room;
    const tightest = fontScale > LARGEST_STANDARD_FONT_SCALE ? 2 : 1;

    for (const lines of [null, 2, 1] as const) {
        if (lines !== null && lines < tightest) {
            break;
        }
        if (fits(actionCount, lines)) {
            return { kept: actionCount, lines };
        }
    }
    return { kept: fittingActionCount(actionCount, room, fontScale, tightest, width), lines: tightest };
}

interface AddAction {
    href: Href | null;
    icon: IconSvgElement;
    key: string;
    label: string;
}

function DialAction({
    action,
    lines,
    onSelect,
    width,
}: {
    action: AddAction;
    lines: LabelLines;
    onSelect: (action: AddAction) => void;
    width: LabelWidth;
}) {
    // SAFETY: `--foreground` is declared in global.css for both schemes.
    const foreground = useCSSVariable("--foreground") as string;

    return (
        <Fab.Action
            icon={<HugeiconsIcon color={foreground} icon={action.icon} size={ACTION_ICON_SIZE} strokeWidth={1.8} />}
            label={action.label}
            labelClassName={labelClassName(lines, width)}
            onPress={() => onSelect(action)}
        />
    );
}

export function FloatingAddButton() {
    const { tint, accentForeground } = useColors();
    const glassDrawn = useGlassMaterial();
    const t = useTranslation();
    const insets = useSafeAreaInsets();
    const [open, setOpen] = useState(false);
    const haptics = useHaptics();

    const navigating = useRef(false);

    useFocusEffect(
        useCallback(() => {
            navigating.current = false;
            return () => {
                setOpen(false);
            };
        }, [])
    );
    const { fontScale, height: windowHeight, width: windowWidth } = useWindowDimensions();
    const importSheetRef = useRef<ImportSheetHandle>(null);
    const select = useCallback(({ href }: AddAction) => {
        if (href === null) {
            importDraftStore.setStep(importDraftStore.getResumeStep());
            importSheetRef.current?.present();
            return;
        }
        if (navigating.current) {
            return;
        }
        navigating.current = true;
        router.push(href);
    }, []);
    const canTransfer = useBankAccounts(useDatabase()).length >= 2;

    const room = windowHeight - insets.top - NAV_BAR_HEIGHT - insets.bottom - DIAL_BOTTOM_INSET;
    // Ranked by how often each is reached for, since the fit drops from the end.
    const ranked: AddAction[] = [
        {
            href: "/transactions/create",
            icon: ReceiptDollarIcon,
            key: "transaction",
            label: t("log.add.transaction"),
        },
        ...(canTransfer
            ? [
                  {
                      href: "/transactions/transfers/create" as const,
                      icon: ArrowDataTransferHorizontalIcon,
                      key: "transfer",
                      label: t("log.add.transfer"),
                  },
              ]
            : []),
        { href: "/transactions/voice", icon: Mic01Icon, key: "voice", label: t("log.add.voice") },
        { href: "/transactions/scan", icon: ScanIcon, key: "scan", label: t("log.add.scan") },
        { href: null, icon: FileImportIcon, key: "import", label: t("log.add.import") },
    ];
    const width = labelWidth(fontScale, windowWidth);
    const { kept, lines } = fitDial(ranked.length, room, fontScale, width);
    const actions = ranked.slice(0, kept).reverse();

    const toggleDial = useCallback(
        (next: boolean) => {
            setOpen(next);
            haptics("selection");
        },
        [haptics]
    );

    return (
        <>
            <ScopedVariables variables={{ "--color-primary": tint }}>
                <Fab.Group
                    accessibilityLabel={t("log.add.menu")}
                    blur
                    glass
                    onOpenChange={toggleDial}
                    open={open}
                    // The only way to grow the actions: `Fab.Action` steps down from the group's size, so `lg` takes
                    // them from 44pt to 56pt, which `ACTION_HEIGHT` and `TRIGGER_HEIGHT` budget for.
                    size="lg"
                    icon={
                        <HugeiconsIcon
                            color={glassDrawn ? tint : accentForeground}
                            icon={PlusSignIcon}
                            size={TRIGGER_ICON_SIZE}
                            strokeWidth={2.2}
                        />
                    }
                    style={{ bottom: insets.bottom + DIAL_BOTTOM_INSET, right: DIAL_EDGE_INSET }}
                >
                    {actions.map((action) => (
                        <DialAction
                            action={action}
                            key={action.key}
                            lines={action.key === "transaction" ? null : lines}
                            onSelect={select}
                            width={width}
                        />
                    ))}
                </Fab.Group>
            </ScopedVariables>
            <ImportSheet ref={importSheetRef} />
        </>
    );
}
