import { ConsentBanner } from "@outlayr/shared/consent-banner";
import { useIntlayer } from "react-intlayer";

import { LocalizedLink } from "./localized-link";

export function SiteConsentBanner() {
    const { consent: labels } = useIntlayer("site");
    return (
        <ConsentBanner
            labels={labels}
            privacyLink={
                <LocalizedLink
                    className="fluid text-muted hover:text-foreground text-sm underline underline-offset-4"
                    hash={labels.anchor.value}
                    to="/privacy"
                >
                    {labels.privacy}
                </LocalizedLink>
            }
        />
    );
}
