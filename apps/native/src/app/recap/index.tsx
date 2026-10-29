import { useLocalSearchParams } from "expo-router";

import { Recap } from "@/screens/recap";

export default function RecapScreen() {
    const { month } = useLocalSearchParams<{ month?: string }>();
    return <Recap month={month} />;
}
