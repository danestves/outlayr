import { ScrollView } from "react-native";

import { useDatabase } from "@/contexts/local-data-context";
import { useNow } from "@/data/use-now";
import { YearView } from "@/screens/budgets/plan/year-view";

export default function YearPlanScreen() {
    const db = useDatabase();
    const nowMs = useNow();
    return (
        <ScrollView
            className="bg-background"
            contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
            contentInsetAdjustmentBehavior="automatic"
            style={{ flex: 1 }}
        >
            <YearView db={db} nowMs={nowMs} />
        </ScrollView>
    );
}
