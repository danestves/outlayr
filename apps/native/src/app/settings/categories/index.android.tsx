import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { CategoryKindToggle } from "@/components/category-kind-toggle";
import { MaterialFab } from "@/components/material-fab";
import { useTranslation } from "@/i18n/context";
import { Categories } from "@/screens/categories";

export default function CategoriesScreen() {
    const router = useRouter();
    const t = useTranslation();
    const [income, setIncome] = useState(false);

    const goToNew = () => {
        router.push({
            params: { income: income ? "1" : "0" },
            pathname: "/settings/categories/create",
        });
    };

    return (
        <View className="bg-m3-surface flex-1">
            <View className="px-4 pt-2 pb-3">
                <CategoryKindToggle income={income} onChange={setIncome} />
            </View>
            <Categories income={income} />
            <MaterialFab label={t("categories.a11y.new")} onPress={goToNew} />
        </View>
    );
}
