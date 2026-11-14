import { useRouter } from "expo-router";

import { IdentityFlyUpSheetHost } from "@/components/identity-fly-up";
import { IdentityPickerHost, TRANSACTION_TABS } from "@/components/identity-picker-content";
import { useIdentityDraft, useSetLinkedWebsite } from "@/contexts/identity-draft-context";

export default function IdentityPickerScreen() {
    const { draft, setDraft } = useIdentityDraft();
    const setLinkedWebsite = useSetLinkedWebsite();
    const router = useRouter();

    return (
        <IdentityFlyUpSheetHost>
            {/* No used-colour dimming here: only categories must not share a colour. */}
            <IdentityPickerHost
                onChange={setDraft}
                onDone={() => router.back()}
                onLinkedWebsite={setLinkedWebsite}
                tabs={TRANSACTION_TABS}
                value={draft}
            />
        </IdentityFlyUpSheetHost>
    );
}
