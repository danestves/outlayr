import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import BankIcon from "@hugeicons-pro/core-stroke-rounded/BankIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { resolveInstitutionDomain } from "@outlayr/money/institution-map";
import * as Cause from "effect/Cause";
import { Button } from "panelui-native/components/button";
import { useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { PickerRow } from "@/components/list/list-row";
import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts } from "@/data/accounts";
import type { Database } from "@/db/client";
import { accountTitle } from "@/domain/linked-banks";
import type { BankInstitution, LinkedBankAccount } from "@/domain/linked-banks";
import { useMerchantMark } from "@/hooks/use-merchant-mark";
import { useOpenPaywall } from "@/hooks/use-pro-gate";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { useWhen } from "@/lib/lifecycle";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { linkBankCommand, setFilesIntoCommand } from "@/state/banking-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

const FIT_CONTENT = { alignSelf: "stretch" } as const;
const NO_ACCOUNT = "";

export function BankGlyph({ size = 28 }: { size?: number }) {
    const colors = useColors();
    return (
        <View className="items-center justify-center" style={{ height: size, width: size }}>
            <HugeiconsIcon color={colors.muted} icon={BankIcon} size={Math.round(size * 0.7)} />
        </View>
    );
}

export function BankMark({ institution, size = 28 }: { institution: string; size?: number }) {
    const domain = resolveInstitutionDomain(institution);
    const colors = useColors();
    const uri = useMerchantMark(null, domain);
    if (uri === null) {
        return <BankGlyph size={size} />;
    }
    return (
        <CategoryIconTile
            color={colors.muted}
            icon={null}
            imageUri={uri}
            radius={Math.round(size / 4)}
            size={size}
            type="solid"
        />
    );
}

export function kindLabel(t: TranslateFn, kind: LinkedBankAccount["kind"]): string {
    return t(`settings.banks.kind.${kind}`);
}

/** Which ledger account the server files this bank's entries into. */
export function BankFilesIntoRow({
    account,
    db,
    detail,
    title,
}: {
    account: LinkedBankAccount;
    db: Database;
    detail?: string;
    title?: string;
}) {
    const t = useTranslation();
    const haptics = useHaptics();
    const accounts = useBankAccounts(db);
    const setFilesInto = useAtomAction(
        setFilesIntoCommand,
        {
            onFailure: (cause) => {
                haptics("error");
                console.warn("[outlayr] bank filing failed", Cause.squash(cause));
            },
            onSuccess: (saved) => {
                if (!saved) {
                    haptics("error");
                }
            },
        },
        SILENT
    );
    const current = accounts.find((candidate) => candidate.id === account.filesInto);
    const options = [
        ...accounts.map((candidate) => ({ label: candidate.name, value: candidate.id })),
        { label: t("settings.banks.detail.filesIntoNone"), value: NO_ACCOUNT },
    ];

    return (
        <PickerRow
            attention={!current}
            detail={detail}
            icon={account.kind === "credit" ? "CreditCard" : "Bank"}
            onChange={(next) => setFilesInto({ accountId: next || null, id: account.id })}
            options={options}
            title={title ?? t("settings.banks.detail.filesInto")}
            value={current?.id ?? NO_ACCOUNT}
        />
    );
}

type LinkFailure = "canceled" | "retired" | "failed";

interface LinkAttempt {
    added: ReadonlySet<string>;
    institution: BankInstitution;
    repair: LinkedBankAccount["id"] | null;
}

/**
 * Runs the bank's sign-in sheet, then shows the accounts the link added so each can be given a wallet account.
 * A sign-in again adds none, so it ends without a sheet.
 */
export function useBankLink(accounts: readonly LinkedBankAccount[], onFinished?: () => void) {
    const t = useTranslation();
    const haptics = useHaptics();
    const openPaywall = useOpenPaywall();
    const [busy, setBusy] = useState(false);
    const [attempt, setAttempt] = useState<LinkAttempt | null>(null);
    const [failure, setFailure] = useState<LinkFailure | null>(null);
    const resultRef = useRef<BottomSheetModal>(null);
    const failureRef = useRef<BottomSheetModal>(null);
    const fresh = attempt ? accounts.filter((account) => attempt.added.has(account.id)) : [];

    // The new accounts reach the overview query on its own clock, before or after the action returns.
    useWhen(fresh.length > 0, () => {
        resultRef.current?.present();
    });

    const run = useAtomAction(
        linkBankCommand,
        {
            onFailure: (cause) => {
                console.warn("[outlayr] bank link failed", Cause.pretty(cause));
                haptics("error");
                notifyFailure({ title: t("settings.banks.linkFailed") });
            },
            onSettled: () => setBusy(false),
            onSuccess: (outcome) => {
                if (outcome.kind === "linked") {
                    haptics("success");
                    // A sign-in again adds no accounts, so no result sheet would ever close the link screen.
                    if (outcome.added.length === 0) {
                        onFinished?.();
                        return;
                    }
                    setAttempt((current) => current && { ...current, added: new Set(outcome.added) });
                } else if (outcome.kind === "plan") {
                    openPaywall("banks");
                } else if (outcome.kind !== "unavailable") {
                    setFailure(outcome.kind);
                    failureRef.current?.present();
                }
            },
        },
        SILENT
    );

    const link = (institution: BankInstitution, repair: LinkedBankAccount["id"] | null) => {
        if (busy) {
            return;
        }
        setAttempt({ added: new Set(), institution, repair });
        setBusy(true);
        run({ institution: institution.id, repair });
    };

    const sheets = (
        <>
            <BankResultSheet
                accounts={fresh}
                onDismiss={() => {
                    setAttempt(null);
                    onFinished?.();
                }}
                ref={resultRef}
            />
            <BankFailureSheet
                failure={failure}
                onRetry={() => {
                    failureRef.current?.dismiss();
                    if (attempt !== null) {
                        link(attempt.institution, attempt.repair);
                    }
                }}
                ref={failureRef}
            />
        </>
    );

    return { busy, link, sheets };
}

function SheetBody({ children }: { children: ReactNode }) {
    return (
        <BottomSheetView style={{ paddingBottom: 24 }}>
            <SheetGestureRoot style={FIT_CONTENT}>
                <View className="gap-3 px-5 pt-2">{children}</View>
            </SheetGestureRoot>
        </BottomSheetView>
    );
}

function BankResultSheet({
    ref,
    accounts,
    onDismiss,
}: {
    ref: RefObject<BottomSheetModal | null>;
    accounts: readonly LinkedBankAccount[];
    onDismiss: () => void;
}) {
    const t = useTranslation();
    const db = useDatabase();
    const sheetSurface = useSheetSurface();
    const [first] = accounts;

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing
            onDismiss={onDismiss}
            ref={ref}
        >
            <SheetBody>
                {first ? (
                    <View className="items-center gap-2">
                        <BankMark institution={first.institution} size={40} />
                        <Text accessibilityRole="header" className="text-foreground font-sans-semibold text-title">
                            {t("settings.banks.result.title", { bank: first.institution })}
                        </Text>
                    </View>
                ) : null}
                <View className="border-border border-t">
                    {accounts.map((account) => (
                        <BankFilesIntoRow
                            account={account}
                            db={db}
                            detail={kindLabel(t, account.kind)}
                            key={account.id}
                            title={accountTitle(account)}
                        />
                    ))}
                </View>
                <Text className="text-muted text-subtitle leading-snug">{t("settings.banks.result.skip")}</Text>
                <Button
                    className="rounded-full"
                    fullWidth
                    onPress={() => ref.current?.dismiss()}
                    size="lg"
                    variant="primary"
                >
                    {t("common.done")}
                </Button>
            </SheetBody>
        </BottomSheetModal>
    );
}

function BankFailureSheet({
    ref,
    failure,
    onRetry,
}: {
    ref: RefObject<BottomSheetModal | null>;
    failure: LinkFailure | null;
    onRetry: () => void;
}) {
    const t = useTranslation();
    const sheetSurface = useSheetSurface();
    const retryable = failure !== "retired";

    return (
        <BottomSheetModal backgroundStyle={{ backgroundColor: sheetSurface }} enableDynamicSizing ref={ref}>
            <SheetBody>
                <Text accessibilityRole="header" className="text-foreground font-sans-semibold text-title">
                    {t("settings.banks.failure.title")}
                </Text>
                <Text className="text-muted text-subtitle leading-snug">
                    {t(`settings.banks.failure.${failure ?? "failed"}`)}
                </Text>
                {retryable ? (
                    <Button className="rounded-full" fullWidth onPress={onRetry} size="lg" variant="primary">
                        {t("common.retry")}
                    </Button>
                ) : null}
                <Button
                    className="rounded-full"
                    fullWidth
                    onPress={() => ref.current?.dismiss()}
                    size="lg"
                    variant={retryable ? "ghost" : "primary"}
                >
                    {t("settings.banks.failure.notNow")}
                </Button>
            </SheetBody>
        </BottomSheetModal>
    );
}
