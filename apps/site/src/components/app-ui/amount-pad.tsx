import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import { HugeiconsIcon } from "@hugeicons/react";

import { useReplica } from "./canvas";
import { GLASS_SURFACE } from "./chrome";
import { amountParts, currencyFor } from "./money";

const ROWS = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "back"],
] as const;

const DELETE_BOX = { height: 14.33, width: 16.67 } as const;

export function DeleteLeft({
    color = "var(--foreground)",
    width = DELETE_BOX.width,
}: {
    color?: string;
    width?: number;
}) {
    return (
        <svg
            fill="none"
            height={(width * DELETE_BOX.height) / DELETE_BOX.width}
            viewBox={`0 0 ${DELETE_BOX.width} ${DELETE_BOX.height}`}
            width={width}
        >
            <path
                d="M5.6 0.8H13.37A2.5 2.5 0 0 1 15.87 3.3V11.03A2.5 2.5 0 0 1 13.37 13.53H5.6A1.6 1.6 0 0 1 4.4 12.98L1.25 8.2A1.6 1.6 0 0 1 1.25 6.13L4.4 1.35A1.6 1.6 0 0 1 5.6 0.8Z M8 4.77L12.8 9.57M12.8 4.77L8 9.57"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
            />
        </svg>
    );
}

export function CurrencyPill() {
    const { locale } = useReplica();
    return (
        <div
            className="min-h-[42px] flex-row items-center justify-center gap-1.5 overflow-hidden rounded-full pr-3 pl-4"
            style={GLASS_SURFACE}
        >
            <span className="text-callout text-foreground tracking-eyebrow font-mono-medium">
                {currencyFor(locale)}
            </span>
            <HugeiconsIcon color="var(--muted)" icon={ArrowDown01Icon} size={16} />
        </div>
    );
}

export function AmountNumpad() {
    const { locale } = useReplica();
    const { decimal } = amountParts(0, currencyFor(locale), locale);
    return (
        <div className="gap-2">
            {ROWS.map((row) => (
                <div className="flex-row gap-2" key={row.join(",")}>
                    {row.map((key) => (
                        <div
                            className="min-h-12 w-0 flex-1 items-center justify-center overflow-hidden rounded-xl"
                            key={key}
                            style={GLASS_SURFACE}
                        >
                            {key === "back" ? (
                                <DeleteLeft />
                            ) : (
                                <span className="font-sans-medium text-foreground text-[23px]">
                                    {key === "." ? decimal : key}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
