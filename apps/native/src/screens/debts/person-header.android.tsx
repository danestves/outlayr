import {
    AlertDialog,
    OutlinedTextField,
    Text as ComposeText,
    TextButton,
    useNativeState,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { HeroNumber } from "@/components/amount-text";
import { FilledButton } from "@/components/filled-button";
import { MaterialHost } from "@/components/material-host";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { toolbarIcon } from "@/components/toolbar-icons";
import { accountsRepo } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import { useDeferredDelete } from "@/data/use-deferred-delete";
import type { Database } from "@/db/client";
import { debtChoices, debtStanding } from "@/domain/debt-choices";
import type { DebtStanding } from "@/domain/debt-choices";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

import { payoffMenuActions } from "./payoff-menu-actions";
import type { PayoffPlanControls } from "./use-payoff-plan";

const STANDING_LABEL = {
    owesYou: "debts.person.owesYou",
    settled: "debts.person.settled",
    youOwe: "debts.person.youOwe",
} as const satisfies Record<DebtStanding, TranslationKey>;

const PRESSED_ALPHA = 0.12;
const TEXT_FONT = { fontFamily: "GoogleSansFlex_400Regular" } as const;
const TITLE_FONT = { ...TEXT_FONT, typography: "headlineSmall" } as const;
const LABEL_FONT = { fontFamily: "GoogleSansFlex_500Medium" } as const;

interface PersonHeroProps {
    account: Account;
    /** Negative when you owe them. */
    balance: number;
    plan: ReactNode;
    showCents: boolean;
}

export function PersonHero({ account, balance, plan, showCents }: PersonHeroProps) {
    const router = useRouter();
    const t = useTranslation();
    const m3 = useMaterialColors();
    const standing = debtStanding(balance, account.currency);
    const [first, second] = debtChoices(standing).map((choice) => ({
        label: t(choice.labelKey),
        onPress: () => router.push({ params: { personId: account.id, verb: choice.verb }, pathname: "/debts/new" }),
    }));

    return (
        <View className="items-center gap-1 pt-6 pb-4">
            <MonoLabel>{t(STANDING_LABEL[standing])}</MonoLabel>
            <HeroNumber amount={Math.abs(balance)} code={account.currency} showCents={showCents} sign="" />
            {plan}
            <View className="w-full flex-row gap-3 pt-5">
                <View className="flex-1">
                    <FilledButton label={first.label} onPress={first.onPress} />
                </View>
                <View className="flex-1">
                    <Pressable
                        accessibilityRole="button"
                        android_ripple={{ color: withAlpha(m3.onSecondaryContainer, PRESSED_ALPHA) }}
                        className="bg-m3-secondary-container h-14 items-center justify-center overflow-hidden rounded-full px-6"
                        onPress={second.onPress}
                    >
                        <Text className="font-sans-medium text-body text-m3-on-secondary-container">
                            {second.label}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

/** Android has no `Alert.prompt`, hence the dialog; rename writes the name alone. */
export function PersonToolbar({ account, db, plan }: { account: Account; db: Database; plan: PayoffPlanControls }) {
    const t = useTranslation();
    const { requestDelete } = useDeferredDelete("account");
    const [renaming, setRenaming] = useState(false);

    const rename = (next: string) => {
        setRenaming(false);
        const name = next.trim();
        if (name !== "" && name !== account.name) {
            accountsRepo.update(db, account.id, { name }).catch(() => {
                notifyFailure({ title: t("accounts.error.saveFailed") });
            });
        }
    };

    return (
        <>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Menu accessibilityLabel={t("debts.a11y.more")}>
                    <Stack.Toolbar.Icon {...toolbarIcon("more")} />
                    <Stack.Toolbar.MenuAction onPress={() => setRenaming(true)}>
                        {t("debts.person.rename")}
                    </Stack.Toolbar.MenuAction>
                    {payoffMenuActions(plan, t("debts.plan.payBackBy"), t)}
                    <Stack.Toolbar.MenuAction
                        destructive
                        onPress={() => requestDelete(account.id, t("debts.person.deleteBody"))}
                    >
                        {t("common.delete")}
                    </Stack.Toolbar.MenuAction>
                </Stack.Toolbar.Menu>
            </Stack.Toolbar>
            {renaming ? <RenameDialog name={account.name} onCancel={() => setRenaming(false)} onSave={rename} /> : null}
        </>
    );
}

function RenameDialog({
    name,
    onCancel,
    onSave,
}: {
    name: string;
    onCancel: () => void;
    onSave: (name: string) => void;
}) {
    const t = useTranslation();
    const text = useNativeState(name);
    const [draft, setDraft] = useState(name);

    return (
        <MaterialHost>
            <AlertDialog onDismissRequest={onCancel}>
                <AlertDialog.Title>
                    <ComposeText style={TITLE_FONT}>{t("debts.person.rename")}</ComposeText>
                </AlertDialog.Title>
                <AlertDialog.Text>
                    <OutlinedTextField
                        autoFocus
                        keyboardActions={{ onDone: onSave }}
                        keyboardOptions={{ capitalization: "words", imeAction: "done" }}
                        modifiers={[fillMaxWidth()]}
                        onValueChange={setDraft}
                        singleLine
                        textStyle={TEXT_FONT}
                        value={text}
                    />
                </AlertDialog.Text>
                <AlertDialog.ConfirmButton>
                    <TextButton enabled={draft.trim() !== ""} onClick={() => onSave(draft)}>
                        <ComposeText style={LABEL_FONT}>{t("common.save")}</ComposeText>
                    </TextButton>
                </AlertDialog.ConfirmButton>
                <AlertDialog.DismissButton>
                    <TextButton onClick={onCancel}>
                        <ComposeText style={LABEL_FONT}>{t("common.cancel")}</ComposeText>
                    </TextButton>
                </AlertDialog.DismissButton>
            </AlertDialog>
        </MaterialHost>
    );
}
