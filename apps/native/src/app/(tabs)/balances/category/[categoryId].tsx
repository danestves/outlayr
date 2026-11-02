import { useLocalSearchParams } from "expo-router";

import { CategoryDetail } from "@/screens/balances/category-detail";

export default function CategoryDetailScreen() {
    const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
    return <CategoryDetail categoryId={categoryId} />;
}
