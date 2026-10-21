import Delete02Icon from "@hugeicons-pro/core-stroke-rounded/Delete02Icon";
import Search01Icon from "@hugeicons-pro/core-stroke-rounded/Search01Icon";
import { Stack } from "expo-router";
import { memo, useCallback, useLayoutEffect, useRef } from "react";
import { Pressable } from "react-native";

import { SheetHeader, SheetHeaderIconButton, SheetHeaderTextButton } from "@/components/sheet-header";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import type { TransactionFormCta as TransactionFormCtaBase, TransactionFormCtaProps } from "./cta";

const PRESSED_ALPHA = 0.1;

const BLOCKED_ALPHA = 0.38;

/** Stable handlers, so a keystroke in the form does not rebuild the bar. */
interface CtaHandlers {
    onDelete?: () => void;
    onLookup?: () => void;
    onSave?: () => void;
}

/** Primitives only: `memo` must see an unchanged bar as unchanged. */
type CtaBarProps = Pick<TransactionFormCtaProps, "deleteLabel" | "lookupBusy" | "lookupLabel"> &
    CtaHandlers & { inSheet: boolean; saveBusy: boolean; saveReady: boolean; sheetTitle?: string };

// A blocked Save stays pressable, as on iOS: the press says what is missing.
function DialogSave({ busy, onPress, ready }: { busy: boolean; onPress: () => void; ready: boolean }) {
    const t = useTranslation();
    const m3 = useMaterialColors();
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            android_ripple={{ color: withAlpha(m3.primary, PRESSED_ALPHA) }}
            className="h-10 justify-center overflow-hidden rounded-full px-3"
            disabled={busy}
            onPress={onPress}
        >
            <Text
                className="font-sans-medium text-caption"
                style={{ color: ready && !busy ? m3.primary : withAlpha(m3.onSurface, BLOCKED_ALPHA) }}
            >
                {t("common.save")}
            </Text>
        </Pressable>
    );
}

function CtaBarBody({
    deleteLabel,
    lookupBusy,
    lookupLabel,
    onDelete,
    onLookup,
    onSave,
    inSheet,
    saveBusy,
    saveReady,
    sheetTitle,
}: CtaBarProps) {
    const t = useTranslation();
    if (inSheet) {
        return (
            <SheetHeader title={sheetTitle}>
                {onLookup ? (
                    <SheetHeaderIconButton
                        accessibilityLabel={lookupLabel ?? ""}
                        disabled={lookupBusy === true}
                        icon={Search01Icon}
                        onPress={onLookup}
                    />
                ) : null}
                {onDelete ? (
                    <SheetHeaderIconButton
                        accessibilityLabel={deleteLabel ?? ""}
                        destructive
                        icon={Delete02Icon}
                        onPress={onDelete}
                    />
                ) : null}
                {onSave ? (
                    <SheetHeaderTextButton disabled={saveBusy} label={t("common.save")} onPress={onSave} />
                ) : null}
            </SheetHeader>
        );
    }
    if (!onSave) {
        return null;
    }
    return (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.View>
                <DialogSave busy={saveBusy} onPress={onSave} ready={saveReady} />
            </Stack.Toolbar.View>
        </Stack.Toolbar>
    );
}

const CtaBar = memo(CtaBarBody);

// A sheet (edit) has no app bar, so its actions go in the `SheetHeader` it draws first: render this before the
// form's scroller so that header lands on top.
export const TransactionFormCta: typeof TransactionFormCtaBase = (props) => {
    const handlers = useRef(props);
    useLayoutEffect(() => {
        handlers.current = props;
    });
    const remove = useCallback(() => handlers.current.onDelete?.(), []);
    const lookup = useCallback(() => handlers.current.onLookup?.(), []);
    const press = useCallback(() => handlers.current.save?.onPress(), []);
    return (
        <CtaBar
            deleteLabel={props.deleteLabel}
            inSheet={props.sheet !== undefined}
            lookupBusy={props.onLookup !== undefined && props.lookupBusy === true}
            lookupLabel={props.lookupLabel}
            onDelete={props.onDelete === undefined ? undefined : remove}
            onLookup={props.onLookup === undefined ? undefined : lookup}
            onSave={props.save === undefined ? undefined : press}
            saveBusy={props.save?.busy === true}
            saveReady={props.save?.ready === true}
            sheetTitle={props.sheet?.title}
        />
    );
};
