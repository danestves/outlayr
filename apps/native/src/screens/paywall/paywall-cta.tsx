import { Button } from "panelui-native/components/button";

import { BusyText } from "@/components/busy-text";
import { useColors } from "@/theme/use-colors";

export interface PaywallCtaProps {
    busy: boolean;
    busyLabel: string;
    disabled: boolean;
    label: string;
    onPress: () => void;
    testID?: string;
}

export function PaywallCta({ busy, busyLabel, disabled, label, onPress, testID }: PaywallCtaProps) {
    const colors = useColors();
    return (
        <Button
            className="rounded-full"
            disabled={disabled}
            fullWidth
            onPress={onPress}
            size="md"
            testID={testID}
            variant="primary"
        >
            {busy ? (
                <BusyText className="text-[16px] font-medium" color={colors.primaryForeground}>
                    {busyLabel}
                </BusyText>
            ) : (
                label
            )}
        </Button>
    );
}
