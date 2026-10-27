import { Button } from "panelui-native/components/button";
import { useState } from "react";
import { Pressable, View } from "react-native";

import boundFrame from "@/assets/images/recipe/bound.jpg";
import newShortcutFrame from "@/assets/images/recipe/new-shortcut.jpg";
import pickerFrame from "@/assets/images/recipe/picker.jpg";
import triggersFrame from "@/assets/images/recipe/triggers.jpg";
import { LinkRow, SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { META_KEYS } from "@/data/app-meta-core";
import type { LastWalletEntry } from "@/data/pending-writes-core";
import { onOffLabel } from "@/data/settings-core";
import { useWalletMeta } from "@/data/use-wallet-meta";
import type { Database } from "@/db/client";
import { formatChargeDate, formatTime } from "@/domain/dates";
import { useLanguage, useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { TRIGGERS_IN_SHORTCUTS, WALLET_SHORTCUT_URL } from "@/lib/wallet-shortcut";
import { SILENT, unwrapAtomCommand } from "@/state/atom-command";
import { openShortcutsAutomationsCommand, openWalletShortcutCommand, runLinkCommand } from "@/state/link-commands";
import { setMetaCommand } from "@/state/settings-commands";
import { useAtomCommand } from "@/state/use-atom-command";

import { CheckRow, FrameStrip, LastEntry, ProofBlock } from "./wallet-parts";
import type { Step } from "./wallet-parts";

/** Built inline on iOS 26: the trigger's Wallet transaction is the "Shortcut Input". */
const MANUAL_STEPS: readonly Step[] = [
    { title: "settings.wallet.step1" },
    { detail: "settings.wallet.step2Detail", title: "settings.wallet.step2" },
    { detail: "settings.wallet.step3Detail", title: "settings.wallet.step3" },
    { title: "settings.wallet.manualStep1" },
    { detail: "settings.wallet.manualStep2Detail", title: "settings.wallet.manualStep2" },
    { detail: "settings.wallet.manualStep3Detail", title: "settings.wallet.manualStep3" },
    { title: "settings.wallet.step5" },
];

const IOS27_AUTOMATION_STEPS: readonly Step[] = [
    { detail: "settings.wallet.v27Step1Detail", title: "settings.wallet.v27Step1" },
    { title: "settings.wallet.v27Step2" },
];

const IOS27_MANUAL_STEPS: readonly Step[] = [
    { frame: newShortcutFrame, title: "settings.wallet.v27Manual1" },
    { detail: "settings.wallet.v27Manual2Detail", frame: triggersFrame, title: "settings.wallet.v27Manual2" },
    { detail: "settings.wallet.manualStep2Detail", frame: pickerFrame, title: "settings.wallet.manualStep2" },
    { detail: "settings.wallet.manualStep3Detail27", frame: boundFrame, title: "settings.wallet.manualStep3" },
    { title: "settings.wallet.step5" },
];

const HAS_SHARED_SHORTCUT = WALLET_SHORTCUT_URL != null && TRIGGERS_IN_SHORTCUTS;

const openShortcutsAutomations = () => runLinkCommand(openShortcutsAutomationsCommand, undefined);

export function Wallet() {
    const db = useDatabase();
    const t = useTranslation();
    const setMeta = useAtomCommand(setMetaCommand, SILENT);
    const { added, applePayOn: working, lastEntry, lastRunAt } = useWalletMeta(db);
    const [stepsShown, setStepsShown] = useState(false);
    // `added` is only set by the shared link, so an older inline setup stays inline.
    const linked = HAS_SHARED_SHORTCUT && added;
    const inline = TRIGGERS_IN_SHORTCUTS ? IOS27_MANUAL_STEPS : MANUAL_STEPS;
    const steps = linked ? IOS27_AUTOMATION_STEPS : inline;

    // Records the link was taken, not that the shortcut exists: iOS reports nothing back, so the claim waits for a run.
    const getShortcut = async () => {
        try {
            await runLinkCommand(openWalletShortcutCommand, undefined);
            unwrapAtomCommand(await setMeta({ db, key: META_KEYS.walletShortcutAdded, value: "1" }));
        } catch (cause) {
            console.error("Opening the Wallet shortcut failed", cause);
            notifyFailure({ title: t("settings.wallet.get") });
        }
    };

    if (working) {
        return (
            <SettingsScreen>
                <SettingsSection>
                    <CheckRow
                        detail={linked ? t("settings.wallet.shortcutName") : undefined}
                        title={t(onOffLabel(true))}
                    />
                </SettingsSection>
                <Proof db={db} lastEntry={lastEntry} lastRunAt={lastRunAt} />
                <SettingsSection title={t("settings.wallet.setupSection")}>
                    <ToggleStepsRow
                        linked={linked}
                        onPress={() => setStepsShown((shown) => !shown)}
                        shown={stepsShown}
                    />
                    {stepsShown ? <StepList steps={steps} /> : null}
                    <LinkRow onPress={openShortcutsAutomations} title={t("settings.wallet.open")} />
                    {linked ? <LinkRow onPress={getShortcut} title={t("settings.wallet.getAgain")} /> : null}
                </SettingsSection>
            </SettingsScreen>
        );
    }

    if (HAS_SHARED_SHORTCUT && !added) {
        return (
            <SettingsScreen>
                {lastEntry ? <LastEntry db={db} txId={lastEntry.txId} /> : null}
                <View className="gap-5 pt-6">
                    <Text className="text-muted text-body leading-snug">{t("settings.wallet.lead")}</Text>
                    <Button className="rounded-full" fullWidth onPress={getShortcut} size="md" variant="primary">
                        {t("settings.wallet.get")}
                    </Button>
                    <Text className="text-muted text-subtitle leading-snug">{t("settings.wallet.getDetail")}</Text>
                </View>
            </SettingsScreen>
        );
    }

    return (
        <SettingsScreen>
            <Proof db={db} lastEntry={lastEntry} lastRunAt={lastRunAt} />
            <SettingsSection title={t("settings.wallet.stepsSection")}>
                <StepList steps={steps} />
            </SettingsSection>
            <View className="gap-2.5 pt-5">
                <Button
                    className="rounded-full"
                    fullWidth
                    onPress={openShortcutsAutomations}
                    size="md"
                    variant="primary"
                >
                    {t("settings.wallet.open")}
                </Button>
                {linked ? (
                    <Button className="rounded-full" fullWidth onPress={getShortcut} size="md" variant="ghost">
                        {t("settings.wallet.getAgain")}
                    </Button>
                ) : null}
            </View>
            <ProofBlock detail={t("settings.wallet.tryIt")} title={t("settings.wallet.nothingYet")} />
        </SettingsScreen>
    );
}

function Proof({
    db,
    lastEntry,
    lastRunAt,
}: {
    db: Database;
    lastEntry: LastWalletEntry | null;
    lastRunAt: number | null;
}) {
    const t = useTranslation();
    if (lastEntry) {
        return <LastEntry db={db} txId={lastEntry.txId} />;
    }
    if (lastRunAt != null) {
        return <RanOnly at={lastRunAt} />;
    }
    return <Text className="text-muted text-body pt-6 leading-snug">{t("settings.wallet.lead")}</Text>;
}

function RanOnly({ at }: { at: number }) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { use24Hour } = useDisplaySettings().state;
    const when = `${formatChargeDate(new Date(at), undefined, language)} ${formatTime(new Date(at), use24Hour, language)}`;
    return <ProofBlock detail={t("settings.wallet.ranAt", { when })} title={t("settings.wallet.nothingLogged")} />;
}

function StepList({ steps }: { steps: readonly Step[] }) {
    const t = useTranslation();
    return (
        <>
            <FrameStrip steps={steps} />
            {steps.map((step, index) => (
                <StepRow
                    detail={step.detail ? t(step.detail) : undefined}
                    key={step.title}
                    number={index + 1}
                    title={t(step.title)}
                />
            ))}
        </>
    );
}

function StepRow({ number, title, detail }: { detail?: string; number: number; title: string }) {
    return (
        <View className="border-border flex-row gap-3 border-b py-3">
            <Text className="text-muted text-subtitle w-4 pt-0.5 font-mono tabular-nums">{String(number)}</Text>
            <View className="flex-1">
                <Text className="text-body text-foreground">{title}</Text>
                {detail ? <Text className="text-muted text-subtitle leading-snug">{detail}</Text> : null}
            </View>
        </View>
    );
}

function ToggleStepsRow({ linked, shown, onPress }: { linked: boolean; onPress: () => void; shown: boolean }) {
    const t = useTranslation();
    return (
        <Pressable
            accessibilityLabel={t("settings.wallet.automationRow")}
            accessibilityRole="button"
            accessibilityState={{ expanded: shown }}
            className="border-border border-b py-3"
            onPress={onPress}
        >
            <Text className="text-body text-foreground">
                {t("settings.wallet.automationRow")}
                <Text className="text-muted">{`  ${t(shown ? "settings.wallet.hide" : "settings.wallet.show")} ›`}</Text>
                {"\n"}
                <Text className="text-muted text-subtitle">
                    {t(linked ? "settings.wallet.automationDetail" : "settings.wallet.automationDetailInline")}
                </Text>
            </Text>
        </Pressable>
    );
}
