import { useLocalSearchParams } from "expo-router";

import { useDatabase } from "@/contexts/local-data-context";
import { MonthPlan } from "@/screens/budgets/plan/month-plan";

export default function MonthPlanScreen() {
    const { month } = useLocalSearchParams<{ month: string }>();
    const db = useDatabase();
    return <MonthPlan db={db} monthKey={Number(month)} />;
}
