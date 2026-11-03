import { useLocalSearchParams } from "expo-router";

import { CategoryDetail } from "@/screens/balances/category-detail";

export default function CategoryDetailScreen() {
    const { categoryId, month } = useLocalSearchParams<{ categoryId: string; month?: string }>();
    return <CategoryDetail categoryId={categoryId} initialMonthOffset={Math.min(0, Number(month) || 0)} />;
}
