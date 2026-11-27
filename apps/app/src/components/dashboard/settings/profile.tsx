import { useMatch } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useToast } from "panelui-web/toast";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { ProfileEditor } from "@/components/dashboard/profile/editor";
import { PERSONAL_LOOK, ProfileTile } from "@/components/dashboard/profile/tile";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useLedgerBooks } from "@/lib/ledger-db";
import { activeProfileOf, profileLook, useLedgerProfiles } from "@/lib/profile-registry";
import { removeProfileAndSwitch } from "@/lib/profile-switch";
import { deleteProfile } from "@/lib/profile-writes";

import { Row, SectionHead, SettingsCard } from "./parts";

export function ProfileSettings() {
    const copy = useIntlayer("profiles");
    const loaded = useMatch({ from: "/_account/_app", select: (match) => match.loaderData, shouldThrow: false });
    const profileId = loaded?.profileId ?? null;
    const profiles = useLedgerProfiles();
    const active = activeProfileOf(profiles, profileId);
    const books = useLedgerBooks();
    const toast = useToast();
    const [editing, setEditing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const entries = books.transactions.length;

    const remove = async () => {
        if (active === null || busy) {
            return;
        }
        setBusy(true);
        try {
            await deleteProfile(active);
        } catch {
            toast.add({ title: copy.deleteFailed.value, type: "destructive" });
            setConfirming(false);
            setBusy(false);
            return;
        }
        try {
            await removeProfileAndSwitch(active.id);
        } catch {
            toast.add({ title: copy.switchFailed.value, type: "destructive" });
            setConfirming(false);
            setBusy(false);
        }
    };

    return (
        <>
            <SectionHead title={copy.title} />
            <div className="flex max-w-160 min-w-0 flex-col gap-4">
                <SettingsCard
                    action={
                        active ? (
                            <Button onClick={() => setEditing(true)} size="sm" variant="outline">
                                {copy.edit}
                            </Button>
                        ) : null
                    }
                    title={copy.details}
                >
                    <Row
                        hint={active ? undefined : copy.personalLocked}
                        label={active?.name ?? copy.personal}
                        leading={<ProfileTile look={active ? profileLook(active) : PERSONAL_LOOK} size="xl" />}
                    />
                </SettingsCard>
                {active ? (
                    <SettingsCard title={copy.deleteProfile}>
                        <Row hint={copy.deleteBody} label={copy.deleteProfile}>
                            <Button onClick={() => setConfirming(true)} size="sm" variant="destructive">
                                {copy.delete}
                            </Button>
                        </Row>
                    </SettingsCard>
                ) : null}
            </div>
            {active && editing ? (
                <ProfileEditor
                    key={active.id}
                    onClose={() => setEditing(false)}
                    open
                    profiles={profiles}
                    target={active}
                />
            ) : null}
            <ConfirmDialog
                action={copy.delete}
                body={
                    <span className="flex flex-col gap-2">
                        <span>{copy.deleteBody}</span>
                        <span className="text-app-muted">
                            {copy.entries}: <span className="font-mono tabular-nums">{entries}</span>
                        </span>
                    </span>
                }
                cancel={copy.cancel}
                onAction={() => remove().catch(() => undefined)}
                onOpenChange={(next) => (busy ? undefined : setConfirming(next))}
                open={confirming}
                title={copy.deleteTitle}
                tone="destructive"
            />
        </>
    );
}
