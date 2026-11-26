import DoorOpenIcon from "@hugeicons/core-free-icons/DoorOpenIcon";
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon";
import UserSearch01Icon from "@hugeicons/core-free-icons/UserSearch01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { Avatar } from "panelui-web/avatar";
import { Button } from "panelui-web/button";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { BrandPage, SessionEmail } from "@/components/brand-page";
import { PERSONAL_LOOK, ProfileTile } from "@/components/dashboard/profile/tile";
import { signOut } from "@/components/dashboard/shell/account-menu";
import { convexClient } from "@/lib/convex";
import { readProfileInvite } from "@/lib/profile-invite";
import type { ProfileInvite } from "@/lib/profile-invite";
import { inviteLook, normalizeInviteCode, PROFILE_SEAT_LIMIT } from "@/lib/profile-sharing";
import type { ClaimStatus } from "@/lib/profile-sharing";
import { switchToProfile } from "@/lib/profile-switch";

type JoinKind = "expired" | "full" | "generic" | "invalid" | "lapsed" | "own";

const kindOfStatus = (status: ClaimStatus): JoinKind => {
    switch (status) {
        case "claimed":
        case "invalid": {
            return "invalid";
        }
        case "expired": {
            return "expired";
        }
        case "full": {
            return "full";
        }
        case "own": {
            return "own";
        }
        case "ownerLapsed": {
            return "lapsed";
        }
        default: {
            return "generic";
        }
    }
};

const kindOfState = (invite: NonNullable<ProfileInvite>): JoinKind | "open" => {
    switch (invite.state) {
        case "open":
        case "member": {
            return "open";
        }
        case "claimed": {
            return "invalid";
        }
        case "expired": {
            return "expired";
        }
        case "full": {
            return "full";
        }
        case "own": {
            return "own";
        }
        default: {
            return "invalid";
        }
    }
};

export const Route = createFileRoute("/_account/join/$code")({
    component: JoinProfile,
    head: () => ({ meta: [{ content: "noindex", name: "robots" }, { title: "Outlayr" }] }),
    loader: async ({ context, params }) => {
        const code = normalizeInviteCode(params.code);
        if (code === null) {
            return { code: null, invite: null };
        }
        const invite = await readProfileInvite(context.token ?? null, code);
        return { code, invite };
    },
});

function TopActions() {
    const { account } = useIntlayer("dashboard");
    return (
        <span className="flex items-center gap-2">
            <SessionEmail />
            <Button onClick={signOut} size="sm" variant="ghost">
                {account.signOut}
            </Button>
        </span>
    );
}

const Perk = ({ children, icon }: { children: ReactNode; icon: ReactNode }) => (
    <div className="border-app-rule flex min-h-13 items-center gap-3 border-b">
        <span className="text-muted-foreground">{icon}</span>
        <span>{children}</span>
    </div>
);

function JoinSheet({ code, invite }: { code: string; invite: NonNullable<ProfileInvite> }) {
    const copy = useIntlayer("profile-sharing");
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [refusal, setRefusal] = useState<JoinKind | null>(null);
    const look = inviteLook(invite.look) ?? PERSONAL_LOOK;
    const name = invite.look?.name ?? "";
    const { ownerName } = invite;

    if (refusal !== null) {
        return <JoinError kind={refusal} look={look} name={name} ownerName={ownerName} />;
    }

    const join = async () => {
        if (busy) {
            return;
        }
        setBusy(true);
        try {
            const result = await convexClient().mutation(api.profileSharing.claim, { code });
            if (result.status === "joined" && result.profileId !== null) {
                await switchToProfile(result.profileId, "/");
                return;
            }
            setRefusal(kindOfStatus(result.status));
        } catch {
            setRefusal("generic");
        } finally {
            setBusy(false);
        }
    };

    return (
        <BrandPage actions={<TopActions />}>
            <main className="flex flex-1 justify-center px-6 pt-16 pb-24 max-sm:px-4">
                <div className="flex w-full max-w-120 flex-col">
                    <div className="flex items-center gap-3">
                        <Avatar name={ownerName ?? "?"} size="sm" />
                        <p className="text-muted-foreground">
                            {ownerName === null ? copy.join.invitedUnknown : copy.join.invited({ name: ownerName })}
                        </p>
                    </div>
                    <div className="mt-6 flex items-center gap-4">
                        <ProfileTile look={look} size="xl" />
                        <h1 className="text-app-title min-w-0 font-semibold">{name}</h1>
                    </div>
                    <div className="mt-6">
                        <Perk icon={<HugeiconsIcon icon={PencilEdit02Icon} size={20} strokeWidth={1.8} />}>
                            {copy.join.add}
                        </Perk>
                        <Perk icon={<HugeiconsIcon icon={UserSearch01Icon} size={20} strokeWidth={1.8} />}>
                            {copy.join.see}
                        </Perk>
                        <Perk icon={<HugeiconsIcon icon={DoorOpenIcon} size={20} strokeWidth={1.8} />}>
                            {copy.join.leave}
                        </Perk>
                    </div>
                    <div className="mt-5 flex gap-2.5">
                        <Button
                            className="flex-1"
                            onClick={() => navigate({ to: "/" }).catch(() => undefined)}
                            variant="outline"
                        >
                            {copy.join.notNow}
                        </Button>
                        <Button className="flex-1" disabled={busy} onClick={() => join().catch(() => undefined)}>
                            {busy ? copy.join.joining : copy.join.action}
                        </Button>
                    </div>
                </div>
            </main>
        </BrandPage>
    );
}

function errorCopy(
    copy: ReturnType<typeof useIntlayer<"profile-sharing">>,
    kind: JoinKind,
    name: string | null,
    ownerName: string | null
) {
    switch (kind) {
        case "expired": {
            return {
                body: ownerName === null ? copy.error.expiredBodyUnknown : copy.error.expiredBody({ name: ownerName }),
                title: copy.error.expiredTitle,
            };
        }
        case "full": {
            return {
                body:
                    ownerName === null
                        ? copy.error.fullBodyUnknown({ limit: String(PROFILE_SEAT_LIMIT) })
                        : copy.error.fullBody({ limit: String(PROFILE_SEAT_LIMIT), name: ownerName }),
                title: name === null ? copy.error.fullTitleUnknown : copy.error.fullTitle({ name }),
            };
        }
        case "lapsed": {
            return {
                body: ownerName === null ? copy.error.lapsedBodyUnknown : copy.error.lapsedBody({ name: ownerName }),
                title: name === null ? copy.error.lapsedTitleUnknown : copy.error.lapsedTitle({ name }),
            };
        }
        case "own": {
            return { body: copy.error.ownBody, title: copy.error.ownTitle };
        }
        case "invalid": {
            return { body: copy.error.invalidBody, title: copy.error.invalidTitle };
        }
        default: {
            return { body: copy.error.genericBody, title: copy.error.genericTitle };
        }
    }
}

function JoinError({
    kind,
    look,
    name,
    ownerName,
}: {
    kind: JoinKind;
    look: ReturnType<typeof inviteLook>;
    name: string | null;
    ownerName: string | null;
}) {
    const copy = useIntlayer("profile-sharing");
    const navigate = useNavigate();
    const text = errorCopy(copy, kind, name, ownerName);
    return (
        <BrandPage actions={<TopActions />}>
            <main className="flex flex-1 justify-center px-6 pt-16 pb-24 max-sm:px-4">
                <div className="flex w-full max-w-110 flex-col items-start">
                    <span className="opacity-55">
                        <ProfileTile look={look ?? PERSONAL_LOOK} size="xl" />
                    </span>
                    <h1 className="text-app-title pt-5 font-semibold">{text.title}</h1>
                    <p className="text-muted-foreground text-app-body pt-2">{text.body}</p>
                    <Button
                        className="mt-6"
                        onClick={() => navigate({ to: "/" }).catch(() => undefined)}
                        variant="outline"
                    >
                        {copy.error.close}
                    </Button>
                </div>
            </main>
        </BrandPage>
    );
}

function JoinProfile() {
    const { code, invite } = Route.useLoaderData();
    if (code === null || invite === null) {
        return <JoinError kind="invalid" look={null} name={null} ownerName={null} />;
    }
    const kind = kindOfState(invite);
    if (kind === "open") {
        return <JoinSheet code={code} invite={invite} />;
    }
    return (
        <JoinError
            kind={kind}
            look={inviteLook(invite.look)}
            name={invite.look?.name ?? null}
            ownerName={invite.ownerName}
        />
    );
}
