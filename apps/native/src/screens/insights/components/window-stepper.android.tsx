import { ScopeChip } from "@/components/scope-chip";
import { useTranslation } from "@/i18n/context";

import type { WindowStepper as WindowStepperBase } from "./window-stepper";

export const WindowStepper: typeof WindowStepperBase = ({ actions, onAction, title }) => {
    const t = useTranslation();
    return (
        <ScopeChip
            accessibilityLabel={t("insights.window.shown")}
            actions={actions}
            menuTitle={t("insights.window.title")}
            onAction={onAction}
            title={title}
        />
    );
};
