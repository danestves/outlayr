import { eq } from "drizzle-orm";
import { Image } from "expo-image";
import { Button } from "panelui-native/components/button";
import { Carousel } from "panelui-native/components/carousel";
import { useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import type { ImageRequireSource } from "react-native";

import bankAddFrame from "@/assets/images/recipe/bank-add.webp";
import bankOnFrame from "@/assets/images/recipe/bank-on.webp";
import bankPickFrame from "@/assets/images/recipe/bank-pick.webp";
import boundFrame from "@/assets/images/recipe/bound.jpg";
import newShortcutFrame from "@/assets/images/recipe/new-shortcut.jpg";
import pickerFrame from "@/assets/images/recipe/picker.jpg";
import triggersFrame from "@/assets/images/recipe/triggers.jpg";
import { SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { META_KEYS, setMeta } from "@/data/app-meta-core";
import { useLiveValue } from "@/data/live-query";
import type { LastWalletEntry } from "@/data/pending-writes-core";
import { parseLastWalletEntry, parseNotificationTexts } from "@/data/pending-writes-core";
import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";
import { formatChargeDate, formatTime } from "@/domain/dates";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import {
    BANK_SHORTCUT_URL,
    openShortcutsAutomations,
    openWalletShortcut,
    WALLET_SHORTCUT_URL,
} from "@/lib/wallet-shortcut";

import { CardsSection, LastEntry, ProofBlock } from "./wallet-parts";

interface Step {
    detail?: TranslationKey;
    frame?: ImageRequireSource;
    title: TranslationKey;
}

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

/** iOS 27 keeps a shortcut's triggers inside it, so a shared link installs the whole automation. */
const TRIGGERS_IN_SHORTCUTS = Number.parseInt(String(Platform.Version), 10) >= 27;

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

const BANK_STEPS: readonly Step[] = [
    { frame: bankAddFrame, title: "settings.wallet.bankStep1" },
    { frame: bankPickFrame, title: "settings.wallet.bankStep2" },
    { frame: bankOnFrame, title: "settings.wallet.bankStep3" },
];

const HAS_SHARED_SHORTCUT = WALLET_SHORTCUT_URL != null && TRIGGERS_IN_SHORTCUTS;

export function Wallet() {
    const db = useDatabase();
    const t = useTranslation();
    const added = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.walletShortcutAdded)),
        (rows) => rows[0]?.value === "1"
    );
    const last = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.lastWalletEntry)),
        (rows) => rows[0]?.value ?? null
    );
    const lastEntry = parseLastWalletEntry(last);
    const lastRunAt = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.walletLastRunAt)),
        (rows) => (rows[0]?.value ? Number(rows[0].value) : null)
    );
    const lastNotification = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.notificationTexts)),
        (rows) => parseNotificationTexts(rows[0]?.value).at(-1) ?? null
    );
    const bankSection = TRIGGERS_IN_SHORTCUTS && !lastNotification ? <BankSection /> : null;
    const bankRow = lastNotification ? (
        <CheckRow detail={t("settings.wallet.bankShortcutName")} title={t("settings.wallet.bankSection")} />
    ) : null;
    const notificationProof = lastNotification ? (
        <ProofBlock
            detail={lastNotification.text.replaceAll(/\s*\n\s*/g, " · ")}
            label={t("settings.wallet.lastNotification")}
            title={lastNotification.amountText ?? t("settings.wallet.notificationUnread")}
        />
    ) : null;
    const [stepsShown, setStepsShown] = useState(false);
    const working = lastRunAt != null || (lastEntry != null && !lastEntry.push);
    // `added` is only set by the shared link, so an older inline setup stays inline.
    const linked = HAS_SHARED_SHORTCUT && added;
    const inline = TRIGGERS_IN_SHORTCUTS ? IOS27_MANUAL_STEPS : MANUAL_STEPS;
    const steps = linked ? IOS27_AUTOMATION_STEPS : inline;

    // Records the link was taken, not that the shortcut exists: iOS reports nothing back, so the claim waits for a run.
    const getShortcut = async () => {
        try {
            await openWalletShortcut();
            await setMeta(db, META_KEYS.walletShortcutAdded, "1");
        } catch (cause) {
            console.error("Opening the Wallet shortcut failed", cause);
            notifyFailure({ title: t("settings.wallet.get") });
        }
    };

    // A working inline setup is done whatever `added` says.
    if (HAS_SHARED_SHORTCUT && !added && !working) {
        return (
            <SettingsScreen>
                {lastEntry ? <LastEntry db={db} txId={lastEntry.txId} /> : null}
                {notificationProof}
                <View className="gap-5 pt-6">
                    <Text className="text-muted text-body leading-snug">{t("settings.wallet.lead")}</Text>
                    <Button className="rounded-full" fullWidth onPress={getShortcut} size="md" variant="primary">
                        {t("settings.wallet.get")}
                    </Button>
                    <Text className="text-muted text-subtitle leading-snug">{t("settings.wallet.getDetail")}</Text>
                </View>
                {bankRow ? (
                    <SettingsSection title={t("settings.wallet.setupSection")}>{bankRow}</SettingsSection>
                ) : null}
                {bankSection}
                {bankRow ? <CardsSection db={db} /> : null}
            </SettingsScreen>
        );
    }

    return (
        <SettingsScreen>
            <Proof db={db} lastEntry={lastEntry} lastRunAt={lastRunAt} />
            {notificationProof}

            <SettingsSection title={t(working ? "settings.wallet.setupSection" : "settings.wallet.stepsSection")}>
                {linked && working ? (
                    <CheckRow detail={t("settings.wallet.shortcutName")} title={t("settings.wallet.applePayRow")} />
                ) : null}
                {bankRow}
                {working ? (
                    <ToggleStepsRow
                        linked={linked}
                        onPress={() => setStepsShown((shown) => !shown)}
                        shown={stepsShown}
                    />
                ) : null}
                {working && !stepsShown ? null : <StepList steps={steps} />}
            </SettingsSection>

            <View className="gap-2.5 pt-5">
                <Button
                    className="rounded-full"
                    fullWidth
                    onPress={openShortcutsAutomations}
                    size="md"
                    variant={working ? "outline" : "primary"}
                >
                    {t("settings.wallet.open")}
                </Button>
                {linked ? (
                    <Button className="rounded-full" fullWidth onPress={getShortcut} size="md" variant="ghost">
                        {t("settings.wallet.getAgain")}
                    </Button>
                ) : null}
            </View>

            {bankSection}

            {working ? null : (
                <ProofBlock detail={t("settings.wallet.tryIt")} title={t("settings.wallet.nothingYet")} />
            )}

            <CardsSection db={db} />
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

const FRAME_WIDTH = 150;
const FRAME_HEIGHT = 325;
/** Three lines of caption: the longest step title wraps to three in Spanish. */
const CAPTION_HEIGHT = 62;
const FRAME_GAP = 12;
const FRAME_RADIUS = 12;

function FrameStrip({ steps }: { steps: readonly Step[] }) {
    const t = useTranslation();
    const framed = steps.flatMap((step, index) =>
        step.frame ? [{ ...step, frame: step.frame, number: index + 1 }] : []
    );
    if (framed.length === 0) {
        return null;
    }
    return (
        <Carousel align="start" className="-mx-5 pt-3" itemSize={FRAME_WIDTH + FRAME_GAP}>
            <Carousel.Content style={{ height: FRAME_HEIGHT + CAPTION_HEIGHT }}>
                {framed.map((step) => (
                    <Carousel.Item className="gap-1.5 pl-5" key={step.title}>
                        <Image
                            contentFit="cover"
                            source={step.frame}
                            style={{ borderRadius: FRAME_RADIUS, height: FRAME_HEIGHT, width: FRAME_WIDTH }}
                        />
                        <Text className="text-muted text-subtitle" numberOfLines={3} style={{ width: FRAME_WIDTH }}>
                            <Text className="text-foreground font-mono tabular-nums">{String(step.number)}</Text>
                            {`  ${t(step.title)}`}
                        </Text>
                    </Carousel.Item>
                ))}
            </Carousel.Content>
        </Carousel>
    );
}

function BankSection() {
    const t = useTranslation();
    const getBankShortcut = () => {
        Linking.openURL(BANK_SHORTCUT_URL).catch((cause: unknown) => {
            console.error("Opening the bank shortcut failed", cause);
            notifyFailure({ title: t("settings.wallet.bankGet") });
        });
    };
    return (
        <SettingsSection footer={t("settings.wallet.bankFooter")} title={t("settings.wallet.bankSection")}>
            <FrameStrip steps={BANK_STEPS} />
            <Button className="mt-3 rounded-full" fullWidth onPress={getBankShortcut} size="md" variant="primary">
                {t("settings.wallet.bankGet")}
            </Button>
        </SettingsSection>
    );
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

function CheckRow({ title, detail }: { detail: string; title: string }) {
    return (
        <View className="border-border flex-row items-center gap-3 border-b py-3">
            <View className="bg-income h-5.5 w-5.5 items-center justify-center rounded-full">
                <Text className="text-background text-eyebrow font-sans-semibold">✓</Text>
            </View>
            <Text className="text-body text-foreground flex-1" numberOfLines={1}>
                {title}
            </Text>
            <Text className="text-body text-muted">{detail}</Text>
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
