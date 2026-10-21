import { Stack } from "expo-router";
import { memo, useCallback, useLayoutEffect, useMemo, useRef } from "react";

import { toolbarIcon } from "@/components/toolbar-icons";

import { transactionFormCtaActions } from "./cta-actions";
import { useKeyboardShown } from "./stage/use-keyboard-shown";

export interface KeyboardSave {
    blockedTint?: string;
    busy: boolean;
    label: string;
    onPress: () => void;
    ready: boolean;
}

export interface TransactionFormCtaProps {
    deleteLabel?: string;
    deleteTint?: string;
    lookupBusy?: boolean;
    lookupLabel?: string;
    onDelete?: () => void;
    /** Only while editing: a new entry looks its merchant up as it is typed. */
    onLookup?: () => void;
    save?: KeyboardSave;
    /** iOS ignores it (the sheet keeps its native bar); Android draws a bar inside the sheet under this title. */
    sheet?: { title?: string };
}

function CtaToolbarBody(props: TransactionFormCtaProps) {
    const actions = transactionFormCtaActions(props);
    if (actions.length === 0) {
        return null;
    }
    return (
        <Stack.Toolbar placement="right">
            {actions.map((action) => (
                <Stack.Toolbar.Button
                    accessibilityLabel={action.accessibilityLabel}
                    disabled={action.disabled}
                    key={action.key}
                    onPress={action.onPress}
                    tintColor={action.tintColor}
                    variant={action.variant}
                >
                    <Stack.Toolbar.Icon {...toolbarIcon(action.icon)} />
                </Stack.Toolbar.Button>
            ))}
        </Stack.Toolbar>
    );
}

const CtaToolbar = memo(CtaToolbarBody);

export function TransactionFormCta(props: TransactionFormCtaProps) {
    const handlers = useRef(props);
    useLayoutEffect(() => {
        handlers.current = props;
    });
    const remove = useCallback(() => handlers.current.onDelete?.(), []);
    const lookup = useCallback(() => handlers.current.onLookup?.(), []);
    const press = useCallback(() => handlers.current.save?.onPress(), []);
    const keyboardShown = useKeyboardShown();
    const lookable = props.onLookup !== undefined;
    const { blockedTint, busy, label, ready } = props.save ?? {};
    const save = useMemo(
        () =>
            keyboardShown && label !== undefined
                ? { blockedTint, busy: busy === true, label, onPress: press, ready: ready === true }
                : undefined,
        [blockedTint, busy, keyboardShown, label, press, ready]
    );
    return (
        <CtaToolbar
            deleteLabel={props.deleteLabel}
            deleteTint={props.deleteTint}
            lookupBusy={lookable && props.lookupBusy === true}
            lookupLabel={props.lookupLabel}
            onDelete={props.onDelete === undefined ? undefined : remove}
            onLookup={lookable ? lookup : undefined}
            save={save}
        />
    );
}
