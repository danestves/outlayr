import { useRef, useState } from "react";
import { View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { ChoiceRow, SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import type { AccountTarget, MmAccountGroup, MmAccountView } from "@/domain/money-manager/types";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { moneyManagerSession, useMoneyManagerSession } from "@/lib/money-manager-session";
import type { MoneyManagerDraft } from "@/lib/money-manager-session";

import { ChoiceSheet } from "./components/choice-sheet";
import type { ChoiceSheetHandle } from "./components/choice-sheet";
import { ImportRow } from "./components/import-row";
import { accountTarget, money, tc } from "./labels";

const GROUPS = [
    ["open", "mmImport.accounts.open"],
    ["hidden", "mmImport.accounts.hidden"],
] as const satisfies readonly (readonly [MmAccountGroup, TranslationKey])[];

const ORPHAN_COLOR = "#7D76BA";

/** Accounts merged into `uid` go back to their own account once `uid` is left out. */
function setAccountTarget(uid: string, target: AccountTarget, draft: MoneyManagerDraft) {
    moneyManagerSession.updateChoices((choices) => {
        const accounts = { ...choices.accounts, [uid]: target };
        if (target.kind === "skip") {
            for (const [other, current] of Object.entries(accounts)) {
                if (current.kind === "merge" && current.intoUid === uid) {
                    const view = draft.analysis.accounts.find((account) => account.uid === other);
                    accounts[other] = { accountKind: view?.suggestedKind ?? "asset", kind: "new" };
                }
            }
        }
        return { ...choices, accounts };
    });
}

export function MoneyManagerAccounts() {
    const { draft } = useMoneyManagerSession();
    const t = useTranslation();
    const sheet = useRef<ChoiceSheetHandle>(null);
    const [editing, setEditing] = useState<string | null>(null);
    if (draft === null) {
        return <SettingsScreen>{null}</SettingsScreen>;
    }
    const { analysis } = draft;
    const edited = analysis.accounts.find((account) => account.uid === editing) ?? null;

    const edit = (uid: string) => {
        setEditing(uid);
        sheet.current?.present();
    };

    return (
        <SettingsScreen>
            {GROUPS.map(([group, titleKey]) => {
                const rows = analysis.accounts.filter((account) => account.group === group);
                if (rows.length === 0) {
                    return null;
                }
                return (
                    <SettingsSection key={group} title={`${t(titleKey)} · ${rows.length}`}>
                        {rows.map((account) => (
                            <ImportRow
                                detail={accountDetail(account, t)}
                                key={account.uid}
                                leading={<CategoryIconTile color={account.color} icon={account.icon} size={32} />}
                                onPress={() => edit(account.uid)}
                                target={accountTarget(draft, account.uid, t)}
                                testID={`mm-account-${account.uid}`}
                                title={account.title}
                            />
                        ))}
                    </SettingsSection>
                );
            })}
            {analysis.orphanedEntryCount > 0 ? (
                <SettingsSection footer={t("mmImport.accounts.footer")} title={t("mmImport.accounts.deleted")}>
                    <ImportRow
                        detail={t("mmImport.accounts.orphanedDetail")}
                        leading={<CategoryIconTile color={ORPHAN_COLOR} icon="Delete02" size={32} />}
                        target={{ label: t("mmImport.target.noAccount"), loud: true }}
                        title={tc(t, "mmImport.count.entries", analysis.orphanedEntryCount)}
                    />
                </SettingsSection>
            ) : (
                <View className="pt-3" />
            )}
            <ChoiceSheet
                detail={edited ? accountDetail(edited, t) : undefined}
                leading={edited ? <CategoryIconTile color={edited.color} icon={edited.icon} size={32} /> : undefined}
                onDismiss={() => setEditing(null)}
                ref={sheet}
                title={edited?.title ?? ""}
            >
                {edited ? (
                    <AccountChoices
                        account={edited}
                        draft={draft}
                        onPicked={(target) => {
                            setAccountTarget(edited.uid, target, draft);
                            sheet.current?.dismiss();
                        }}
                    />
                ) : null}
            </ChoiceSheet>
        </SettingsScreen>
    );
}

function accountDetail(account: MmAccountView, t: ReturnType<typeof useTranslation>): string {
    const entries = tc(t, "mmImport.count.entries", account.entryCount);
    return account.balance === null ? entries : `${money(account.balance, account.currency)} · ${entries}`;
}

function AccountChoices({
    account,
    draft,
    onPicked,
}: {
    account: MmAccountView;
    draft: MoneyManagerDraft;
    onPicked: (target: AccountTarget) => void;
}) {
    const t = useTranslation();
    const current = draft.choices.accounts[account.uid];
    const mergeable = draft.analysis.accounts.filter(
        (other) =>
            other.uid !== account.uid &&
            other.group !== "deleted" &&
            other.currency === account.currency &&
            draft.choices.accounts[other.uid]?.kind === "new"
    );
    const existing = draft.ledger.accounts.filter((other) => other.currency === account.currency);

    return (
        <View>
            <SettingsSection title={t("mmImport.accountSheet.bringAs")}>
                <ChoiceRow
                    detail={t("mmImport.accountSheet.asNewDetail")}
                    label={t("mmImport.accountSheet.asNew")}
                    onPress={() => onPicked({ accountKind: "asset", kind: "new" })}
                    selected={current?.kind === "new" && current.accountKind !== "liability"}
                />
                <ChoiceRow
                    detail={t("mmImport.accountSheet.asCardDetail")}
                    label={t("mmImport.accountSheet.asCard")}
                    onPress={() => onPicked({ accountKind: "liability", kind: "new" })}
                    selected={current?.kind === "new" && current.accountKind === "liability"}
                />
                <ChoiceRow
                    detail={tc(t, "mmImport.accountSheet.leaveOutDetail", account.entryCount)}
                    label={t("mmImport.accountSheet.leaveOut")}
                    onPress={() => onPicked({ kind: "skip" })}
                    selected={current?.kind === "skip"}
                />
            </SettingsSection>
            {mergeable.length + existing.length > 0 ? (
                <SettingsSection title={t("mmImport.accountSheet.join")}>
                    {mergeable.map((other) => (
                        <ChoiceRow
                            detail={t("mmImport.accountSheet.fromMoneyManager")}
                            key={other.uid}
                            label={other.title}
                            leading={<CategoryIconTile color={other.color} icon={other.icon} size={28} />}
                            onPress={() => onPicked({ intoUid: other.uid, kind: "merge" })}
                            selected={current?.kind === "merge" && current.intoUid === other.uid}
                        />
                    ))}
                    {existing.map((other) => (
                        <ChoiceRow
                            detail={t("mmImport.accountSheet.inOutlayr")}
                            key={other.id}
                            label={other.name}
                            onPress={() => onPicked({ accountId: other.id, kind: "existing" })}
                            selected={current?.kind === "existing" && current.accountId === other.id}
                        />
                    ))}
                </SettingsSection>
            ) : null}
        </View>
    );
}
