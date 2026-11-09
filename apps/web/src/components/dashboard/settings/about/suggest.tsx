import Idea01Icon from "@hugeicons/core-free-icons/Idea01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { Alert } from "panelui-web/alert";
import { Button } from "panelui-web/button";
import { Checkbox } from "panelui-web/checkbox";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { OverlayPresence, useOverlayOpen } from "@/components/dashboard/overlay-presence";
import { readConsent } from "@/lib/analytics";
import { convexClient } from "@/lib/convex";

import packageJson from "../../../../../../native/package.json";

const MAX_TEXT = 1000;

interface Sent {
    reason: string;
    wish: string;
}

export function browserName(userAgent: string) {
    if (userAgent.includes("Firefox/")) {
        return "Firefox";
    }
    if (userAgent.includes("Edg/")) {
        return "Edge";
    }
    if (userAgent.includes("Chrome/")) {
        return "Chrome";
    }
    return userAgent.includes("Safari/") ? "Safari" : "Browser";
}

function SuggestDialog({ onClose }: { onClose: () => void }) {
    const shown = useOverlayOpen();
    const copy = useIntlayer("dashboard-about");
    const { locale } = useLocale();
    const formId = useId();
    const [submissionId] = useState(() => crypto.randomUUID());
    const [notify, setNotify] = useState(true);
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    const [sent, setSent] = useState<Sent | null>(null);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const wish = String(data.get("wish") ?? "").trim();
        const reason = String(data.get("reason") ?? "").trim();
        setBusy(true);
        setFailure(null);
        try {
            const status = await convexClient().action(api.featureRequests.submit, {
                appVersion: packageJson.version,
                linkAccount: readConsent() === "granted",
                locale,
                notify,
                osName: "Web",
                osVersion: browserName(navigator.userAgent),
                reason,
                submissionId,
                wish,
            });
            if (status === "ok") {
                setSent({ reason, wish });
            } else {
                setFailure(status === "rateLimited" ? copy.rateLimited.value : copy.failed.value);
            }
        } catch {
            setFailure(copy.failed.value);
        } finally {
            setBusy(false);
        }
    };
    return (
        <Dialog onOpenChange={(open) => open || onClose()} open={shown}>
            <Dialog.Content className="app-shell">
                {sent ? (
                    <>
                        <Dialog.Header>
                            <Dialog.Title>{copy.sent}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <p className="text-muted-foreground text-sm leading-5">
                                {
                                    copy.echo({
                                        tail: sent.reason ? copy.echoTail({ reason: sent.reason }).value : "",
                                        wish: sent.wish,
                                    }).value
                                }
                            </p>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Button onClick={onClose}>{copy.done}</Button>
                        </Dialog.Footer>
                    </>
                ) : (
                    <>
                        <Dialog.Header>
                            <Dialog.Title>{copy.suggest}</Dialog.Title>
                        </Dialog.Header>
                        <Dialog.Body>
                            <form className="flex flex-col gap-4" id={formId} onSubmit={submit}>
                                <Field>
                                    <Field.Label>{copy.wish}</Field.Label>
                                    <Input autoFocus maxLength={MAX_TEXT} name="wish" required />
                                </Field>
                                <Field>
                                    <Field.Label>{copy.reason}</Field.Label>
                                    <Input maxLength={MAX_TEXT} name="reason" />
                                </Field>
                                <label className="flex items-center gap-2 text-[13px] font-medium">
                                    <Checkbox checked={notify} onCheckedChange={setNotify} />
                                    {copy.notify}
                                </label>
                                <p className="text-muted-foreground text-[13px] leading-[18px]">{copy.privacy}</p>
                                {failure ? (
                                    <Alert tone="destructive" variant="plain">
                                        <Alert.Description>{failure}</Alert.Description>
                                    </Alert>
                                ) : null}
                            </form>
                        </Dialog.Body>
                        <Dialog.Footer>
                            <Dialog.Close render={<Button variant="secondary" />}>{copy.cancel}</Dialog.Close>
                            <Button form={formId} loading={busy} type="submit">
                                {copy.send}
                            </Button>
                        </Dialog.Footer>
                    </>
                )}
            </Dialog.Content>
        </Dialog>
    );
}

export function SuggestButton() {
    const copy = useIntlayer("dashboard-about");
    const [open, setOpen] = useState(false);
    return (
        <>
            <Button onClick={() => setOpen(true)} size="sm" variant="outline">
                <HugeiconsIcon icon={Idea01Icon} size={16} />
                <span className="max-sm:sr-only">{copy.suggest}</span>
            </Button>
            <OverlayPresence value={open ? true : null}>
                {() => <SuggestDialog onClose={() => setOpen(false)} />}
            </OverlayPresence>
        </>
    );
}

export { SuggestDialog };
