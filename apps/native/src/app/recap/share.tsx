import { useLocalSearchParams } from "expo-router";

import { RecapShare } from "@/screens/recap/share";

export default function RecapShareScreen() {
    const { month } = useLocalSearchParams<{ month?: string }>();
    return <RecapShare month={month} />;
}
