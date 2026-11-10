import AppleIcon from "@hugeicons/core-free-icons/AppleIcon";
import Mic01Icon from "@hugeicons/core-free-icons/Mic01Icon";
import Notification03Icon from "@hugeicons/core-free-icons/Notification03Icon";
import PlayStoreIcon from "@hugeicons/core-free-icons/PlayStoreIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import type { OnboardingStep } from "@/lib/onboarding";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/site";

import { Plate, PlateFoot, PlateHead, QUIET, Staged, Tile, focusOnMount } from "./chrome";

function Way({ hint, icon, title }: { hint: ReactNode; icon: IconSvgElement; title: ReactNode }) {
    const { autoLog } = useIntlayer("dashboard-onboarding");
    return (
        <li className="border-border flex min-h-[66px] items-center gap-3 border-t px-4 py-2.5">
            <Tile>
                <HugeiconsIcon icon={icon} size={14} />
            </Tile>
            <span className="min-w-0 flex-1">
                <span className="block font-medium">{title}</span>
                <span className={`block ${QUIET}`}>{hint}</span>
            </span>
            <Badge className="text-muted-foreground" variant="outline">
                {autoLog.onPhone}
            </Badge>
        </li>
    );
}

export function AutoLog({ onContinue, onStep }: { onContinue: () => void; onStep: (step: OnboardingStep) => void }) {
    const { autoLog } = useIntlayer("dashboard-onboarding");
    return (
        <Staged current="auto-log" layout="justify-center md:grid-cols-[640px]" onPick={onStep}>
            <Plate>
                <PlateHead title={autoLog.title} />
                <ul>
                    <Way hint={autoLog.siriHint} icon={Mic01Icon} title="Siri" />
                    <Way hint={autoLog.applePayHint} icon={AppleIcon} title="Apple Pay" />
                    <Way hint={autoLog.bankHint} icon={Notification03Icon} title={autoLog.bank} />
                </ul>
                <PlateFoot>
                    <Button
                        render={
                            <a aria-label="App Store" href={APP_STORE_URL} rel="noopener noreferrer" target="_blank" />
                        }
                        size="sm"
                        variant="outline"
                    >
                        <HugeiconsIcon className="text-muted-foreground" icon={AppleIcon} />
                        App Store
                    </Button>
                    <Button
                        render={
                            <a
                                aria-label="Google Play"
                                href={PLAY_STORE_URL}
                                rel="noopener noreferrer"
                                target="_blank"
                            />
                        }
                        size="sm"
                        variant="outline"
                    >
                        <HugeiconsIcon className="text-muted-foreground" icon={PlayStoreIcon} />
                        Google Play
                    </Button>
                    <Button className="ml-auto" onClick={onContinue} ref={focusOnMount}>
                        {autoLog.continue}
                    </Button>
                </PlateFoot>
            </Plate>
        </Staged>
    );
}
