import { useLocalSearchParams } from "expo-router";

import { PayInstallment } from "@/screens/installments/pay";

export default function PayInstallmentRoute() {
    const { all, fromPush, planId } = useLocalSearchParams<{ all?: string; fromPush?: string; planId: string }>();

    return <PayInstallment all={all === "1"} fromPush={fromPush} planId={planId} />;
}
