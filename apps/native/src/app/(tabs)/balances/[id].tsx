import { useLocalSearchParams, useRouter } from "expo-router";

import { useDatabase } from "@/contexts/local-data-context";
import { BudgetDetail } from "@/screens/budgets/detail";

export default function BudgetDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const db = useDatabase();

    return <BudgetDetail db={db} id={id} onDone={() => router.back()} />;
}
