import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { CurrencyPickerList } from "@/components/currency-picker-list";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useFavouriteCurrencies } from "@/data/favourite-currencies";
import { setCurrency } from "@/data/settings-core";
import { useToggleFavouriteCurrency } from "@/hooks/use-toggle-favourite-currency";
import { useTranslation } from "@/i18n/context";

export function Currency() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const selected = useGlobalCurrency(db);
    const favourites = useFavouriteCurrencies(db);
    const [query, setQuery] = useState("");

    const onSelect = (code: string) => {
        setCurrency(db, code).then(() => router.back());
    };

    const onToggleFavourite = useToggleFavouriteCurrency(db);

    return (
        <View className="bg-background flex-1">
            <Stack.SearchBar
                autoCapitalize="characters"
                hideWhenScrolling={false}
                onChangeText={(event) => setQuery(event.nativeEvent.text)}
                // Android only: collapsing the field back into its icon drops the filter with it.
                onClose={() => setQuery("")}
                placeholder={t("settings.currency.search")}
            />
            <CurrencyPickerList
                contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
                favourites={favourites}
                onSelect={onSelect}
                onToggleFavourite={onToggleFavourite}
                query={query}
                selected={selected}
            />
        </View>
    );
}
