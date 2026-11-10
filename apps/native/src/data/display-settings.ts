import type { SettingsSnapshot } from "./settings";

export interface DisplaySettings {
    showCents: boolean;
    swapTimeLabel: boolean;
    use24Hour: boolean;
}

export function selectDisplaySettings(snapshot: SettingsSnapshot): DisplaySettings {
    return {
        showCents: snapshot.get("showCents"),
        swapTimeLabel: snapshot.get("swapTimeLabel"),
        use24Hour: snapshot.get("use24HourClock"),
    };
}
