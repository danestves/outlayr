import { useRouter } from "expo-router";

import { useDatabase } from "@/contexts/local-data-context";
import { useAiConsent } from "@/data/settings";
import { newId } from "@/domain/ids";
import { photoFrom } from "@/hooks/use-receipt-scan";
import type { ScanPhoto } from "@/hooks/use-receipt-scan";
import { useAuthSession } from "@/lib/auth-session";
import { SILENT } from "@/state/atom-command";
import { pickInstallmentPhotoCommand } from "@/state/installment-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";

let handedOff: { photo: ScanPhoto; token: string } | null = null;

function handOff(photo: ScanPhoto): string {
    handedOff = { photo, token: newId() };
    return handedOff.token;
}

export function handedOffPhoto(token: string | undefined): ScanPhoto | null {
    return handedOff !== null && handedOff.token === token ? handedOff.photo : null;
}

export function useScreenshotImport(accountId: string): () => void {
    const router = useRouter();
    const { gate } = useAuthSession();
    const consent = useAiConsent(useDatabase(), "aiConsentPlanScan");
    const openScan = (photo?: string) => router.push({ params: { accountId, photo }, pathname: "/installments/scan" });
    const pick = useAtomAction(
        pickInstallmentPhotoCommand,
        {
            onFailure: () => openScan(),
            onSuccess: (result) => {
                const photo = photoFrom(result);
                if (photo !== null) {
                    openScan(handOff(photo));
                }
            },
        },
        SILENT
    );
    return () => {
        if (gate !== "signed-in" || consent !== "allowed") {
            openScan();
            return;
        }
        pick(undefined);
    };
}
