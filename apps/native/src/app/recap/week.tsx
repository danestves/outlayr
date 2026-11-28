import { useLocalSearchParams } from "expo-router";

import { WeekRecap } from "@/screens/recap/week";

export default function WeekRecapScreen() {
    const { week } = useLocalSearchParams<{ week?: string }>();
    return <WeekRecap week={week} />;
}
