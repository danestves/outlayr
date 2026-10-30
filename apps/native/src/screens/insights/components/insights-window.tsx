import type { MenuAction } from "@expo/ui/community/menu";
import type { Dispatch, SetStateAction } from "react";

import { useTranslation } from "@/i18n/context";

import { WindowStepper } from "./window-stepper";

interface InsightsWindowProps {
    atCurrent: boolean;
    atEarliest: boolean;
    label: string;
    onOffset: Dispatch<SetStateAction<number>>;
}

export function InsightsWindow({ atCurrent, atEarliest, label, onOffset }: InsightsWindowProps) {
    const t = useTranslation();

    const step = (direction: 1 | -1) => {
        onOffset((current) => (direction === 1 ? Math.min(0, current + 1) : current - 1));
    };

    const actions: MenuAction[] = [
        {
            attributes: { disabled: atEarliest },
            id: "earlier",
            image: "chevron.left",
            title: t("insights.window.earlier"),
        },
        {
            attributes: { disabled: atCurrent },
            id: "later",
            image: "chevron.right",
            title: t("insights.window.later"),
        },
        {
            displayInline: true,
            id: "now-section",
            subactions: [
                {
                    attributes: { disabled: atCurrent },
                    id: "now",
                    image: "arrow.uturn.backward",
                    title: t("insights.window.now"),
                },
            ],
            title: "",
        },
    ];

    const onAction = (event: string) => {
        if (event === "earlier") {
            step(-1);
        } else if (event === "later") {
            step(1);
        } else if (event === "now") {
            onOffset(0);
        }
    };

    return (
        <WindowStepper
            actions={actions}
            canStepBack={!atEarliest}
            canStepForward={!atCurrent}
            onAction={onAction}
            onStep={step}
            title={label}
        />
    );
}
