import { useLocalSearchParams } from "expo-router";

import { InstallmentScanScreen } from "@/screens/installments/scan";

export default function InstallmentScanRoute() {
    const { accountId, photo } = useLocalSearchParams<{ accountId?: string; photo?: string }>();

    return <InstallmentScanScreen accountId={accountId} photo={photo} />;
}
