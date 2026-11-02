import { useRouter } from "expo-router";

import { useDatabase } from "@/contexts/local-data-context";
import { OverallBudgetDetail } from "@/screens/budgets/components/overall-budget-detail";

export default function OverallBudgetScreen() {
    const router = useRouter();
    const db = useDatabase();
    return <OverallBudgetDetail db={db} onDone={() => router.back()} />;
}
