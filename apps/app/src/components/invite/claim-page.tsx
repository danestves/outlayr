import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import GiftIcon from "@hugeicons/core-free-icons/GiftIcon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatReferralCode } from "@outlayr/money/contract";
import { useTimers } from "@outlayr/shared/lifecycle";
import { APP_STORE_URL, PLAY_STORE_URL } from "@outlayr/shared/urls";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { BrandPage } from "@/components/brand-page";
import { redeemInvite } from "@/lib/referrals";
import type { Refusal } from "@/lib/referrals";

const COPIED_MS = 2000;

interface InviteClaimProps {
    code: string | null;
    name: string | null;
    signedIn: boolean;
    valid: boolean;
}

const loginSearch = (code: string | null) => (code === null ? {} : { redirect: `/i/${code.toLowerCase()}` });

function HeaderAction({ code, signedIn }: { code: string | null; signedIn: boolean }) {
    const copy = useIntlayer("invite-claim");
    if (signedIn) {
        return null;
    }
    return (
        <Button render={<Link search={loginSearch(code)} to="/login" />} size="sm" variant="outline">
            {copy.signIn}
        </Button>
    );
}

function StoreLinks() {
    const copy = useIntlayer("invite-claim");
    return (
        <p className="text-muted-foreground text-app-label mt-6 text-center">
            {copy.phone}{" "}
            <a className="underline underline-offset-2" href={APP_STORE_URL} rel="noreferrer" target="_blank">
                App Store
            </a>
            {" · "}
            <a className="underline underline-offset-2" href={PLAY_STORE_URL} rel="noreferrer" target="_blank">
                Google Play
            </a>
        </p>
    );
}

function InvalidInvite({ code, signedIn }: { code: string | null; signedIn: boolean }) {
    const copy = useIntlayer("invite-claim");
    const invite = useIntlayer("dashboard-invite");
    return (
        <BrandPage actions={<HeaderAction code={code} signedIn={signedIn} />}>
            <main className="flex flex-1 flex-col items-center justify-center px-6 pt-8 pb-24 text-center max-sm:px-4">
                <div className="w-full max-w-110">
                    <h1 className="text-3xl font-semibold tracking-tight text-balance">{copy.invalidTitle}</h1>
                    <p className="text-muted-foreground text-app-body mt-3">{invite.refusal.invalid}</p>
                    <Button className="mt-6" render={<Link to="/" />} size="lg">
                        {copy.goHome}
                    </Button>
                </div>
            </main>
        </BrandPage>
    );
}

function CopyCode({ code }: { code: string }) {
    const invite = useIntlayer("dashboard-invite");
    const [copied, setCopied] = useState(false);
    const timers = useTimers();
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            timers.after(COPIED_MS, () => setCopied(false));
        } catch {
            setCopied(false);
        }
    };
    return (
        <div className="border-border flex items-center gap-3 border-t pt-6">
            <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-app-caption">{invite.codeLabel}</p>
                <p className="text-app-heading font-mono tracking-[0.18em] select-all">{formatReferralCode(code)}</p>
            </div>
            <Button aria-live="polite" onClick={copy} size="sm" variant="outline">
                <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={16} />
                {copied ? invite.copied : invite.copy}
            </Button>
        </div>
    );
}

function ClaimAction({ code, signedIn }: { code: string; signedIn: boolean }) {
    const copy = useIntlayer("invite-claim");
    const invite = useIntlayer("dashboard-invite");
    const [busy, setBusy] = useState(false);
    const [claimed, setClaimed] = useState(false);
    const [refusal, setRefusal] = useState<Refusal | null>(null);
    const claim = async () => {
        setBusy(true);
        setRefusal(null);
        const status = await redeemInvite(code);
        setBusy(false);
        if (status === "claimed") {
            setClaimed(true);
            return;
        }
        setRefusal(status);
    };
    let action: ReactNode;
    if (claimed) {
        action = (
            <>
                <p className="text-app-income text-app-body flex items-center justify-center gap-2 font-medium">
                    <HugeiconsIcon icon={Tick02Icon} size={16} />
                    {invite.claim.claimed}
                </p>
                <Button className="mt-4 w-full" render={<Link to="/" />} size="lg">
                    {copy.openDashboard}
                </Button>
            </>
        );
    } else if (signedIn) {
        action = (
            <Button aria-busy={busy} className="w-full" disabled={busy} onClick={claim} size="lg">
                {busy ? invite.claim.claiming : copy.claim}
            </Button>
        );
    } else {
        action = (
            <Button className="w-full" render={<Link search={loginSearch(code)} to="/login" />} size="lg">
                {copy.signInToClaim}
            </Button>
        );
    }
    return (
        <div className="mt-7">
            {action}
            {refusal === null ? null : (
                <p className="text-destructive text-app-label mt-3 flex items-start gap-2" role="alert">
                    <HugeiconsIcon className="mt-0.5 shrink-0" icon={AlertCircleIcon} size={16} />
                    {invite.refusal[refusal]}
                </p>
            )}
        </div>
    );
}

function ValidInvite({ code, name, signedIn }: { code: string; name: string | null; signedIn: boolean }) {
    const copy = useIntlayer("invite-claim");
    const invite = useIntlayer("dashboard-invite");
    const title = name === null ? copy.titleFriend : invite.claim.title({ name });
    return (
        <BrandPage actions={<HeaderAction code={code} signedIn={signedIn} />}>
            <main className="flex flex-1 items-center justify-center px-6 pt-8 pb-24 max-sm:px-4">
                <section className="bg-card border-border rounded-app-2xl ph-no-capture w-full max-w-140 border p-8 shadow-xs max-sm:p-6">
                    <div className="flex items-center gap-3">
                        <span className="bg-app-count text-app-tint rounded-app-lg flex size-11 shrink-0 items-center justify-center">
                            <HugeiconsIcon icon={GiftIcon} size={22} strokeWidth={1.8} />
                        </span>
                        <p className="text-muted-foreground text-app-label">
                            {name === null ? copy.fromFriend : copy.from({ name })}
                        </p>
                    </div>
                    <h1 className="mt-5 text-3xl font-semibold tracking-tight text-balance">{title}</h1>
                    <p className="text-muted-foreground text-app-body mt-2">{copy.body}</p>
                    <div className="mt-7">
                        <CopyCode code={code} />
                    </div>
                    <p className="text-muted-foreground text-app-caption mt-3">{copy.finePrint}</p>
                    <ClaimAction code={code} signedIn={signedIn} />
                    <StoreLinks />
                </section>
            </main>
        </BrandPage>
    );
}

export function InviteClaim({ code, name, signedIn, valid }: InviteClaimProps) {
    if (!valid || code === null) {
        return <InvalidInvite code={code} signedIn={signedIn} />;
    }
    return <ValidInvite code={code} name={name} signedIn={signedIn} />;
}
