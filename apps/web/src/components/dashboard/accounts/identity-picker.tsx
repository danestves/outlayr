import { Popover } from "@base-ui/react/popover";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { api } from "@outlayr/backend/convex/_generated/api";
import { searchInstitutions } from "@outlayr/money/institution-map";
import { useRouteContext } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Input } from "panelui-web/input";
import { Tabs } from "panelui-web/tabs";
import { useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { CATEGORY_ICONS } from "@/components/ledger/category-icons";

import { Glyph } from "./glyph";

export interface Identity {
    color: string | null;
    emoji: string | null;
    icon: string | null;
    /** A `merchants/<domain>` logo or an uploaded photo's key. */
    imageKey: string | null;
    /** A url to show `imageKey` with before the ledger has minted one. */
    preview: string | null;
}

export const logoUrl = (domain: string) => `https://logos.tryoutlayr.com/merchants/${encodeURIComponent(domain)}`;

export const logoIdentity = (domain: string): Identity => ({
    color: null,
    emoji: null,
    icon: null,
    imageKey: `merchants/${domain}`,
    preview: logoUrl(domain),
});

const ICONS = [
    "CreditCard",
    "Bank",
    "Wallet01",
    "Safe",
    "Coins01",
    "MoneyReceive01",
    "Home01",
    "Car01",
    "Mortarboard01",
    "Airplane01",
] as const;
// The tile lies on the panel, so a picked colour tints it and draws the glyph.
const tinted = (color: string) => ({
    background: `color-mix(in oklab, ${color} 22%, var(--card))`,
    color: `color-mix(in oklab, ${color} 70%, white)`,
});

const COLORS = ["#B26C43", "#53915A", "#4D84BD", "#7C76BC", "#B16482", "#A97332"] as const;
const EMOJI = [
    "💵",
    "💳",
    "🏦",
    "💰",
    "🪙",
    "🐖",
    "💎",
    "🏠",
    "🚗",
    "🎓",
    "✈️",
    "🛒",
    "🎁",
    "🧾",
    "💼",
    "📈",
    "🌱",
    "⭐️",
    "🔒",
    "👛",
    "🧳",
] as const;

const TABS = ["logo", "icon", "emoji", "photo"] as const;
type Tab = (typeof TABS)[number];

function startTab({ emoji, icon }: Identity, handPicked: boolean): Tab {
    if (emoji) {
        return "emoji";
    }
    return handPicked && icon ? "icon" : "logo";
}

const PHOTO_SIDE = 512;
const PHOTO_QUALITY = 0.85;

/** A square JPEG, the shape native uploads, so a phone photo does not sync at full size. */
async function squarePhoto(file: File) {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = PHOTO_SIDE;
    canvas.height = PHOTO_SIDE;
    canvas
        .getContext("2d")
        ?.drawImage(
            bitmap,
            (bitmap.width - side) / 2,
            (bitmap.height - side) / 2,
            side,
            side,
            0,
            0,
            PHOTO_SIDE,
            PHOTO_SIDE
        );
    bitmap.close();
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("The photo could not be encoded"))),
            "image/jpeg",
            PHOTO_QUALITY
        );
    });
}

function useUploadPhoto() {
    const convex = useRouteContext({ from: "/_account/app", select: (context) => context.convexQueryClient });
    return async (file: File) => {
        if (!convex) {
            throw new Error("Photos need a connection");
        }
        const client = convex.convexClient;
        const body = await squarePhoto(file);
        const { key, url } = await client.mutation(api.photos.requestUpload, {
            name: `web-${crypto.randomUUID()}.jpg`,
        });
        const response = await fetch(url, { body, headers: { "Content-Type": "image/jpeg" }, method: "PUT" });
        if (!response.ok) {
            throw new Error(`Photo upload failed: ${response.status}`);
        }
        // SAFETY: Convex storage answers with `{ storageId }`, and R2 with an empty body that lands in the catch.
        const { storageId } = (await response.json().catch(() => ({}))) as {
            storageId?: Parameters<typeof client.action<typeof api.photos.confirmUpload>>[1]["storageId"];
        };
        await client.action(api.photos.confirmUpload, storageId ? { key, storageId } : { key });
        return { key, preview: URL.createObjectURL(body) };
    };
}

/** The big tile in the form: what the account will look like, opening the picker. */
function IdentityFace({ identity, initials }: { identity: Identity; initials: ReactNode }) {
    const glyph = identity.icon ? CATEGORY_ICONS.get(identity.icon) : undefined;
    if (identity.preview) {
        return <img alt="" src={identity.preview} />;
    }
    return (
        <span
            className="text-app-muted bg-app-fill flex size-full items-center justify-center rounded-2xl text-2xl"
            style={identity.color ? tinted(identity.color) : undefined}
        >
            {glyph ? <Glyph icon={glyph} className="size-6" /> : (identity.emoji ?? initials)}
        </span>
    );
}

function Swatches({ identity, onChange }: { identity: Identity; onChange: (identity: Identity) => void }) {
    return (
        <div className="dash-swatches">
            {COLORS.map((color) => (
                <Button
                    aria-label={color}
                    aria-pressed={identity.color === color}
                    key={color}
                    onClick={() => onChange({ ...identity, color })}
                    size="icon-sm"
                    style={{ background: color }}
                    variant="ghost"
                />
            ))}
        </div>
    );
}

export function IdentityPicker({
    handPicked,
    identity,
    initials,
    label,
    onChange,
    photoError,
}: {
    handPicked: boolean;
    identity: Identity;
    initials: ReactNode;
    label: string;
    onChange: (identity: Identity) => void;
    photoError: string;
}) {
    const { flows } = useIntlayer("dashboard-accounts");
    const [tab, setTab] = useState<Tab>(() => startTab(identity, handPicked));
    const [query, setQuery] = useState("");
    const [failed, setFailed] = useState(false);
    const upload = useUploadPhoto();
    const trigger = useRef<HTMLButtonElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const found = searchInstitutions(query).slice(0, 6);
    const titles = { emoji: flows.emoji, icon: flows.icon, logo: flows.logo, photo: flows.photo } as const;

    const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const [file] = event.target.files ?? [];
        if (!file) {
            return;
        }
        setFailed(false);
        try {
            const { key, preview } = await upload(file);
            onChange({ color: null, emoji: null, icon: null, imageKey: key, preview });
        } catch {
            setFailed(true);
        }
    };

    return (
        <Popover.Root>
            <Popover.Trigger
                aria-label={label}
                ref={trigger}
                render={<Button className="dash-ib" size="icon" variant="ghost" />}
            >
                <IdentityFace identity={identity} initials={initials} />
                <u>
                    <Glyph icon={PencilEdit01Icon} className="size-3" />
                </u>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner
                    align="start"
                    anchor={() => trigger.current?.closest("[role=dialog]") ?? null}
                    className="z-[60]"
                    side="left"
                    sideOffset={16}
                >
                    <Popover.Popup className="app-shell dash-po ph-no-capture w-[232px]">
                        <Tabs
                            className="gap-0"
                            onValueChange={(next) => {
                                const picked = TABS.find((each) => each === next);
                                if (picked) {
                                    setTab(picked);
                                }
                            }}
                            value={tab}
                        >
                            <Tabs.List className="w-full">
                                {TABS.map((each) => (
                                    <Tabs.Trigger className="flex-1 px-1" key={each} value={each}>
                                        {titles[each]}
                                    </Tabs.Trigger>
                                ))}
                            </Tabs.List>
                            <Tabs.Content value="logo">
                                <Input.Group className="mt-2.5">
                                    <Input.Addon>
                                        <Glyph icon={Search01Icon} size={16} />
                                    </Input.Addon>
                                    <Input
                                        aria-label={flows.logoSearch.value}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder={flows.logoSearch.value}
                                        value={query}
                                    />
                                </Input.Group>
                                <div className="mt-1.5 empty:hidden">
                                    {found.map(({ domain, label: name }) => {
                                        const chosen = identity.imageKey === `merchants/${domain}`;
                                        return (
                                            <Button
                                                aria-pressed={chosen}
                                                className="dash-pr justify-start font-normal"
                                                key={domain}
                                                onClick={() => onChange(logoIdentity(domain))}
                                                variant="ghost"
                                            >
                                                <img
                                                    alt=""
                                                    className="size-[26px] flex-none rounded-lg bg-white"
                                                    src={logoUrl(domain)}
                                                />
                                                <span className="truncate">{name}</span>
                                                {chosen ? (
                                                    <Glyph
                                                        icon={Tick02Icon}
                                                        className="text-app-tint ml-auto flex-none"
                                                        size={16}
                                                    />
                                                ) : null}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </Tabs.Content>
                            <Tabs.Content value="icon">
                                <div className="dash-pg grid-cols-5">
                                    {ICONS.map((key) => {
                                        const glyph = CATEGORY_ICONS.get(key);
                                        return glyph ? (
                                            <Button
                                                aria-label={key}
                                                aria-pressed={identity.icon === key}
                                                key={key}
                                                onClick={() =>
                                                    onChange({
                                                        ...identity,
                                                        emoji: null,
                                                        icon: key,
                                                        imageKey: null,
                                                        preview: null,
                                                    })
                                                }
                                                size="icon"
                                                variant="ghost"
                                            >
                                                <Glyph icon={glyph} size={16} />
                                            </Button>
                                        ) : null;
                                    })}
                                </div>
                                <Swatches identity={identity} onChange={onChange} />
                            </Tabs.Content>
                            <Tabs.Content value="emoji">
                                <div className="dash-pg grid-cols-7">
                                    {EMOJI.map((emoji) => (
                                        <Button
                                            aria-pressed={identity.emoji === emoji}
                                            key={emoji}
                                            onClick={() =>
                                                onChange({
                                                    ...identity,
                                                    emoji,
                                                    icon: null,
                                                    imageKey: null,
                                                    preview: null,
                                                })
                                            }
                                            size="icon"
                                            variant="ghost"
                                        >
                                            {emoji}
                                        </Button>
                                    ))}
                                </div>
                                <Swatches identity={identity} onChange={onChange} />
                            </Tabs.Content>
                            <Tabs.Content className="mt-2.5" value="photo">
                                <Button className="w-full" onClick={() => fileInput.current?.click()} variant="outline">
                                    {flows.choosePhoto}
                                </Button>
                                <Input accept="image/*" hidden onChange={onFile} ref={fileInput} type="file" />
                                {failed ? (
                                    <p className="text-destructive mt-1.5 text-xs" role="alert">
                                        {photoError}
                                    </p>
                                ) : null}
                            </Tabs.Content>
                        </Tabs>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
