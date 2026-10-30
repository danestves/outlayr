import { useAtomValue } from "@effect/atom-react/Hooks";
import ArrowRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowRight01Icon";
import ArrowUpRight01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowUpRight01Icon";
import User02Icon from "@hugeicons-pro/core-stroke-rounded/User02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { Progress } from "panelui-native/components/progress";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { panelClasses, usePanelIcons } from "@/components/settings/account-panel-theme";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDatabase } from "@/contexts/local-data-context";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { useSyncStatus } from "@/data/use-sync-status";
import { accountLabel } from "@/domain/account";
import type { AccountState } from "@/domain/account";
import { accountInitials } from "@/domain/account-initials";
import { paywallHref } from "@/domain/paywall-trigger";
import { syncedAgo, syncPaused, syncStatusLabel } from "@/domain/sync-status";
import { projectLimit } from "@/domain/usage-limits";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { useTickingNow, useUsageLimits } from "@/hooks/use-usage-limits";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { authClient, useAuthClientSession } from "@/lib/auth-client";
import { useAuthSession } from "@/lib/auth-session";
import type { ProviderBinding } from "@/lib/provider-revocation";
import { signInProviderAtom } from "@/lib/sign-in-provider";

const AVATAR_FONT_CAP = 1.2;
const ACCOUNT_HREF = "/settings/account" satisfies Href;

type Provider = ProviderBinding["provider"];

const SIGNED_IN_WITH = {
    apple: "settings.panel.signedInApple",
    google: "settings.panel.signedInGoogle",
} as const satisfies Partial<Record<Provider, TranslationKey>>;

export function AccountPanel() {
    if (authClient === null) {
        return <Panel provider={null} state={{ kind: "signed-out" }} />;
    }
    return <SessionPanel />;
}

function SessionPanel() {
    const { data: session, isPending } = useAuthClientSession();
    const { accountId } = useAuthSession();
    const provider = AsyncResult.getOrElse(useAtomValue(signInProviderAtom(session?.user.id ?? null)), () => null);

    if (session && accountId !== null) {
        return <Panel provider={provider} state={{ kind: "signed-in", user: session.user }} />;
    }
    return <Panel provider={null} state={{ kind: isPending ? "pending" : "signed-out" }} />;
}

function Panel({ provider, state }: { provider: Provider | null; state: AccountState }) {
    const stacked = useAccessibilityTextSize();
    const signedIn = state.kind === "signed-in";
    return (
        <View className="pt-4">
            <Identity provider={provider} state={state} />
            {state.kind === "pending" ? null : (
                <View className={cn("border-y", panelClasses.border, stacked ? "flex-col" : "flex-row")}>
                    <PlanCell stacked={stacked} />
                    {signedIn ? <CapturesCell stacked={stacked} /> : null}
                    {signedIn ? <SyncCell stacked={stacked} /> : <SignedOutSyncCell stacked={stacked} />}
                </View>
            )}
        </View>
    );
}

function Identity({ provider, state }: { provider: Provider | null; state: AccountState }) {
    const router = useRouter();
    const t = useTranslation();
    const icons = usePanelIcons();

    if (state.kind === "signed-in") {
        const title = accountLabel(state.user, t);
        const email = state.user?.email?.trim();
        const signedInWith = provider === null || provider === "password" ? null : SIGNED_IN_WITH[provider];
        const emailDetail = email && email !== title ? email : t("settings.account.signedInFallback");
        const detail = signedInWith ? t(signedInWith) : emailDetail;
        const initials = accountInitials(state.user);
        return (
            <Pressable
                accessibilityLabel={`${title}, ${detail}`}
                accessibilityRole="button"
                className="flex-row items-center gap-4 py-4 active:opacity-60"
                onPress={() => router.push(ACCOUNT_HREF)}
            >
                <View className={cn("size-13 items-center justify-center rounded-full", panelClasses.avatar)}>
                    {initials ? (
                        <Text
                            className={cn("font-sans-semibold text-callout", panelClasses.avatarText)}
                            maxFontSizeMultiplier={AVATAR_FONT_CAP}
                        >
                            {initials}
                        </Text>
                    ) : (
                        <HugeiconsIcon color={icons.avatar} icon={User02Icon} size={24} strokeWidth={1.8} />
                    )}
                </View>
                <View className="flex-1">
                    <Text className={cn("font-sans-semibold text-headline", panelClasses.foreground)} numberOfLines={1}>
                        {title}
                    </Text>
                    <Text className={cn("text-subtitle", panelClasses.muted)} numberOfLines={1}>
                        {detail}
                    </Text>
                </View>
                <HugeiconsIcon color={icons.chevron} icon={ArrowRight01Icon} size={16} strokeWidth={2.2} />
            </Pressable>
        );
    }

    const placeholder = (
        <View className={cn("size-13 items-center justify-center rounded-full border", panelClasses.avatarOutline)}>
            <HugeiconsIcon color={icons.outline} icon={User02Icon} size={24} strokeWidth={1.6} />
        </View>
    );

    if (state.kind === "pending") {
        return (
            <View className="flex-row items-center gap-4 py-4">
                {placeholder}
                <Text className={cn("font-sans-semibold text-headline flex-1", panelClasses.muted)} numberOfLines={1}>
                    {t("settings.account.checking")}
                </Text>
            </View>
        );
    }

    const title = t("settings.account.notSignedIn");
    const detail = t("settings.panel.signedOutDetail");
    return (
        <Pressable
            accessibilityLabel={`${title}, ${detail}, ${t("settings.account.signIn")}`}
            accessibilityRole="button"
            className="flex-row items-center gap-4 py-4 active:opacity-60"
            onPress={() => router.push(ACCOUNT_HREF)}
        >
            {placeholder}
            <View className="flex-1">
                <Text className={cn("font-sans-semibold text-headline", panelClasses.foreground)}>{title}</Text>
                <Text className={cn("text-subtitle", panelClasses.muted)}>{detail}</Text>
            </View>
            <View className={cn("rounded-full px-5 py-2.5", panelClasses.pill)}>
                <Text className={cn("font-sans-semibold text-subtitle", panelClasses.pillText)}>
                    {t("settings.account.signIn")}
                </Text>
            </View>
        </Pressable>
    );
}

interface CellProps {
    accessibilityLabel: string;
    children: ReactNode;
    divided: boolean;
    label: string;
    onPress: () => void;
    stacked: boolean;
}

function Cell({ accessibilityLabel, children, divided, label, onPress, stacked }: CellProps) {
    return (
        <Pressable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            className={cn(
                "gap-0.5 py-3 active:opacity-60",
                panelClasses.border,
                !stacked && "flex-1 pr-3",
                divided && (stacked ? "border-t" : "border-l pl-3")
            )}
            onPress={onPress}
        >
            <Text className={cn("text-footnote", panelClasses.muted)} numberOfLines={1}>
                {label}
            </Text>
            {children}
        </Pressable>
    );
}

function CellValue({ children }: { children: ReactNode }) {
    return <Text className={cn("font-sans-semibold text-callout", panelClasses.foreground)}>{children}</Text>;
}

function StatusValue({ active, children }: { active: boolean; children: string }) {
    return (
        <View className="flex-row items-center gap-1.5">
            <View className={cn("size-2 rounded-full", active ? panelClasses.dotOn : panelClasses.dotOff)} />
            <View className="shrink">
                <CellValue>{children}</CellValue>
            </View>
        </View>
    );
}

function PlanCell({ stacked }: { stacked: boolean }) {
    const router = useRouter();
    const t = useTranslation();
    const icons = usePanelIcons();
    const isPro = useRevenueCat().kind === "pro";
    const label = t("settings.panel.plan");
    const value = isPro ? t("pro.col.pro") : t("pro.col.free");
    const goPro = t("settings.panel.goPro");
    return (
        <Cell
            accessibilityLabel={isPro ? `${label}, ${value}` : `${label}, ${value}, ${goPro}`}
            divided={false}
            label={label}
            onPress={() => router.push(paywallHref("settings"))}
            stacked={stacked}
        >
            <CellValue>{value}</CellValue>
            {isPro ? null : (
                <View className="flex-row items-center gap-1">
                    <Text className={cn("text-subtitle", panelClasses.link)}>{goPro}</Text>
                    <HugeiconsIcon color={icons.link} icon={ArrowUpRight01Icon} size={14} strokeWidth={2.2} />
                </View>
            )}
        </Cell>
    );
}

function CapturesCell({ stacked }: { stacked: boolean }) {
    const router = useRouter();
    const t = useTranslation();
    const limits = useUsageLimits();
    const now = useTickingNow(false);
    const label = t("settings.panel.capturesLeft");
    const captures = limits ? projectLimit(limits.captures, now) : null;
    return (
        <Cell
            accessibilityLabel={
                captures
                    ? `${label}, ${captures.left}, ${t("settings.usage.captures", { count: captures.capacity })}`
                    : label
            }
            divided
            label={label}
            onPress={() => router.push("/settings/usage")}
            stacked={stacked}
        >
            <Text
                className={cn(
                    "font-sans-semibold text-callout tabular-nums",
                    captures ? panelClasses.foreground : panelClasses.muted
                )}
            >
                {captures ? captures.left : "–"}
                {captures ? (
                    <Text
                        className={cn("text-subtitle font-sans", panelClasses.muted)}
                    >{` / ${captures.capacity}`}</Text>
                ) : null}
            </Text>
            {captures ? (
                <View className="pt-1">
                    <Progress
                        indicatorClassName={panelClasses.progress}
                        maxValue={captures.capacity}
                        size="sm"
                        value={captures.left}
                    />
                </View>
            ) : (
                <View className="h-2.5" />
            )}
        </Cell>
    );
}

function SyncCell({ stacked }: { stacked: boolean }) {
    const router = useRouter();
    const t = useTranslation();
    const sync = useSyncStatus(useDatabase());
    const proEntitled = useProEntitled();
    const syncLabel = syncStatusLabel({
        enabled: sync.enabled,
        paused: syncPaused(sync.enabled, proEntitled),
        pending: sync.pending,
        syncedAt: sync.syncedAt,
    });
    const value = syncLabel.count === undefined ? t(syncLabel.key) : t(syncLabel.key, { count: syncLabel.count });
    const now = useTickingNow(sync.syncedAt !== null);
    const upToDate = syncLabel.key === "settings.sync.upToDate";
    const agoLabel = upToDate && sync.syncedAt ? syncedAgo(sync.syncedAt, now) : null;
    const ago = agoLabel ? t(agoLabel.key, { count: agoLabel.count ?? 0 }) : null;
    const label = t("settings.row.sync");
    return (
        <Cell
            accessibilityLabel={ago ? `${label}, ${value}, ${ago}` : `${label}, ${value}`}
            divided
            label={label}
            onPress={() => router.push("/settings/sync")}
            stacked={stacked}
        >
            <StatusValue active={upToDate}>{value}</StatusValue>
            {ago ? <Text className={cn("text-subtitle", panelClasses.muted)}>{ago}</Text> : null}
        </Cell>
    );
}

function SignedOutSyncCell({ stacked }: { stacked: boolean }) {
    const router = useRouter();
    const t = useTranslation();
    const label = t("settings.row.sync");
    const value = t("common.off");
    const hint = t("settings.panel.signInToSync");
    return (
        <Cell
            accessibilityLabel={`${label}, ${value}, ${hint}`}
            divided
            label={label}
            onPress={() => router.push(ACCOUNT_HREF)}
            stacked={stacked}
        >
            <StatusValue active={false}>{value}</StatusValue>
            <Text className={cn("text-subtitle", panelClasses.muted)}>{hint}</Text>
        </Cell>
    );
}
