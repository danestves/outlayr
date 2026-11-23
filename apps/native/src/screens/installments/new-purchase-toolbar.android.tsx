import { ScreenHeader } from "@/components/screen-header";
import { useStageBack } from "@/components/transaction-form/stage/use-stage-back";

import type { PurchaseToolbarProps } from "./new-purchase-toolbar";

// The modal's app bar already carries the X; a step goes back on the system back press.
export function PurchaseToolbar({ onBack, title }: PurchaseToolbarProps) {
    useStageBack(onBack);
    return <ScreenHeader title={title} />;
}
