import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import Wallet01Icon from "@hugeicons-pro/core-stroke-rounded/Wallet01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { isPerson } from "@outlayr/money/account-kind";
import * as Cause from "effect/Cause";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useCSSVariable } from "uniwind";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { FirstRun } from "@/components/first-run";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccounts } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import { accountPicksFor, CASH_PICK, splitByFreeLimits } from "@/domain/onboarding-accounts";
import type { AccountPick } from "@/domain/onboarding-accounts";
import { FREE_ACCOUNTS, FREE_CURRENCIES } from "@/domain/pro-limits";
import { useMerchantMark } from "@/hooks/use-merchant-mark";
import { useProConfirmed } from "@/hooks/use-pro-locked";
import { useRegionCode } from "@/hooks/use-region-code";
import { useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { createOnboardingAccountsCommand } from "@/state/onboarding-commands";
import { useAtomAction } from "@/state/use-atom-action";

const TILE = 28;

function PickMark({ domain, muted }: { domain: string | null; muted: string }) {
    const uri = useMerchantMark(null, domain);
    if (domain === null || uri === null) {
        return (
            <View className="items-center justify-center" style={{ height: TILE, width: TILE }}>
                <HugeiconsIcon color={muted} icon={Wallet01Icon} size={20} />
            </View>
        );
    }
    return <CategoryIconTile color={muted} icon={null} imageUri={uri} radius={7} size={TILE} type="solid" />;
}

function PickRow({
    checked,
    disabled,
    first,
    onToggle,
    pick,
}: {
    checked: boolean;
    disabled: boolean;
    first: boolean;
    onToggle: () => void;
    pick: AccountPick;
}) {
    // SAFETY: both are declared in global.css for both schemes, so they always resolve.
    const [muted, vermilion] = useCSSVariable(["--color-fr-muted", "--color-fr-vermilion"]) as [string, string];
    return (
        <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled }}
            className={cn(
                "border-fr-rule flex-row items-center gap-3.5 border-b py-3 active:opacity-60",
                first && "border-t"
            )}
            disabled={disabled}
            onPress={onToggle}
        >
            <PickMark domain={pick.domain} muted={muted} />
            <Text className="text-body text-fr-ink flex-1" numberOfLines={1}>
                {pick.label}
            </Text>
            <MonoLabel className="text-fr-muted">{pick.currency}</MonoLabel>
            <View className="w-5 items-center">
                {checked ? <HugeiconsIcon color={vermilion} icon={Tick02Icon} size={20} strokeWidth={2.4} /> : null}
            </View>
        </Pressable>
    );
}

export function OnboardingAccounts() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const haptics = useHaptics();
    const region = useRegionCode();
    const home = useGlobalCurrency(db);
    // Free limits until Pro is confirmed: a stalled store lookup must not let a Free user past both caps.
    const locked = !useProConfirmed();
    const held = useAccounts(db).filter((account) => !isPerson(account));
    const heldNames = new Set(held.map((account) => account.name));
    const picks = accountPicksFor(region, home, t("onboarding.accounts.cash"));
    const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set([CASH_PICK]));
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState(false);

    const fresh = picks.filter((pick) => picked.has(pick.id) && !heldNames.has(pick.label));
    const { now, waiting } = splitByFreeLimits(fresh, held, locked);
    const shown = [...held.map((account) => account.currency), ...fresh.map((pick) => pick.currency)];
    const accountCount = held.length + fresh.length;

    const next = () => router.push("/onboarding/auto-log");
    const createAccounts = useAtomAction(
        createOnboardingAccountsCommand,
        {
            onFailure: (cause) => {
                console.error("Creating the onboarding accounts failed", Cause.squash(cause));
                haptics("error");
                setFailed(true);
            },
            onSettled: () => setSaving(false),
            onSuccess: next,
        },
        SILENT
    );

    const toggle = (id: string) => {
        setPicked((before) => {
            const after = new Set(before);
            if (!after.delete(id)) {
                after.add(id);
            }
            return after;
        });
    };

    // Skip saves too, so picks left waiting by an earlier visit to this step are cleared.
    const save = (skip: boolean) => {
        if (saving) {
            return;
        }
        setSaving(true);
        setFailed(false);
        createAccounts(skip ? { db, now: [], waiting: [] } : { db, now, waiting });
    };

    return (
        <FirstRun
            action={{ disabled: saving, label: t("common.continue"), onPress: () => save(false) }}
            error={failed ? t("onboarding.accounts.failed") : null}
            eyebrow={t("onboarding.accounts.eyebrow")}
            footnote={
                waiting.length > 0
                    ? t("onboarding.accounts.overFree", {
                          accounts: FREE_ACCOUNTS,
                          count: waiting.length,
                          currencies: FREE_CURRENCIES,
                      })
                    : undefined
            }
            skip={{ label: t("onboarding.accounts.skip"), onPress: () => save(true) }}
            title={t("onboarding.accounts.title")}
        >
            <ScrollView className="shrink grow-0">
                <View className="items-end pb-2">
                    <MonoLabel className="text-fr-muted">
                        {`${t("onboarding.accounts.accounts", { count: accountCount })} · ${t("onboarding.accounts.currencies", { count: new Set(shown).size })}`}
                    </MonoLabel>
                </View>
                {picks.map((pick, index) => {
                    const kept = heldNames.has(pick.label);
                    return (
                        <PickRow
                            checked={kept || picked.has(pick.id)}
                            disabled={kept || saving}
                            first={index === 0}
                            key={pick.id}
                            onToggle={() => toggle(pick.id)}
                            pick={pick}
                        />
                    );
                })}
            </ScrollView>
        </FirstRun>
    );
}
