import { THEMES, chooseTheme, readTheme, subscribeTheme } from "@outlayr/shared/theme";
import { useSyncExternalStore } from "react";
import { useIntlayer } from "react-intlayer";

import { SELECT } from "./select";

export function ThemeSwitch() {
    const { theme: labels } = useIntlayer("site");
    const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "system");

    return (
        <label className="relative">
            <span className="sr-only">{labels.label}</span>
            <select
                className={SELECT}
                onChange={(event) => {
                    const choice = THEMES.find((option) => option === event.target.value);
                    if (choice) {
                        chooseTheme(choice);
                    }
                }}
                value={theme}
            >
                {THEMES.map((option) => (
                    <option key={option} value={option}>
                        {labels[option].value}
                    </option>
                ))}
            </select>
        </label>
    );
}
