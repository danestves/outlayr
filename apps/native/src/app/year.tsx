import { useLocalSearchParams } from "expo-router";

import { Year } from "@/screens/year";

export default function YearScreen() {
    const { preview } = useLocalSearchParams<{ preview?: string }>();
    return <Year preview={preview === "1"} />;
}
