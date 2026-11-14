import { useSyncExternalStore } from "react";
import { useIntlayer } from "react-intlayer";

import { chooseConsent, readConsent, subscribeConsent } from "@/lib/analytics";

import { SELECT } from "./select";

export function ConsentSwitch() {
    const { consent: labels } = useIntlayer("site");
    const consent = useSyncExternalStore(subscribeConsent, readConsent, () => null);
    if (consent === null) {
        return null;
    }
    return (
        <label className="relative">
            <span className="sr-only">{labels.label}</span>
            <select
                className={SELECT}
                onChange={(event) => chooseConsent(event.target.value === "granted")}
                value={consent === "granted" ? "granted" : "denied"}
            >
                <option value="granted">
                    {labels.label} · {labels.allow.value}
                </option>
                <option value="denied">
                    {labels.label} · {labels.decline.value}
                </option>
            </select>
        </label>
    );
}
