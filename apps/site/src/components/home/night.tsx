import type { ComponentType } from "react";
import { useIntlayer } from "react-intlayer";

import { sway } from "@/lib/sway";

import { Also } from "./also";
import { Faq } from "./faq";
import { Guides } from "./guides";
import { Plans } from "./plans";
import { AccountBolivarRow } from "./slots/account-bolivar-row";
import { AccountCardRow } from "./slots/account-card-row";
import { AccountsList } from "./slots/accounts-list";
import { BudgetLeft } from "./slots/budget-left";
import { BudgetScreen } from "./slots/budget-screen";
import { PaceChart } from "./slots/pace-chart";
import { PaceVerdict } from "./slots/pace-verdict";
import type { SlotProps } from "./slots/placeholder";
import { UpcomingList } from "./slots/upcoming-list";
import { UpcomingRow } from "./slots/upcoming-row";
import { UpcomingTotal } from "./slots/upcoming-total";

interface Box {
    x: number;
    y: number;
    w: number;
}

interface Piece {
    Slot: ComponentType<SlotProps>;
    at: Box;
    phone: { x: number; y: number; w?: number };
    z: number;
    i: number;
    hold: "card" | "card-2" | "screen" | "sheet";
    corner?: "account" | "screen";
}

interface Art {
    id: "accounts" | "pace" | "upcoming";
    height: number;
    pieces: readonly Piece[];
    wide?: boolean;
}

const ARTS: readonly Art[] = [
    {
        height: 620,
        id: "pace",
        pieces: [
            {
                Slot: BudgetScreen,
                at: { w: 365, x: 220, y: 40 },
                hold: "screen",
                i: 0,
                phone: { w: 339, x: 54, y: 20 },
                corner: "screen",
                z: 1,
            },
            {
                Slot: PaceChart,
                at: { w: 480, x: 120, y: 260 },
                hold: "sheet",
                i: 1,
                phone: { w: 440, x: 4, y: 257 },
                z: 2,
            },
            {
                Slot: BudgetLeft,
                at: { w: 420, x: 190, y: 140 },
                hold: "sheet",
                i: 2,
                phone: { w: 440, x: 4, y: 130 },
                z: 3,
            },
            {
                Slot: PaceVerdict,
                at: { w: 480, x: 150, y: 470 },
                hold: "sheet",
                i: 4,
                phone: { w: 440, x: 4, y: 449 },
                z: 3,
            },
        ],
        wide: true,
    },
    {
        height: 500,
        id: "upcoming",
        pieces: [
            { Slot: UpcomingList, at: { w: 432, x: 58, y: 36 }, hold: "sheet", i: 0, phone: { x: 8, y: 88 }, z: 1 },
            {
                Slot: UpcomingRow,
                at: { w: 476, x: 46, y: 276 },
                hold: "sheet",
                i: 1,
                phone: { w: 452, x: -2, y: 330 },
                z: 2,
            },
            {
                Slot: UpcomingTotal,
                at: { w: 460, x: 30, y: 8 },
                hold: "sheet",
                i: 2,
                phone: { w: 448, x: 0, y: 20 },
                z: 3,
            },
        ],
    },
    {
        height: 520,
        id: "accounts",
        pieces: [
            {
                Slot: AccountsList,
                at: { w: 400, x: 74, y: 8 },
                hold: "card",
                i: 0,
                phone: { x: 24, y: 40 },
                corner: "account",
                z: 1,
            },
            {
                Slot: AccountCardRow,
                at: { w: 440, x: 64, y: 158 },
                hold: "card-2",
                i: 1,
                phone: { w: 436, x: 6, y: 190 },
                z: 2,
            },
            {
                Slot: AccountBolivarRow,
                at: { w: 448, x: 34, y: 304 },
                hold: "card",
                i: 2,
                phone: { w: 436, x: 2, y: 337 },
                z: 3,
            },
        ],
    },
];

function Feature({ art }: { art: Art }) {
    const { feats } = useIntlayer("horizon");
    const feat = feats[art.id];
    return (
        <article aria-labelledby={`${art.id}-title`} className={art.wide ? "hz-feat hz-feat-wide" : "hz-feat"}>
            <div className="hz-feat-copy" data-reveal="group">
                <h3 className="hz-head hz-r" id={`${art.id}-title`}>
                    <span className="hz-lead-in">{feat.lead}</span> {feat.rest}
                </h3>
                <p className="hz-line hz-r" style={{ "--i": "1" }}>
                    {feat.line}
                </p>
                <p className="sr-only">{feat.art}</p>
            </div>
            <div
                aria-hidden="true"
                className="hz-feat-art"
                data-reveal="group"
                ref={sway}
                style={{ "--art-hm": `${art.height}` }}
            >
                {art.pieces.map(({ Slot, at, corner, hold, i, phone, z }) => (
                    <div
                        className="hz-piece"
                        key={i}
                        style={{
                            "--w": `${at.w}`,
                            "--wm": phone.w?.toString(),
                            "--x": `${at.x}`,
                            "--xm": `${phone.x}`,
                            "--y": `${at.y}`,
                            "--ym": `${phone.y}`,
                            "--z": `${z}`,
                        }}
                    >
                        <div
                            className="hz-hold hz-r"
                            data-corner={corner}
                            style={{ "--g": `var(--hz-hold-${hold})`, "--i": `${i}` }}
                        >
                            <Slot />
                        </div>
                    </div>
                ))}
            </div>
        </article>
    );
}

export function Night() {
    return (
        <div className="hz-night" data-night-ground="" data-sky="night">
            <div aria-hidden="true" className="hz-grade" />
            <div className="hz-container hz-feats">
                {ARTS.map((art) => (
                    <Feature art={art} key={art.id} />
                ))}
            </div>
            <Also />
            <Plans />
            <Faq />
            <Guides />
        </div>
    );
}
