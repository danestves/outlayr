import { useAtomValue } from "@effect/atom-react/Hooks";
import * as Cause from "effect/Cause";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

import { useUpdateWaiting } from "@/components/update-sheet";
import { useAiConsent, useNumberSetting } from "@/data/settings";
import { useYearSavings } from "@/data/use-month-savings";
import { useNow } from "@/data/use-now";
import type { Database } from "@/db/client";
import { pendingNotices } from "@/domain/policy-notice";
import { yearSheetRenewal } from "@/domain/year-sheet";
import { useHeldSubscription } from "@/hooks/use-held-subscription";
import { useAuthSession } from "@/lib/auth-session";
import { policyNoticesAtom } from "@/lib/policy-notices";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { setNumberSettingCommand } from "@/state/settings-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

let openedFor = 0;

export function YearSheetOpener({ db, ready }: { db: Database; ready: boolean }) {
    const held = useHeldSubscription();
    const seenMs = useNumberSetting(db, "yearSheetSeen");
    const nowMs = useNow();
    const segments = useSegments();
    const { gate } = useAuthSession();
    const consent = useAiConsent(db);
    const consentDue = gate === "signed-in" && consent === "unanswered";
    const updateDue = useUpdateWaiting();
    const notices = useAtomValue(policyNoticesAtom);
    const privacySeen = useNumberSetting(db, "privacyNoticeSeen");
    const termsSeen = useNumberSetting(db, "termsNoticeSeen");
    const noticeDue = pendingNotices(notices, { privacy: privacySeen, terms: termsSeen }).length > 0;
    const renewal = yearSheetRenewal({ held, now: new Date(nowMs), seenMs });
    const due = ready && segments[0] === "(tabs)" && !consentDue && !updateDue && !noticeDue;

    return due && renewal !== null ? <YearSheetProbe db={db} renewal={renewal} /> : null;
}

function YearSheetProbe({ db, renewal }: { db: Database; renewal: Date }) {
    const router = useRouter();
    const year = useYearSavings(db, useNow());
    const worthShowing = year.kept > 0;
    const renewalMs = renewal.getTime();

    // oxlint-disable-next-line outlayr/react-effect-budget -- opens the sheet once for this renewal and remembers it
    useEffect(() => {
        if (openedFor === renewalMs) {
            return;
        }
        openedFor = renewalMs;
        fireAtomCommand(
            appAtomRegistry,
            setNumberSettingCommand,
            { db, key: "yearSheetSeen", value: renewalMs },
            { onFailure: (cause) => console.warn("[outlayr] marking the year sheet failed", Cause.squash(cause)) },
            SILENT
        );
        if (worthShowing) {
            router.push("/year");
        }
    }, [db, renewalMs, router, worthShowing]);

    return null;
}
