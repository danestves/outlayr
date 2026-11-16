import { useRouter } from "expo-router";

import { useDatabase } from "@/contexts/local-data-context";
import { useAiConsent } from "@/data/settings";
import { newId } from "@/domain/ids";
import { PLAN_SCREENSHOT_LIMIT } from "@/domain/installment-scan";
import { photosFrom } from "@/hooks/use-receipt-scan";
import type { ScanPhoto } from "@/hooks/use-receipt-scan";
import { useAuthSession } from "@/lib/auth-session";
import { SILENT } from "@/state/atom-command";
import { pickInstallmentPhotoCommand } from "@/state/installment-flow-commands";
import { useAtomAction } from "@/state/use-atom-action";

let handedOff: { photos: readonly ScanPhoto[]; token: string } | null = null;

function handOff(photos: readonly ScanPhoto[]): string {
    handedOff = { photos, token: newId() };
    return handedOff.token;
}

export function handedOffPhotos(token: string | undefined): readonly ScanPhoto[] {
    return handedOff !== null && handedOff.token === token ? handedOff.photos : [];
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
                const photos = photosFrom(result).slice(0, PLAN_SCREENSHOT_LIMIT);
                if (photos.length > 0) {
                    openScan(handOff(photos));
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
