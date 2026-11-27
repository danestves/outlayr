import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Label } from "panelui-web/label";
import { useToast } from "panelui-web/toast";
import { useId, useState } from "react";
import type { FormEvent } from "react";
import { useIntlayer } from "react-intlayer";

import { usePresetLabel } from "@/components/dashboard/settings/categories/preset-label";
import { Choice, Swatches } from "@/components/dashboard/settings/parts";
import { CATEGORY_ICONS } from "@/components/ledger/category-icons";
import { DialogContent } from "@/components/ui/dialog-content";
import { useLedgerSettings } from "@/lib/ledger-settings";
import {
    DEFAULT_PROFILE_COLOR,
    DEFAULT_PROFILE_ICON,
    PROFILE_COLORS,
    PROFILE_EMOJI,
    PROFILE_ICON_KEYS,
} from "@/lib/profile-look";
import type { LedgerProfile } from "@/lib/profile-registry";
import { createProfile, saveProfile } from "@/lib/profile-writes";
import { cn } from "@/lib/utils";

import { ProfileTile } from "./tile";

const CELL =
    "grid size-8 place-items-center rounded-app-sm border text-app-body transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function IconGrid({ onPick, selected }: { onPick: (key: string) => void; selected: string | null }) {
    const copy = useIntlayer("profiles");
    return (
        <div className="grid grid-cols-10 gap-1">
            {PROFILE_ICON_KEYS.map((key) => {
                const glyph = CATEGORY_ICONS.get(key) ?? CATEGORY_ICONS.get(DEFAULT_PROFILE_ICON);
                return (
                    <button
                        aria-label={copy.iconNames[key].value}
                        aria-pressed={selected === key}
                        className={cn(
                            CELL,
                            "text-app-muted hover:bg-app-fill hover:text-app-ink",
                            selected === key && "bg-app-fill text-app-ink border-app-strong"
                        )}
                        key={key}
                        onClick={() => onPick(key)}
                        type="button"
                    >
                        {glyph ? <HugeiconsIcon icon={glyph} size={16} strokeWidth={1.8} /> : null}
                    </button>
                );
            })}
        </div>
    );
}

function EmojiGrid({ onPick, selected }: { onPick: (emoji: string) => void; selected: string | null }) {
    return (
        <div className="grid grid-cols-10 gap-1">
            {PROFILE_EMOJI.map((emoji) => (
                <button
                    aria-label={emoji}
                    aria-pressed={selected === emoji}
                    className={cn(
                        CELL,
                        "hover:bg-app-fill text-base",
                        selected === emoji && "bg-app-fill border-app-strong"
                    )}
                    key={emoji}
                    onClick={() => onPick(emoji)}
                    type="button"
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}

export function ProfileEditor({
    onClose,
    onCreated,
    open,
    profiles,
    target,
}: {
    onClose: () => void;
    onCreated?: (profileId: string) => void;
    open: boolean;
    profiles: readonly LedgerProfile[];
    target: LedgerProfile | null;
}) {
    const copy = useIntlayer("profiles");
    const toast = useToast();
    const { currency } = useLedgerSettings();
    const categoryLabel = usePresetLabel();
    const formId = useId();
    const [name, setName] = useState(target?.name ?? "");
    const [color, setColor] = useState(target?.customColor ?? DEFAULT_PROFILE_COLOR);
    const [icon, setIcon] = useState<string | null>(target === null ? DEFAULT_PROFILE_ICON : target.icon);
    const [emoji, setEmoji] = useState<string | null>(target?.emoji ?? null);
    const [busy, setBusy] = useState(false);
    const editing = target !== null;
    const look = { color, emoji, icon, imageKey: emoji === null && icon === null ? (target?.imageKey ?? null) : null };

    const switchTab = (next: string) => {
        if (next === "emoji") {
            setEmoji((current) => current ?? PROFILE_EMOJI[0]);
            setIcon(null);
            return;
        }
        setIcon((current) => current ?? DEFAULT_PROFILE_ICON);
        setEmoji(null);
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (trimmed === "" || busy) {
            return;
        }
        setBusy(true);
        const identity = { color, emoji, icon };
        try {
            if (target === null) {
                const id = await createProfile(profiles, { categoryLabel, currency, identity, name: trimmed });
                onClose();
                onCreated?.(id);
            } else {
                await saveProfile(target, { identity, name: trimmed });
                onClose();
            }
        } catch {
            toast.add({ title: copy.saveFailed.value, type: "destructive" });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog onOpenChange={(next) => next || busy || onClose()} open={open}>
            <DialogContent size="md">
                <Dialog.Header>
                    <Dialog.Title>{editing ? copy.edit : copy.newProfile}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                    <form className="flex flex-col gap-4" id={formId} onSubmit={submit}>
                        <div className="flex items-start gap-3">
                            <ProfileTile look={look} size="xl" />
                            <Field className="min-w-0 flex-1">
                                <Field.Label>{copy.name}</Field.Label>
                                <Input
                                    autoFocus
                                    className="max-sm:text-base"
                                    maxLength={40}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder={copy.namePlaceholder.value}
                                    value={name}
                                />
                            </Field>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Choice
                                label={copy.icon.value}
                                onChange={switchTab}
                                options={[
                                    { label: copy.icon, value: "icon" },
                                    { label: copy.emoji, value: "emoji" },
                                ]}
                                value={emoji === null ? "icon" : "emoji"}
                            />
                            {emoji === null ? (
                                <IconGrid onPick={setIcon} selected={icon} />
                            ) : (
                                <EmojiGrid onPick={setEmoji} selected={emoji} />
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label render={<span />}>{copy.color}</Label>
                            <Swatches
                                className="grid grid-cols-6 gap-2"
                                label={copy.color.value}
                                onChange={setColor}
                                options={PROFILE_COLORS.map((value, index) => ({
                                    color: value,
                                    label: copy.colorSwatch({
                                        position: String(index + 1),
                                        total: String(PROFILE_COLORS.length),
                                    }).value,
                                    value,
                                }))}
                                value={color}
                            />
                        </div>
                    </form>
                </Dialog.Body>
                <Dialog.Footer>
                    <Button onClick={onClose} type="button" variant="outline">
                        {copy.cancel}
                    </Button>
                    <Button disabled={name.trim() === "" || busy} form={formId} type="submit">
                        {editing ? copy.save : copy.create}
                    </Button>
                </Dialog.Footer>
            </DialogContent>
        </Dialog>
    );
}
