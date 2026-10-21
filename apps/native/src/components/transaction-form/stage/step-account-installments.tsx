import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { BusyText } from "@/components/busy-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { accountsRepo, getAccountById } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import {
    installmentAppDomain,
    installmentAppsIn,
    installmentRegion,
    isInstallmentAppAccount,
} from "@/domain/institution-map";
import type { InstallmentApp } from "@/domain/institution-map";
import { useLongWait } from "@/hooks/use-long-wait";
import { useMerchantMark } from "@/hooks/use-merchant-mark";
import { useAccountCaps, useLiabilityCreateRoute } from "@/hooks/use-pro-gate";
import { useRegionCode } from "@/hooks/use-region-code";
import { useTranslation } from "@/i18n/context";
import { fetchMerchantImage } from "@/lib/logo-fetch";
import { notifyFailure } from "@/lib/notify";
import { persistLogo } from "@/lib/persist-logo";
import { useColors } from "@/theme/use-colors";

import { StageOptionRow } from "./stage-options";
import type { StageOptionItem } from "./stage-options";

const OTHER = "__other__";

const TILE = 22;

interface StepAccountInstallmentsProps {
    accounts: readonly Account[];
    onPick: (account: Account) => void;
}

export function StepAccountInstallments({ accounts, onPick }: StepAccountInstallmentsProps) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const region = installmentRegion(useRegionCode());
    const caps = useAccountCaps();
    const liabilityRoute = useLiabilityCreateRoute();
    const [adding, setAdding] = useState<string | null>(null);
    const slow = useLongWait(adding !== null);
    // The ids the editor was opened over; the one it adds is the account to pick.
    const before = useRef<ReadonlySet<string> | null>(null);

    useEffect(() => {
        const known = before.current;
        const made = known === null ? undefined : accounts.find((account) => !known.has(account.id));
        if (made) {
            before.current = null;
            onPick(made);
        }
    }, [accounts, onPick]);

    const taken = new Set(
        accounts.filter(isInstallmentAppAccount).map((account) => installmentAppDomain(account.name))
    );
    const apps = installmentAppsIn(region).filter((app) => !taken.has(app.domain));
    if (region === null) {
        return null;
    }

    const add = async (app: InstallmentApp) => {
        before.current = null;
        if (caps.installmentApps) {
            router.push("/paywall");
            return;
        }
        setAdding(app.id);
        try {
            // Fetched before the account exists, since the entry holds the account as picked. Named by its domain, as
            // the mark is, so both read the same cache entry.
            const outcome = await fetchMerchantImage({ domain: app.domain, name: app.domain });
            const logo = outcome.kind === "logo" ? await persistLogo(outcome.bytes) : null;
            const id = await accountsRepo.create(db, {
                currency: app.currency,
                kind: "liability",
                name: app.label,
                ...logo,
            });
            const account = getAccountById(db, id);
            if (account) {
                onPick(account);
            }
        } catch (error) {
            console.error("Failed to add the installment app", error);
            notifyFailure({ body: t("installments.failedBody"), title: t("installments.failedTitle") });
        } finally {
            setAdding(null);
        }
    };

    const other = () => {
        before.current = new Set(accounts.map((account) => account.id));
        router.push(
            liabilityRoute === "/paywall" ? "/paywall" : { params: { kind: "liability" }, pathname: liabilityRoute }
        );
    };

    const options: StageOptionItem<string>[] = [
        ...apps.map((app) => ({
            accessibilityLabel: `${app.label}, ${t("installments.apps.add")}`,
            id: app.id,
            label: app.label,
            leading: <InstallmentAppMark domain={app.domain} />,
            trailing:
                slow && adding === app.id ? (
                    <BusyText className="text-label" color={colors.tint}>
                        {t("installments.apps.adding")}
                    </BusyText>
                ) : (
                    <Text className="text-label text-tint">{t("installments.apps.add")}</Text>
                ),
        })),
        { id: OTHER, label: t("installments.apps.other") },
    ];

    return (
        <View className="gap-2 pt-4">
            <MonoLabel>{t("installments.apps.in", { country: t(`installments.country.${region}`) })}</MonoLabel>
            <StageOptionRow
                onSelect={(id) => {
                    const app = apps.find((candidate) => candidate.id === id);
                    if (id === OTHER) {
                        other();
                    } else if (app && adding === null) {
                        add(app);
                    }
                }}
                options={options}
            />
        </View>
    );
}

function InstallmentAppMark({ domain }: { domain: string }) {
    const colors = useColors();
    const uri = useMerchantMark(null, domain);
    return uri === null ? null : (
        <CategoryIconTile color={colors.foreground} icon={null} imageUri={uri} radius={6} size={TILE} type="solid" />
    );
}
