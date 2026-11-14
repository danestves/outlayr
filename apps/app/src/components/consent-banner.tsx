import { ConsentBanner } from "@outlayr/shared/consent-banner";
import { useIntlayer } from "react-intlayer";

import { SiteLink } from "./site-link";

export function AppConsentBanner() {
    const labels = useIntlayer("consent");
    return (
        <ConsentBanner
            labels={labels}
            privacyLink={
                <SiteLink
                    className="text-muted hover:text-foreground text-sm underline underline-offset-4"
                    hash={labels.anchor.value}
                    target="_blank"
                    to="/privacy"
                >
                    {labels.privacy}
                </SiteLink>
            }
        />
    );
}
