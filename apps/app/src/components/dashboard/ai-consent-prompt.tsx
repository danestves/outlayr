import { Button } from "panelui-web/button";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { SiteLink } from "@/components/site-link";

/** What one AI feature sends and keeps, asked before anything leaves the browser. */
export function AiConsentPrompt({ feature, fine, sends }: { feature: ReactNode; fine: ReactNode; sends: ReactNode }) {
    const { privacy, privacyHash, title } = useIntlayer("ai-consent");
    return (
        <div className="text-app-label flex flex-col gap-3">
            <h3 className="text-app-title font-semibold">{title}</h3>
            <div className="border-y py-2.5">
                <p className="font-medium">{feature}</p>
                <p className="text-muted-foreground">{sends}</p>
            </div>
            <p className="text-muted-foreground">
                {fine}{" "}
                <SiteLink
                    className="text-foreground underline underline-offset-2"
                    hash={privacyHash.value}
                    target="_blank"
                    to="/privacy"
                >
                    {privacy}
                </SiteLink>
            </p>
        </div>
    );
}

export function AiConsentActions({ onAllow, onDecline }: { onAllow: () => void; onDecline: () => void }) {
    const { allow, notNow } = useIntlayer("ai-consent");
    return (
        <>
            <Button onClick={onDecline} variant="secondary">
                {notNow}
            </Button>
            <Button onClick={onAllow}>{allow}</Button>
        </>
    );
}
