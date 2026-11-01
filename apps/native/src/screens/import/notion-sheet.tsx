import { BottomSheetModal, BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import CheckmarkCircle02Icon from "@hugeicons-pro/core-solid-rounded/CheckmarkCircle02Icon";
import CircleIcon from "@hugeicons-pro/core-stroke-rounded/CircleIcon";
import FileUploadIcon from "@hugeicons-pro/core-stroke-rounded/FileUploadIcon";
import Link01Icon from "@hugeicons-pro/core-stroke-rounded/Link01Icon";
import Unlink01Icon from "@hugeicons-pro/core-stroke-rounded/Unlink01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as Cause from "effect/Cause";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { useImperativeHandle, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { Linking, Platform, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import { SheetHeader } from "@/components/import-sheet/sheet-header";
import { StepCta } from "@/components/import-sheet/step-cta";
import { SettingsSection } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import type { ImportFlowEvent } from "@/domain/import-flow";
import { useOpenPaywall } from "@/hooks/use-pro-gate";
import { useProLocked } from "@/hooks/use-pro-locked";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { notifyFailure, notifyWarning } from "@/lib/notify";
import { NotionConnectError } from "@/lib/notion-connect";
import type { NotionFailure } from "@/lib/notion-connect";
import { SILENT } from "@/state/atom-command";
import { connectNotionCommand, disconnectNotionCommand, importNotionCommand } from "@/state/notion-commands";
import type { NotionConnection } from "@/state/notion-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

import { ImportRow } from "./components/import-row";
import { SourceLogo } from "./components/parts";
import { useImportPaths } from "./paths";

const NOTION_EXPORT_HELP = "https://www.notion.com/help/export-your-content";
const SHEET_CHROME = Platform.OS === "android" ? 48 : 16;
const STATUS_BAR_CLEARANCE = 8;
const MAX_SHEET_FRACTION = 0.95;
const FOOTER_GAP = 8;
const COLUMN_PREVIEW = 3;

type Found = NonNullable<Extract<NotionConnection, { kind: "connected" }>["found"]>;

type Screen =
    | { kind: "checking" }
    | { kind: "connect"; notice: "revoked" | null }
    | { kind: "databases"; found: Found }
    | { kind: "failed"; reason: NotionFailure }
    | { kind: "needsPro" }
    | { kind: "signedOut" };

const FAILURE_COPY = {
    notConnected: "mmImport.notion.revoked",
    proRequired: "mmImport.notion.needsPro",
    rateLimited: "mmImport.notion.rateLimited",
    revoked: "mmImport.notion.revoked",
    signedOut: "mmImport.notion.signedOutBody",
    unavailable: "mmImport.notion.unavailable",
} satisfies Record<NotionFailure, TranslationKey>;

function failureReason(cause: Cause.Cause<unknown>): NotionFailure {
    const error = Cause.squash(cause);
    return error instanceof NotionConnectError ? error.reason : "unavailable";
}

function screenOf(connection: AsyncResult.AsyncResult<NotionConnection, NotionConnectError>): Screen {
    if (AsyncResult.isFailure(connection)) {
        const reason = failureReason(connection.cause);
        if (reason === "revoked" || reason === "notConnected") {
            return { kind: "connect", notice: "revoked" };
        }
        return reason === "proRequired" ? { kind: "needsPro" } : { kind: "failed", reason };
    }
    if (!AsyncResult.isSuccess(connection)) {
        return { kind: "checking" };
    }
    const { value } = connection;
    if (value.kind === "signedOut") {
        return { kind: "signedOut" };
    }
    if (value.kind === "disconnected") {
        return { kind: "connect", notice: null };
    }
    return value.found === null ? { kind: "needsPro" } : { found: value.found, kind: "databases" };
}

export function notionWorkspace(connection: AsyncResult.AsyncResult<NotionConnection, NotionConnectError>) {
    if (!AsyncResult.isSuccess(connection) || connection.value.kind !== "connected") {
        return null;
    }
    return { name: connection.value.found?.workspaceName ?? null };
}

export interface NotionSheetHandle {
    present: () => void;
}

interface NotionSheetProps {
    connection: AsyncResult.AsyncResult<NotionConnection, NotionConnectError>;
    onImport: (event: ImportFlowEvent) => void;
    onRefresh: () => void;
    onUpload: () => void;
    ref?: Ref<NotionSheetHandle>;
}

export function NotionSheet({ connection, onImport, onRefresh, onUpload, ref }: NotionSheetProps) {
    const t = useTranslation();
    const router = useRouter();
    const { onboarding } = useImportPaths();
    const sheetRef = useRef<BottomSheetModal>(null);
    const afterDismiss = useRef<(() => void) | null>(null);
    const [presented, setPresented] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const { height } = useWindowDimensions();
    const { bottom, top } = useSafeAreaInsets();
    const sheetHeight = Math.min(height * MAX_SHEET_FRACTION, height - top - STATUS_BAR_CLEARANCE);
    // SAFETY: declared in global.css for both schemes, as in `outlayr-mark`.
    const backgroundColor = useCSSVariable("--background") as string;

    useImperativeHandle(ref, () => ({
        present() {
            setPresented(true);
            sheetRef.current?.present();
        },
    }));

    const leaveThen = (next: () => void) => {
        afterDismiss.current = next;
        sheetRef.current?.dismiss();
    };

    const onDismiss = () => {
        setPresented(false);
        setConfirming(false);
        const next = afterDismiss.current;
        afterDismiss.current = null;
        next?.();
    };

    return (
        <BottomSheetModal
            backgroundStyle={{
                backgroundColor: Platform.OS === "ios" ? `${backgroundColor}FA` : backgroundColor,
            }}
            enableDynamicSizing
            enablePanDownToClose
            onDismiss={onDismiss}
            ref={sheetRef}
        >
            {presented ? (
                <View
                    ref={(node) => {
                        if (node !== null) {
                            sheetRef.current?.snapToIndex(0);
                        }
                    }}
                    style={{
                        maxHeight: sheetHeight - SHEET_CHROME - bottom,
                    }}
                    testID="notion-sheet"
                >
                    <SheetHeader
                        onBack={confirming ? () => setConfirming(false) : undefined}
                        onClose={() => sheetRef.current?.dismiss()}
                        title={t("mmImport.sources.notion")}
                    />
                    {confirming ? (
                        <DisconnectConfirm
                            onDisconnected={() => {
                                setConfirming(false);
                                onRefresh();
                            }}
                            onKeep={() => setConfirming(false)}
                        />
                    ) : (
                        <ConnectionBody
                            onDisconnect={() => setConfirming(true)}
                            onImport={(event) => leaveThen(() => onImport(event))}
                            onRefresh={onRefresh}
                            onSignIn={onboarding ? undefined : () => leaveThen(() => router.push("/settings/account"))}
                            onUpload={() => leaveThen(onUpload)}
                            screen={screenOf(connection)}
                        />
                    )}
                </View>
            ) : null}
        </BottomSheetModal>
    );
}

function SheetBody({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
    return (
        <>
            <BottomSheetScrollView
                contentContainerClassName="px-5"
                contentContainerStyle={{ paddingBottom: FOOTER_GAP * 3 }}
                style={{ flexShrink: 1 }}
            >
                {children}
            </BottomSheetScrollView>
            {footer ? (
                <View className="gap-3 px-5 pt-3" style={{ paddingBottom: FOOTER_GAP }}>
                    {footer}
                </View>
            ) : null}
        </>
    );
}

interface ConnectionBodyProps {
    onDisconnect: () => void;
    onImport: (event: ImportFlowEvent) => void;
    onRefresh: () => void;
    onSignIn?: () => void;
    onUpload: () => void;
    screen: Screen;
}

function ConnectionBody({ onDisconnect, onImport, onRefresh, onSignIn, onUpload, screen }: ConnectionBodyProps) {
    const t = useTranslation();
    const [connecting, setConnecting] = useState(false);
    const openPaywall = useOpenPaywall();
    const proLocked = useProLocked();

    const runConnect = useAtomAction(
        connectNotionCommand,
        {
            onFailure: (cause) => notifyFailure({ title: t(FAILURE_COPY[failureReason(cause)]) }),
            onSettled: () => {
                setConnecting(false);
                onRefresh();
            },
        },
        SILENT
    );

    const connect = () => {
        if (proLocked) {
            openPaywall("import");
            return;
        }
        setConnecting(true);
        runConnect(undefined);
    };

    switch (screen.kind) {
        case "checking": {
            return (
                <SheetBody>
                    <Text className="text-muted text-subtitle pt-4">{t("mmImport.notion.checking")}</Text>
                </SheetBody>
            );
        }
        case "signedOut":
        case "connect": {
            return (
                <SheetBody>
                    <SettingsSection
                        accessory={<MonoLabel className="text-tint">{t("mmImport.notion.pro")}</MonoLabel>}
                        title={t("mmImport.notion.connect")}
                    >
                        <Text className="text-muted text-subtitle py-3 leading-snug">{t(connectCopy(screen))}</Text>
                        {screen.kind === "signedOut" ? (
                            onSignIn && (
                                <Button className="rounded-full" fullWidth onPress={onSignIn} variant="secondary">
                                    {t("mmImport.notion.signInAction")}
                                </Button>
                            )
                        ) : (
                            <StepCta
                                busy={connecting}
                                busyLabel={t("mmImport.notion.checking")}
                                label={t("mmImport.notion.connectAction")}
                                onPress={connect}
                                testID="notion-connect"
                            />
                        )}
                    </SettingsSection>
                    <SettingsSection
                        accessory={<MonoLabel>{t("mmImport.notion.free")}</MonoLabel>}
                        title={t("mmImport.notion.exportSection")}
                    >
                        <UploadRow
                            detail={t("mmImport.notion.uploadDetail")}
                            label={t("mmImport.notion.upload")}
                            onPress={onUpload}
                        />
                    </SettingsSection>
                    <Pressable
                        accessibilityRole="link"
                        className="self-start pt-3 active:opacity-60"
                        onPress={() => Linking.openURL(NOTION_EXPORT_HELP)}
                    >
                        <Text className="text-tint text-subtitle font-sans-semibold">
                            {t("mmImport.notion.howToExport")}
                        </Text>
                    </Pressable>
                </SheetBody>
            );
        }
        case "needsPro":
        case "failed": {
            const reason = screen.kind === "needsPro" ? "proRequired" : screen.reason;
            return (
                <SheetBody>
                    <WorkspaceHeader name={null} />
                    <Text className="text-muted text-subtitle py-4 leading-snug">{t(FAILURE_COPY[reason])}</Text>
                    {screen.kind === "needsPro" ? (
                        <StepCta label={t("pro.action.see")} onPress={() => openPaywall("import")} />
                    ) : (
                        <StepCta label={t("common.retry")} onPress={onRefresh} />
                    )}
                    <MoreSection onChangePages={connect} onDisconnect={onDisconnect} onUpload={onUpload} />
                </SheetBody>
            );
        }
        case "databases": {
            return (
                <Databases
                    connecting={connecting}
                    found={screen.found}
                    onChangePages={connect}
                    onDisconnect={onDisconnect}
                    onImport={onImport}
                    onUpload={onUpload}
                />
            );
        }
        default: {
            return null;
        }
    }
}

function connectCopy(screen: Extract<Screen, { kind: "connect" | "signedOut" }>): TranslationKey {
    if (screen.kind === "signedOut") {
        return "mmImport.notion.signedOutBody";
    }
    return screen.notice === "revoked" ? "mmImport.notion.revoked" : "mmImport.notion.connectBody";
}

function WorkspaceHeader({ name }: { name: string | null }) {
    const t = useTranslation();
    return (
        <View className="border-border flex-row items-center gap-3 border-b py-3">
            <SourceLogo source="notion" />
            <View className="flex-1 gap-0.5">
                <Text className="text-body font-sans-medium text-foreground" numberOfLines={1}>
                    {name ?? t("mmImport.sources.notion")}
                </Text>
                <Text className="text-subtitle text-muted">{t("mmImport.notion.connected")}</Text>
            </View>
        </View>
    );
}

interface DatabasesProps {
    connecting: boolean;
    found: Found;
    onChangePages: () => void;
    onDisconnect: () => void;
    onImport: (event: ImportFlowEvent) => void;
    onUpload: () => void;
}

function Databases({ connecting, found, onChangePages, onDisconnect, onImport, onUpload }: DatabasesProps) {
    const t = useTranslation();
    const [picked, setPicked] = useState<ReadonlySet<string> | null>(null);
    const [importing, setImporting] = useState(false);
    const [problem, setProblem] = useState<TranslationKey | null>(null);
    const ledgers = found.sources.filter((source) => source.ledger);
    const chosen = picked ?? new Set(ledgers.map((source) => source.id));
    const ids = ledgers.filter((source) => chosen.has(source.id)).map((source) => source.id);

    const runImport = useAtomAction(
        importNotionCommand,
        {
            onFailure: (cause) => setProblem(FAILURE_COPY[failureReason(cause)]),
            onSettled: () => setImporting(false),
            onSuccess: ({ chosen: file, truncated }) => {
                if (file === null || "error" in file) {
                    setProblem("mmImport.notion.noLedger");
                    return;
                }
                if (truncated) {
                    notifyWarning({ title: t("mmImport.notion.truncated") });
                }
                onImport(file.event);
            },
        },
        SILENT
    );

    const toggle = (id: string) => {
        const next = new Set(chosen);
        if (!next.delete(id)) {
            next.add(id);
        }
        setPicked(next);
    };

    const startImport = () => {
        setProblem(null);
        setImporting(true);
        runImport({ ids, name: found.workspaceName ?? t("mmImport.sources.notion") });
    };

    const footer =
        found.sources.length > 0 ? (
            <>
                {problem ? <Text className="text-danger text-subtitle">{t(problem)}</Text> : null}
                <StepCta
                    busy={importing}
                    busyLabel={t("mmImport.notion.reading")}
                    disabled={ids.length === 0}
                    label={t("mmImport.notion.import")}
                    onPress={startImport}
                    testID="notion-import"
                />
            </>
        ) : undefined;

    return (
        <SheetBody footer={footer}>
            <WorkspaceHeader name={found.workspaceName} />
            <SettingsSection
                accessory={
                    found.sources.length > 0 ? (
                        <MonoLabel>
                            {t("mmImport.notion.picked", { picked: ids.length, total: found.sources.length })}
                        </MonoLabel>
                    ) : undefined
                }
                title={t("mmImport.notion.databases")}
            >
                {found.sources.length === 0 ? (
                    <View className="gap-3 py-3">
                        <Text className="text-body font-sans-medium text-foreground">
                            {t("mmImport.notion.nothingShared")}
                        </Text>
                        <Text className="text-muted text-subtitle leading-snug">
                            {t("mmImport.notion.nothingSharedBody")}
                        </Text>
                        <StepCta
                            busy={connecting}
                            busyLabel={t("mmImport.notion.checking")}
                            label={t("mmImport.notion.choosePages")}
                            onPress={onChangePages}
                        />
                    </View>
                ) : (
                    found.sources.map((source) => (
                        <DatabaseRow
                            columns={source.columns}
                            key={source.id}
                            ledger={source.ledger}
                            onToggle={() => toggle(source.id)}
                            selected={source.ledger && chosen.has(source.id)}
                            title={source.title}
                        />
                    ))
                )}
            </SettingsSection>
            {found.sources.length > 0 ? (
                <Pressable
                    accessibilityRole="link"
                    className="self-start pt-4 active:opacity-60"
                    onPress={onChangePages}
                >
                    <Text className="text-tint text-subtitle font-sans-semibold">{t("mmImport.notion.shareMore")}</Text>
                </Pressable>
            ) : null}
            <MoreSection onChangePages={onChangePages} onDisconnect={onDisconnect} onUpload={onUpload} />
        </SheetBody>
    );
}

interface DatabaseRowProps {
    columns: readonly string[];
    ledger: boolean;
    onToggle: () => void;
    selected: boolean;
    title: string;
}

function DatabaseRow({ columns, ledger, onToggle, selected, title }: DatabaseRowProps) {
    const t = useTranslation();
    const colors = useColors();
    const detail = ledger ? columns.slice(0, COLUMN_PREVIEW).join(" · ") : t("mmImport.notion.noLedgerColumns");
    return (
        <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected, disabled: !ledger }}
            className="border-border min-h-15 flex-row items-center gap-3 border-b py-2.5 active:opacity-60"
            disabled={!ledger}
            onPress={onToggle}
            style={ledger ? undefined : { opacity: 0.45 }}
        >
            <HugeiconsIcon
                color={selected ? colors.tint : colors.subtle}
                icon={selected ? CheckmarkCircle02Icon : CircleIcon}
                size={22}
            />
            <View className="flex-1 gap-0.5">
                <Text className="text-body font-sans-medium text-foreground" numberOfLines={1}>
                    {title}
                </Text>
                <MonoLabel numberOfLines={1}>{detail}</MonoLabel>
            </View>
        </Pressable>
    );
}

function UploadRow({ detail, label, onPress }: { detail?: string; label: string; onPress: () => void }) {
    const colors = useColors();
    return (
        <ImportRow
            detail={detail}
            leading={<HugeiconsIcon color={colors.foreground} icon={FileUploadIcon} size={22} />}
            onPress={onPress}
            title={label}
        />
    );
}

interface MoreSectionProps {
    onChangePages: () => void;
    onDisconnect: () => void;
    onUpload: () => void;
}

function MoreSection({ onChangePages, onDisconnect, onUpload }: MoreSectionProps) {
    const t = useTranslation();
    const colors = useColors();
    return (
        <SettingsSection title={t("mmImport.notion.more")}>
            <UploadRow label={t("mmImport.notion.uploadShort")} onPress={onUpload} />
            <ImportRow
                leading={<HugeiconsIcon color={colors.foreground} icon={Link01Icon} size={22} />}
                onPress={onChangePages}
                title={t("mmImport.notion.changePages")}
            />
            <Pressable
                accessibilityRole="button"
                className="border-border min-h-15 flex-row items-center gap-3 border-b py-2.5 active:opacity-60"
                onPress={onDisconnect}
                testID="notion-disconnect"
            >
                <HugeiconsIcon color={colors.danger} icon={Unlink01Icon} size={22} />
                <Text className="text-body font-sans-medium text-danger">{t("mmImport.notion.disconnect")}</Text>
            </Pressable>
        </SettingsSection>
    );
}

function DisconnectConfirm({ onDisconnected, onKeep }: { onDisconnected: () => void; onKeep: () => void }) {
    const t = useTranslation();
    const [busy, setBusy] = useState(false);
    const runDisconnect = useAtomAction(
        disconnectNotionCommand,
        {
            onFailure: (cause) => notifyFailure({ title: t(FAILURE_COPY[failureReason(cause)]) }),
            onSettled: () => setBusy(false),
            onSuccess: onDisconnected,
        },
        SILENT
    );

    return (
        <SheetBody>
            <View className="gap-2 pt-4" testID="notion-disconnect-confirm">
                <Text accessibilityRole="header" className="text-title font-sans-bold text-foreground tracking-tight">
                    {t("mmImport.notion.confirmTitle")}
                </Text>
                <Text className="text-muted text-subtitle leading-snug">{t("mmImport.notion.confirmBody")}</Text>
                <View className="gap-2 pt-8">
                    <Button className="rounded-full" fullWidth onPress={onKeep} variant="secondary">
                        {t("mmImport.notion.keep")}
                    </Button>
                    <Button
                        disabled={busy}
                        fullWidth
                        onPress={() => {
                            setBusy(true);
                            runDisconnect(undefined);
                        }}
                        testID="notion-disconnect-confirm-action"
                        className="border-danger rounded-full"
                        labelClassName="text-danger"
                        variant="outline"
                    >
                        {busy ? t("mmImport.notion.disconnecting") : t("mmImport.notion.disconnectAction")}
                    </Button>
                </View>
            </View>
        </SheetBody>
    );
}
