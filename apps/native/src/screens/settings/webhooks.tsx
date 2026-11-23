import { BottomSheetModal, BottomSheetTextInput, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import Copy01Icon from "@hugeicons-pro/core-stroke-rounded/Copy01Icon";
import PlusSignIcon from "@hugeicons-pro/core-stroke-rounded/PlusSignIcon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Redirect, useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { useRef, useState } from "react";
import type { RefObject } from "react";
import { Alert, Clipboard, Pressable, View } from "react-native";

import { ActionMenu } from "@/components/action-menu";
import type { ActionMenuItem } from "@/components/action-menu";
import { BusyText } from "@/components/busy-text";
import { InlineFailure } from "@/components/form/inline-failure";
import { LinkRow, SettingsSection } from "@/components/list/list-row";
import { RowShell } from "@/components/list/row-shell";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { ROUNDED, Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useSyncStatus } from "@/data/use-sync-status";
import { useLongWait } from "@/hooks/use-long-wait";
import { useOpenPaywall } from "@/hooks/use-pro-gate";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useWebhookStatus } from "@/hooks/use-webhook-status";
import { useWebhooksOpen } from "@/hooks/use-webhooks-open";
import { useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import { useAuthSession } from "@/lib/auth-session";
import { CONVEX_SITE_URL } from "@/lib/cloud-configuration";
import { useOnChange, useOnMount, useTimers } from "@/lib/lifecycle";
import { notifyFailure } from "@/lib/notify";
import {
    endpointAddress,
    endpointState,
    inboundEndpoint,
    newInboundToken,
    newSigningSecret,
    webhookAgo,
} from "@/lib/webhook-settings";
import type { EndpointState, WebhookAgo, WebhookEndpoint, WebhookStatusView } from "@/lib/webhook-settings";
import { useAtomAction } from "@/state/use-atom-action";
import {
    addEndpointCommand,
    removeEndpointCommand,
    revokeInboundTokenCommand,
    setEndpointSecretCommand,
    setInboundTokenCommand,
    testEndpointCommand,
} from "@/state/webhook-commands";
import { useColors } from "@/theme/use-colors";
import type { ThemeColors } from "@/theme/use-colors";

const FIT_CONTENT = { alignSelf: "stretch" } as const;
const DOT_SIZE = 9;
const TOKEN_HINT = "••••";
const TICK_MS = 60_000;

const VALUE_TONE: Record<EndpointState, string> = {
    active: "text-income",
    failing: "text-warning-foreground",
    off: "text-danger",
};

interface ShownSecret {
    kind: "signing" | "token";
    value: string;
}

function agoText(t: TranslateFn, at: number, now: number): string {
    const ago: WebhookAgo = webhookAgo(at, now);
    return "count" in ago ? t(ago.key, { count: ago.count }) : t(ago.key);
}

export function Webhooks() {
    return useWebhooksOpen() ? <WebhookSettings /> : <Redirect href="/settings/integrations" />;
}

function WebhookSettings() {
    const db = useDatabase();
    const { accountId } = useAuthSession();
    const entitled = useProEntitled();
    const syncOn = useSyncStatus(db).enabled;

    if (accountId === null) {
        return <FreePlan />;
    }

    return <SignedInWebhooks ready={entitled && syncOn} />;
}

function SignedInWebhooks({ ready }: { ready: boolean }) {
    const t = useTranslation();
    const status = useWebhookStatus();

    if (status.kind !== "ready" && !ready) {
        return <FreePlan />;
    }

    if (status.kind === "loading") {
        return <SettingsScreen>{null}</SettingsScreen>;
    }

    if (status.kind === "error") {
        return (
            <SettingsScreen>
                <View className="pt-4">
                    <InlineFailure message={t("settings.webhooks.failed")} />
                </View>
            </SettingsScreen>
        );
    }

    const configured = status.status.inbound !== null || status.status.endpoints.length > 0;
    if (!(ready || configured)) {
        return <FreePlan />;
    }

    return <WebhookSections canManage={ready} status={status.status} />;
}

function FreePlan() {
    return (
        <SettingsScreen>
            <PlanIntro />
            <PlanPrompts />
        </SettingsScreen>
    );
}

function PlanIntro() {
    const t = useTranslation();

    return (
        <View className="gap-2 pt-6">
            <Text className="text-foreground font-sans-semibold text-title">{t("pro.entry.value")}</Text>
            <Text className="text-muted text-subtitle leading-snug">{t("settings.webhooks.free.body")}</Text>
        </View>
    );
}

function PlanPrompts() {
    const t = useTranslation();
    const router = useRouter();
    const openPaywall = useOpenPaywall();
    const db = useDatabase();
    const { accountId } = useAuthSession();
    const entitled = useProEntitled();
    const syncOn = useSyncStatus(db).enabled;
    const syncReady = accountId !== null && syncOn;

    return (
        <SettingsSection>
            {entitled ? null : (
                <LinkRow
                    icon="Sparkles"
                    onPress={() => openPaywall("settings")}
                    title={t("pro.entry.title")}
                    value={t("pro.entry.value")}
                />
            )}
            {syncReady ? null : (
                <LinkRow
                    icon="Cloud"
                    onPress={() => router.push("/settings/sync")}
                    title={t("settings.sync.navTitle")}
                    value={t("settings.sync.off")}
                />
            )}
        </SettingsSection>
    );
}

function WebhookSections({ canManage, status }: { canManage: boolean; status: WebhookStatusView }) {
    const t = useTranslation();
    const colors = useColors();
    const [now, setNow] = useState(Date.now);
    const addRef = useRef<BottomSheetModal>(null);
    const secretRef = useRef<BottomSheetModal>(null);
    const [shownSecret, setShownSecret] = useState<ShownSecret | null>(null);
    const [addUrl, setAddUrl] = useState("");
    const [addError, setAddError] = useState<string | null>(null);
    const [addBusy, setAddBusy] = useState(false);
    // Held from the tap until the secret sheet closes, so a second save can't replace a secret before it is copied.
    const minting = useRef(false);
    const addOpen = useRef(false);
    // UIKit can refuse a sheet presented while another is still dismissing.
    const secretAfterAdd = useRef<string | null>(null);
    const inbound = inboundEndpoint(CONVEX_SITE_URL);
    const timers = useTimers();

    useOnChange([status], () => {
        setNow(Date.now());
    });

    useOnMount(() => {
        const tick = () => {
            setNow(Date.now());
            timers.after(TICK_MS, tick);
        };
        return timers.after(TICK_MS, tick);
    });

    useOnChange([shownSecret], ([next]) => {
        if (next !== null) {
            secretRef.current?.present();
        }
    });

    const fail = () => notifyFailure({ title: t("settings.webhooks.failed") });
    const failMint = () => {
        minting.current = false;
        fail();
    };

    const saveToken = useAtomAction(setInboundTokenCommand, {
        onFailure: failMint,
        onSuccess: ({ saved, token }) => {
            if (!saved) {
                failMint();
                return;
            }
            setShownSecret({ kind: "token", value: token });
        },
    });
    const revokeToken = useAtomAction(revokeInboundTokenCommand, { onFailure: fail });
    const testEndpoint = useAtomAction(testEndpointCommand, {
        onFailure: fail,
        onSuccess: (sent) => {
            if (!sent) {
                notifyFailure({ title: t("settings.webhooks.testSoon") });
            }
        },
    });
    const saveEndpointSecret = useAtomAction(setEndpointSecretCommand, {
        onFailure: failMint,
        onSuccess: ({ saved, secret }) => {
            if (!saved) {
                failMint();
                return;
            }
            setShownSecret({ kind: "signing", value: secret });
        },
    });
    const addEndpoint = useAtomAction(addEndpointCommand, {
        onFailure: () => {
            minting.current = false;
            setAddError(t("settings.webhooks.add.failed"));
        },
        onSettled: () => setAddBusy(false),
        onSuccess: ({ result, secret }) => {
            if (result.kind !== "added") {
                minting.current = false;
            }
            switch (result.kind) {
                case "added": {
                    if (addOpen.current) {
                        secretAfterAdd.current = secret;
                        addRef.current?.dismiss();
                    } else {
                        setShownSecret({ kind: "signing", value: secret });
                    }
                    break;
                }
                case "invalidUrl": {
                    setAddError(t("settings.webhooks.add.invalidUrl"));
                    break;
                }
                case "invalidSecret": {
                    setAddError(t("settings.webhooks.add.invalidSecret"));
                    break;
                }
                case "tooMany": {
                    setAddError(t("settings.webhooks.add.tooMany"));
                    break;
                }
                default: {
                    setAddError(t("settings.webhooks.add.failed"));
                    break;
                }
            }
        },
    });
    const removeEndpoint = useAtomAction(removeEndpointCommand, { onFailure: fail });

    const createToken = () => {
        if (minting.current) {
            return;
        }
        minting.current = true;
        saveToken({ token: newInboundToken() });
    };

    const confirmRevoke = () =>
        Alert.alert(t("settings.webhooks.revokeTitle"), t("settings.webhooks.revokeBody"), [
            { style: "cancel", text: t("common.cancel") },
            {
                onPress: () => revokeToken(undefined),
                style: "destructive",
                text: t("settings.webhooks.revokeAction"),
            },
        ]);

    const rotateSecret = (endpoint: WebhookEndpoint) => {
        if (minting.current) {
            return;
        }
        minting.current = true;
        saveEndpointSecret({ endpointId: endpoint._id, secret: newSigningSecret() });
    };

    const confirmRemove = (endpoint: WebhookEndpoint) =>
        Alert.alert(t("settings.webhooks.removeTitle"), t("settings.webhooks.removeBody"), [
            { style: "cancel", text: t("common.cancel") },
            {
                onPress: () => removeEndpoint({ endpointId: endpoint._id }),
                style: "destructive",
                text: t("settings.webhooks.removeAction"),
            },
        ]);

    const actionsFor = (endpoint: WebhookEndpoint): ActionMenuItem[] => {
        const remove: ActionMenuItem = {
            destructive: true,
            id: "remove",
            label: t("settings.webhooks.remove"),
            onPress: () => confirmRemove(endpoint),
        };
        if (!canManage) {
            return [remove];
        }
        return [
            {
                id: "test",
                label: t("settings.webhooks.test"),
                onPress: () => testEndpoint({ endpointId: endpoint._id }),
            },
            { id: "secret", label: t("settings.webhooks.newSecret"), onPress: () => rotateSecret(endpoint) },
            remove,
        ];
    };

    const submitAdd = () => {
        const url = addUrl.trim();
        if (minting.current || url === "") {
            return;
        }
        minting.current = true;
        setAddBusy(true);
        addEndpoint({ secret: newSigningSecret(), url });
    };

    const changeAddUrl = (next: string) => {
        setAddUrl(next);
        setAddError(null);
    };

    const openAdd = () => {
        if (minting.current) {
            return;
        }
        addOpen.current = true;
        addRef.current?.present();
    };

    const closeAdd = () => {
        addOpen.current = false;
        setAddUrl("");
        setAddError(null);
        const secret = secretAfterAdd.current;
        if (secret !== null) {
            secretAfterAdd.current = null;
            setShownSecret({ kind: "signing", value: secret });
        }
    };

    const closeSecret = () => {
        minting.current = false;
        setShownSecret(null);
    };

    const showReceive = status.inbound !== null || canManage;
    const showSend = status.endpoints.length > 0 || canManage;

    return (
        <>
            <SettingsScreen>
                {canManage ? null : <PlanPrompts />}
                {showReceive ? (
                    <SettingsSection
                        footer={t("settings.webhooks.receiveFooter")}
                        title={t("settings.webhooks.receive")}
                    >
                        {status.inbound === null && canManage ? (
                            <LinkRow icon="Key01" onPress={createToken} title={t("settings.webhooks.createToken")} />
                        ) : null}
                        {status.inbound === null ? null : (
                            <>
                                {inbound === null ? null : (
                                    <Pressable
                                        accessibilityLabel={t("settings.webhooks.copyUrl")}
                                        accessibilityRole="button"
                                        className="active:opacity-60"
                                        onPress={() => Clipboard.setString(inbound.full)}
                                    >
                                        <RowShell icon="Link01" title={t("settings.webhooks.url")}>
                                            <View className="flex-row items-center gap-2">
                                                <Text
                                                    className="text-muted text-caption shrink font-mono"
                                                    numberOfLines={1}
                                                >
                                                    {inbound.display}
                                                </Text>
                                                <HugeiconsIcon
                                                    color={colors.tint}
                                                    icon={Copy01Icon}
                                                    size={16}
                                                    strokeWidth={2.2}
                                                />
                                            </View>
                                        </RowShell>
                                    </Pressable>
                                )}
                                <RowShell icon="Key01" title={t("settings.webhooks.token")}>
                                    <Text className="text-muted text-caption font-mono">{`${TOKEN_HINT}${status.inbound.hint}`}</Text>
                                </RowShell>
                                <LinkRow
                                    icon="Clock01"
                                    title={t("settings.webhooks.lastUsed")}
                                    value={
                                        status.inbound.lastUsedAt === undefined
                                            ? t("settings.webhooks.never")
                                            : agoText(t, status.inbound.lastUsedAt, now)
                                    }
                                />
                                {canManage ? (
                                    <LinkRow
                                        icon="ArrowReloadHorizontal"
                                        onPress={createToken}
                                        title={t("settings.webhooks.rotate")}
                                    />
                                ) : null}
                                <LinkRow
                                    destructive
                                    icon="Delete02"
                                    onPress={confirmRevoke}
                                    title={t("settings.webhooks.revoke")}
                                />
                            </>
                        )}
                    </SettingsSection>
                ) : null}

                {showSend ? (
                    <SettingsSection
                        accessory={
                            canManage ? (
                                <Pressable
                                    accessibilityRole="button"
                                    className="flex-row items-center gap-1 active:opacity-60"
                                    onPress={openAdd}
                                >
                                    <HugeiconsIcon
                                        color={colors.tint}
                                        icon={PlusSignIcon}
                                        size={15}
                                        strokeWidth={2.4}
                                    />
                                    <Text className="text-tint text-subtitle font-sans-semibold">
                                        {t("settings.webhooks.add")}
                                    </Text>
                                </Pressable>
                            ) : undefined
                        }
                        footer={t("settings.webhooks.sendFooter")}
                        title={t("settings.webhooks.send")}
                    >
                        {status.endpoints.length === 0 ? (
                            <LinkRow icon="Plug" onPress={openAdd} title={t("settings.webhooks.addAddress")} />
                        ) : (
                            status.endpoints.map((endpoint) => (
                                <EndpointRow
                                    actions={actionsFor(endpoint)}
                                    colors={colors}
                                    endpoint={endpoint}
                                    key={endpoint._id}
                                    now={now}
                                />
                            ))
                        )}
                    </SettingsSection>
                ) : null}
            </SettingsScreen>

            <AddEndpointSheet
                busy={addBusy}
                error={addError}
                onChangeUrl={changeAddUrl}
                onDismiss={closeAdd}
                onSubmit={submitAdd}
                ref={addRef}
                url={addUrl}
            />
            <SecretSheet onDismiss={closeSecret} ref={secretRef} secret={shownSecret} />
        </>
    );
}

function EndpointRow({
    actions,
    colors,
    endpoint,
    now,
}: {
    actions: ActionMenuItem[];
    colors: ThemeColors;
    endpoint: WebhookEndpoint;
    now: number;
}) {
    const t = useTranslation();
    const state = endpointState(endpoint);
    const { lastDelivery } = endpoint;
    const detail = (() => {
        if (state === "off") {
            return t("settings.webhooks.state.offDetail");
        }
        if (state === "failing") {
            return lastDelivery === undefined
                ? t("settings.webhooks.state.nothing")
                : t("settings.webhooks.state.lastTryFailed", { when: agoText(t, lastDelivery.at, now) });
        }
        return lastDelivery === undefined
            ? t("settings.webhooks.state.nothing")
            : t("settings.webhooks.state.delivered", { when: agoText(t, lastDelivery.at, now) });
    })();
    const dot = { active: colors.income, failing: colors.warning, off: colors.danger }[state];

    return (
        <ActionMenu items={actions} owner={endpoint._id} press="tap">
            <RowShell
                detail={detail}
                flush
                leading={
                    <View
                        style={{
                            backgroundColor: dot,
                            borderRadius: DOT_SIZE / 2,
                            height: DOT_SIZE,
                            width: DOT_SIZE,
                        }}
                    />
                }
                title={endpointAddress(endpoint.url)}
                titleEllipsizeMode="middle"
            >
                <Text className={`text-body ${VALUE_TONE[state]}`}>{t(`settings.webhooks.state.${state}`)}</Text>
            </RowShell>
        </ActionMenu>
    );
}

function AddEndpointSheet({
    ref,
    busy,
    error,
    onChangeUrl,
    onDismiss,
    onSubmit,
    url,
}: {
    ref: RefObject<BottomSheetModal | null>;
    busy: boolean;
    error: string | null;
    onChangeUrl: (url: string) => void;
    onDismiss: () => void;
    onSubmit: () => void;
    url: string;
}) {
    const t = useTranslation();
    const colors = useColors();
    const sheetSurface = useSheetSurface();
    const slow = useLongWait(busy);

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing
            enablePanDownToClose={!busy}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            onDismiss={onDismiss}
            ref={ref}
        >
            <BottomSheetView style={{ paddingBottom: 24 }}>
                <SheetGestureRoot style={FIT_CONTENT}>
                    <View className="gap-3 px-5 pt-2">
                        <Text
                            accessibilityRole="header"
                            className="text-foreground font-sans-semibold text-body text-center"
                        >
                            {t("settings.webhooks.addAddress")}
                        </Text>
                        <View className="bg-surface rounded-[14px]">
                            <BottomSheetTextInput
                                accessibilityLabel={t("settings.webhooks.add.field")}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoFocus
                                keyboardType="url"
                                onChangeText={onChangeUrl}
                                placeholder={t("settings.webhooks.add.placeholder")}
                                placeholderTextColor={colors.muted}
                                returnKeyType="done"
                                style={{
                                    color: colors.foreground,
                                    fontFamily: ROUNDED,
                                    fontSize: 16,
                                    height: 46,
                                    paddingHorizontal: 14,
                                }}
                                value={url}
                            />
                        </View>
                        <Text className="text-muted text-subtitle leading-snug">
                            {t("settings.webhooks.add.disclosure")}
                        </Text>
                        <InlineFailure message={error} />
                        <Button
                            className="rounded-full"
                            disabled={busy || url.trim() === ""}
                            fullWidth
                            onPress={onSubmit}
                            size="lg"
                            variant="primary"
                        >
                            {slow ? (
                                <BusyText className="text-[18px] font-medium" color={colors.primaryForeground}>
                                    {t("settings.webhooks.add.busy")}
                                </BusyText>
                            ) : (
                                t("settings.webhooks.add")
                            )}
                        </Button>
                    </View>
                </SheetGestureRoot>
            </BottomSheetView>
        </BottomSheetModal>
    );
}

function SecretSheet({
    ref,
    secret,
    onDismiss,
}: {
    ref: RefObject<BottomSheetModal | null>;
    secret: ShownSecret | null;
    onDismiss: () => void;
}) {
    const t = useTranslation();
    const sheetSurface = useSheetSurface();
    const [copied, setCopied] = useState(false);

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing
            enablePanDownToClose
            onDismiss={() => {
                setCopied(false);
                onDismiss();
            }}
            ref={ref}
        >
            <BottomSheetView style={{ paddingBottom: 24 }}>
                <SheetGestureRoot style={FIT_CONTENT}>
                    <View className="gap-4 px-5 pt-2">
                        <Text
                            accessibilityRole="header"
                            className="text-foreground font-sans-semibold text-body text-center"
                        >
                            {t(
                                secret?.kind === "signing"
                                    ? "settings.webhooks.secret.signing"
                                    : "settings.webhooks.secret.token"
                            )}
                        </Text>
                        <Text className="text-foreground font-mono-medium text-caption" selectable>
                            {secret?.value ?? ""}
                        </Text>
                        <Text className="text-muted text-subtitle leading-snug">
                            {t("settings.webhooks.secret.once")}
                        </Text>
                        <Button
                            className="rounded-full"
                            disabled={secret === null}
                            fullWidth
                            onPress={() => {
                                if (secret !== null) {
                                    Clipboard.setString(secret.value);
                                    setCopied(true);
                                }
                            }}
                            size="lg"
                            variant="primary"
                        >
                            {t(copied ? "settings.webhooks.secret.copied" : "settings.webhooks.secret.copy")}
                        </Button>
                    </View>
                </SheetGestureRoot>
            </BottomSheetView>
        </BottomSheetModal>
    );
}
