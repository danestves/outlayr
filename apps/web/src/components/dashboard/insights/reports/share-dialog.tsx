import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Switch } from "panelui-web/switch";
import { Tabs } from "panelui-web/tabs";
import { useId, useState } from "react";
import { useLocale } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";

import { lifetimeOf, sharedUrl } from "./links";
import type { Lifetime, SharedLink } from "./links";
import type { ReportWords } from "./words";

const COPIED_MS = 2000;
const LIFETIMES = ["week", "month", "never"] as const satisfies readonly Lifetime[];
const ROW = "border-border flex items-center justify-between gap-3 border-t px-4 py-3 text-sm leading-6";
const NOTE = "text-muted-foreground text-xs leading-4";

export interface ShareOptions {
    amounts: boolean;
    expires: Lifetime | "keep";
}

interface ShareDialogProps {
    /** False when the measure cannot be read as shares of a whole, so amounts always show. */
    hideable: boolean;
    link: SharedLink | undefined;
    name: string;
    now: number;
    onClose: () => void;
    onPublish: (options: ShareOptions) => Promise<void>;
    onRemove: () => Promise<void>;
    open: boolean;
    words: ReportWords;
}

export function ShareDialog({
    hideable,
    link,
    name,
    now,
    onClose,
    onPublish,
    onRemove,
    open,
    words,
}: ShareDialogProps) {
    const { sharing } = words.copy;
    const { locale } = useLocale();
    const [picked, setPicked] = useState<{ amounts?: boolean; lifetime?: Lifetime }>({});
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const [copied, setCopied] = useState(false);
    const linkId = useId();
    const amountsId = useId();
    const on = link !== undefined;
    const amounts = !hideable || (picked.amounts ?? (link ? link.unit === "amount" : true));
    const lifetime = picked.lifetime ?? (link ? lifetimeOf(link, now) : "month");
    const url = link ? sharedUrl(link.slug, locale) : null;

    const run = async (job: () => Promise<void>, undo?: () => void) => {
        setBusy(true);
        setFailed(false);
        try {
            await job();
        } catch {
            undo?.();
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };
    const toggleLink = (next: boolean) => run(next ? () => onPublish({ amounts, expires: lifetime }) : onRemove);
    const toggleAmounts = (next: boolean) => {
        setPicked((before) => ({ ...before, amounts: next }));
        if (on) {
            run(
                () => onPublish({ amounts: next, expires: "keep" }),
                () => setPicked(({ lifetime: kept }) => ({ lifetime: kept }))
            );
        }
    };
    const pickLifetime = (next: Lifetime) => {
        setPicked((before) => ({ ...before, lifetime: next }));
        if (on) {
            run(
                () => onPublish({ amounts, expires: next }),
                () => setPicked(({ amounts: kept }) => ({ amounts: kept }))
            );
        }
    };
    const copy = async () => {
        if (url === null) {
            return;
        }
        await navigator.clipboard.writeText(`https://${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_MS);
    };

    return (
        <Dialog onOpenChange={(next) => next || onClose()} open={open}>
            <Dialog.Content className="app-shell sm:max-w-[448px]">
                <Dialog.Header>
                    <Dialog.Title>{sharing.title({ name })}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body className="gap-0 pb-1.5">
                    <div className="mb-3 flex gap-2">
                        <output
                            aria-label={sharing.url.value}
                            className={`dash-figure border-input bg-input/30 flex h-9 min-w-0 flex-1 items-center overflow-hidden rounded-lg border px-3 text-[13px] whitespace-nowrap shadow-xs ${
                                on ? "" : "text-muted-foreground"
                            }`}
                        >
                            {url ?? sharedUrl("…", locale)}
                        </output>
                        <Button disabled={!on} onClick={copy} variant="outline">
                            <Glyph className="text-muted-foreground" icon={Copy01Icon} size={16} />
                            {copied ? sharing.copied : sharing.copy}
                        </Button>
                    </div>
                    <div className={ROW}>
                        <label className="flex flex-col" htmlFor={linkId}>
                            <span>{sharing.link}</span>
                            <span className={NOTE}>{sharing.linkNote}</span>
                        </label>
                        <Switch checked={on} disabled={busy} id={linkId} onCheckedChange={toggleLink} />
                    </div>
                    <div className={ROW}>
                        <label className="flex flex-col" htmlFor={amountsId}>
                            <span>{sharing.amounts}</span>
                            <span className={NOTE}>{sharing.amountsNote}</span>
                        </label>
                        <Switch
                            checked={amounts}
                            disabled={busy || !hideable}
                            id={amountsId}
                            onCheckedChange={toggleAmounts}
                        />
                    </div>
                    <div className={ROW}>
                        <span>{sharing.expires}</span>
                        <Tabs
                            onValueChange={(next: Lifetime) => pickLifetime(next)}
                            value={lifetime}
                            variant="segmented"
                        >
                            <Tabs.List aria-label={sharing.expires.value}>
                                {LIFETIMES.map((each) => (
                                    <Tabs.Trigger disabled={busy} key={each} value={each}>
                                        {sharing.lifetimes[each]}
                                    </Tabs.Trigger>
                                ))}
                            </Tabs.List>
                        </Tabs>
                    </div>
                    {failed ? (
                        <p className="text-destructive px-4 pb-2 text-[13px]" role="alert">
                            {sharing.failed}
                        </p>
                    ) : null}
                </Dialog.Body>
                <Dialog.Footer>
                    <Button className="flex-1" onClick={onClose}>
                        {sharing.done}
                    </Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog>
    );
}
