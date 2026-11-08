import { Popover } from "@base-ui/react/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { api } from "@outlayr/backend/convex/_generated/api";
import { searchInstitutions } from "@outlayr/money/institution-map";
import { RiCheckLine, RiPencilLine, RiSearch2Line } from "@remixicon/react";
import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { CATEGORY_ICONS } from "@/components/ledger/category-icons";

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
            className="text-app-muted bg-app-fill flex size-full items-center justify-center rounded-[inherit] text-2xl"
            style={identity.color ? { background: identity.color, color: "#131209" } : undefined}
        >
            {glyph ? <HugeiconsIcon icon={glyph} size={26} strokeWidth={1.75} /> : (identity.emoji ?? initials)}
        </span>
    );
}

function Swatches({ identity, onChange }: { identity: Identity; onChange: (identity: Identity) => void }) {
    return (
        <div className="dash-swatches">
            {COLORS.map((color) => (
                <button
                    aria-label={color}
                    aria-pressed={identity.color === color}
                    key={color}
                    onClick={() => onChange({ ...identity, color })}
                    style={{ background: color }}
                    type="button"
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
            <Popover.Trigger aria-label={label} className="dash-ib" type="button">
                <IdentityFace identity={identity} initials={initials} />
                <u>
                    <RiPencilLine size={12} />
                </u>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner align="start" className="z-[60]" side="left" sideOffset={37}>
                    <Popover.Popup className="app-shell dash-po ph-no-capture w-[232px]">
                        <div className="dash-po-tabs">
                            {TABS.map((each) => (
                                <button
                                    aria-pressed={tab === each}
                                    key={each}
                                    onClick={() => setTab(each)}
                                    type="button"
                                >
                                    {titles[each]}
                                </button>
                            ))}
                        </div>
                        {tab === "logo" ? (
                            <>
                                <div className="dash-fi mt-2.5">
                                    <RiSearch2Line className="text-muted-foreground flex-none" size={16} />
                                    <input
                                        aria-label={flows.logoSearch.value}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder={flows.logoSearch.value}
                                        value={query}
                                    />
                                </div>
                                <div className="mt-1.5 empty:hidden">
                                    {found.map(({ domain, label: name }) => {
                                        const chosen = identity.imageKey === `merchants/${domain}`;
                                        return (
                                            <button
                                                aria-pressed={chosen}
                                                className="dash-pr"
                                                key={domain}
                                                onClick={() => onChange(logoIdentity(domain))}
                                                type="button"
                                            >
                                                <img
                                                    alt=""
                                                    className="size-[26px] flex-none rounded-lg bg-white"
                                                    src={logoUrl(domain)}
                                                />
                                                <span className="truncate">{name}</span>
                                                {chosen ? (
                                                    <RiCheckLine
                                                        className="text-app-tint ml-auto flex-none"
                                                        size={16}
                                                    />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : null}
                        {tab === "icon" ? (
                            <>
                                <div className="dash-pg grid-cols-5">
                                    {ICONS.map((key) => {
                                        const glyph = CATEGORY_ICONS.get(key);
                                        return glyph ? (
                                            <button
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
                                                type="button"
                                            >
                                                <HugeiconsIcon icon={glyph} size={18} strokeWidth={1.75} />
                                            </button>
                                        ) : null;
                                    })}
                                </div>
                                <Swatches identity={identity} onChange={onChange} />
                            </>
                        ) : null}
                        {tab === "emoji" ? (
                            <>
                                <div className="dash-pg grid-cols-7">
                                    {EMOJI.map((emoji) => (
                                        <button
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
                                            type="button"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                                <Swatches identity={identity} onChange={onChange} />
                            </>
                        ) : null}
                        {tab === "photo" ? (
                            <div className="mt-2.5">
                                <label className="dash-ob h-9 w-full cursor-pointer justify-center rounded-[10px]">
                                    {flows.choosePhoto}
                                    <input accept="image/*" className="sr-only" onChange={onFile} type="file" />
                                </label>
                                {failed ? <p className="dash-er">{photoError}</p> : null}
                            </div>
                        ) : null}
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}
