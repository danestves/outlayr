import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Download01Icon from "@hugeicons/core-free-icons/Download01Icon";
import Share08Icon from "@hugeicons/core-free-icons/Share08Icon";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Switch } from "panelui-web/switch";
import { Tabs } from "panelui-web/tabs";
import { useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { LogoMark } from "@/components/logo-mark";

import { CARD_SIZES, SIZE_NAMES, logoSource, renderCard } from "./card";
import type { CardInput, CardSize } from "./card";
import type { RecapFormat } from "./cards";
import type { Recap } from "./model";

const PERCENT = 100;
const COPIED_MS = 2000;
const FALLBACK_COLOR = "#a39d8f";
const LOGO = logoSource(renderToStaticMarkup(<LogoMark />));

interface ShareDialogProps {
    format: RecapFormat;
    monthLabel: string;
    onClose: () => void;
    open: boolean;
    priorName: string;
    recap: Recap;
    whole: (value: number) => string;
}

function headlineOf(
    card: ReturnType<typeof useIntlayer<"dashboard-insights-recap">>["card"],
    change: number | null,
    { monthLabel, priorName }: { monthLabel: string; priorName: string }
) {
    if (change === null) {
        return card.firstPlain({ month: monthLabel }).value;
    }
    if (change === 0) {
        return card.same({ month: priorName }).value;
    }
    return (change < 0 ? card.less : card.more)({ month: priorName, percent: String(Math.abs(change)) }).value;
}

function useCardInput(
    { format, monthLabel, priorName, recap, whole }: Omit<ShareDialogProps, "onClose" | "open">,
    amounts: boolean
) {
    const { card } = useIntlayer("dashboard-insights-recap");
    return useMemo((): CardInput => {
        const change = recap.spentChange === null ? null : Math.round(recap.spentChange * PERCENT);
        const headline = headlineOf(card, change, { monthLabel, priorName });
        return {
            categories: recap.rows.map((row) => ({
                amount: amounts ? format.amount(row.amount) : null,
                color: row.color === "" ? FALLBACK_COLOR : row.color,
                fraction: row.share,
                name: format.categoryName(row),
                percent: `${Math.round(row.share * PERCENT)}%`,
            })),
            daysLine: card.days({
                logged: String(recap.days.filter((day) => day.logged).length),
                total: String(recap.days.length),
            }).value,
            headline,
            monthLabel,
            total: amounts ? whole(recap.spent) : null,
            url: card.url.value,
        };
    }, [amounts, card, format, monthLabel, priorName, recap, whole]);
}

export function ShareDialog({ onClose, open, ...rest }: ShareDialogProps) {
    const { dialog } = useIntlayer("dashboard-insights-recap");
    const [amounts, setAmounts] = useState(false);
    const [size, setSize] = useState<CardSize>("4:5");
    const [made, setMade] = useState<{ blob: Blob; url: string } | null>(null);
    const [failed, setFailed] = useState(false);
    const [copied, setCopied] = useState(false);
    const input = useCardInput(rest, amounts);
    const canCopy = "ClipboardItem" in globalThis && "clipboard" in navigator && "write" in navigator.clipboard;

    // oxlint-disable-next-line outlayr/react-effect-budget -- draws the card on a canvas and owns the object URL it hands out.
    useEffect(() => {
        if (!open) {
            return;
        }
        let stale = false;
        renderCard(input, size, LOGO)
            .then((blob) => {
                if (stale) {
                    return;
                }
                setFailed(false);
                setMade({ blob, url: URL.createObjectURL(blob) });
            })
            .catch(() => {
                if (!stale) {
                    setMade(null);
                    setFailed(true);
                }
            });
        return () => {
            stale = true;
        };
    }, [input, open, size]);

    // oxlint-disable-next-line outlayr/react-effect-budget -- the last card stays on screen until the next is drawn, so its URL lives as long as it is held.
    useEffect(() => {
        if (made === null) {
            return;
        }
        return () => URL.revokeObjectURL(made.url);
    }, [made]);

    const file = made === null ? null : new File([made.blob], `${input.monthLabel}.png`, { type: "image/png" });
    const canShare = file !== null && "canShare" in navigator && navigator.canShare({ files: [file] });
    const [width, height] = CARD_SIZES[size];

    const copy = async () => {
        if (made === null) {
            return;
        }
        await navigator.clipboard.write([new ClipboardItem({ "image/png": made.blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_MS);
    };
    const download = () => {
        if (made === null || file === null) {
            return;
        }
        const link = document.createElement("a");
        link.href = made.url;
        link.download = file.name;
        link.click();
    };
    const share = async () => {
        if (file !== null) {
            await navigator.share({ files: [file] }).catch(() => undefined);
        }
    };

    return (
        <Dialog onOpenChange={(next) => next || onClose()} open={open}>
            <Dialog.Content className="app-shell sm:max-w-[680px]">
                <Dialog.Header>
                    <Dialog.Title>{dialog.title}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body className="grid gap-5 sm:grid-cols-[340px_1fr]">
                    <div className="flex h-[452px] items-center justify-center">
                        {made === null ? null : (
                            <img
                                alt={dialog.preview.value}
                                className="block max-h-full max-w-full object-contain"
                                height={height}
                                src={made.url}
                                width={width}
                            />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <div className="border-border flex min-h-14 items-center justify-between gap-3 border-y">
                            <label className="flex flex-col text-sm" htmlFor="recap-amounts">
                                <span>{dialog.amounts}</span>
                                <span className="text-muted-foreground text-xs">{dialog.amountsHint}</span>
                            </label>
                            <Switch checked={amounts} id="recap-amounts" onCheckedChange={setAmounts} />
                        </div>
                        <div className="border-border flex min-h-14 items-center justify-between gap-3 border-b">
                            <span className="text-sm">{dialog.size}</span>
                            <Tabs onValueChange={(next: CardSize) => setSize(next)} value={size} variant="segmented">
                                <Tabs.List aria-label={dialog.size.value}>
                                    {SIZE_NAMES.map((name) => (
                                        <Tabs.Trigger key={name} value={name}>
                                            {name}
                                        </Tabs.Trigger>
                                    ))}
                                </Tabs.List>
                            </Tabs>
                        </div>
                        <p className="text-muted-foreground mt-[14px] text-[13px] leading-5">{dialog.note}</p>
                        {failed ? (
                            <p className="text-destructive pt-3 text-[13px]" role="alert">
                                {dialog.failed}
                            </p>
                        ) : null}
                    </div>
                </Dialog.Body>
                <Dialog.Footer className="flex gap-3 *:flex-1">
                    <Button disabled={made === null || !canCopy} onClick={copy} variant="outline">
                        <Glyph icon={Copy01Icon} size={16} />
                        {copied ? dialog.copied : dialog.copy}
                    </Button>
                    {canShare ? (
                        <Button onClick={share} variant="outline">
                            <Glyph icon={Share08Icon} size={16} />
                            {dialog.share}
                        </Button>
                    ) : null}
                    <Button disabled={made === null} onClick={download}>
                        <Glyph icon={Download01Icon} size={16} />
                        {dialog.download}
                    </Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog>
    );
}
