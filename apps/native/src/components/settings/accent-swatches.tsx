import { RowShell } from "@/components/list/row-shell";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { SwatchStrip } from "@/components/settings/swatch-strip";
import type { SwatchOption } from "@/components/settings/swatch-strip";

export interface AccentSwatchesProps {
    icon: SettingsIconName;
    onChange: (value: number) => void;
    options: readonly SwatchOption[];
    title: string;
    value: number;
}

export function AccentSwatches({ icon, onChange, options, title, value }: AccentSwatchesProps) {
    return (
        <RowShell icon={icon} title={title}>
            <SwatchStrip onChange={onChange} options={options} value={value} />
        </RowShell>
    );
}
