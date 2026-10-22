import Search01Icon from "@hugeicons-pro/core-stroke-rounded/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { BusyText } from "@/components/busy-text";
import { CategoryIconTile } from "@/components/category-icon-tile";
import { ChoiceRow } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { SEARCH_FIELD } from "@/components/search-field-style";
import { Text, TextInput } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { accountsRepo, getAccountById } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import {
    installmentAppDomain,
    installmentAppsIn,
    installmentRegion,
    isInstallmentAppAccount,
    searchInstallmentApps,
} from "@/domain/institution-map";
import type { FoundInstallmentApp, InstallmentApp } from "@/domain/institution-map";
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
    searchable: boolean;
}

export function StepAccountInstallments({ accounts, onPick, searchable }: StepAccountInstallmentsProps) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const region = installmentRegion(useRegionCode());
    const caps = useAccountCaps();
    const liabilityRoute = useLiabilityCreateRoute();
    const [adding, setAdding] = useState<string | null>(null);
    const [query, setQuery] = useState("");
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
    const matches =
        searchable && query.trim() !== ""
            ? searchInstallmentApps(query, region).filter((app) => !taken.has(app.domain))
            : null;
    if (region === null && !searchable) {
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

    const where = (app: FoundInstallmentApp) => {
        const [home, ...others] = app.regions;
        const country = t(`installments.country.${home}`);
        return `${others.length > 0 ? `${country} +${others.length}` : country} · ${app.currency}`;
    };

    const options: StageOptionItem<string>[] = [
        ...(matches === null ? apps : []).map((app) => ({
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
            {searchable ? (
                <View className="border-border flex-row items-center gap-2 border-b pb-2">
                    <HugeiconsIcon color={colors.muted} icon={Search01Icon} size={16} strokeWidth={2} />
                    <TextInput
                        accessibilityLabel={t("installments.apps.search")}
                        autoCorrect={false}
                        clearButtonMode="while-editing"
                        onChangeText={setQuery}
                        placeholder={t("installments.apps.search")}
                        placeholderTextColor={colors.muted}
                        returnKeyType="search"
                        style={[SEARCH_FIELD, { color: colors.foreground }]}
                        value={query}
                    />
                </View>
            ) : null}
            {searchable || region === null ? null : (
                <MonoLabel>{t("installments.apps.in", { country: t(`installments.country.${region}`) })}</MonoLabel>
            )}
            {matches?.map((app) => (
                <ChoiceRow
                    key={app.id}
                    label={app.label}
                    leading={<InstallmentAppMark domain={app.domain} />}
                    onPress={() => {
                        if (adding === null) {
                            add(app);
                        }
                    }}
                    selected={false}
                    value={slow && adding === app.id ? t("installments.apps.adding") : where(app)}
                />
            ))}
            {matches === null ? null : (
                <Text className="text-footnote text-muted pt-1">{t("installments.apps.missing")}</Text>
            )}
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
