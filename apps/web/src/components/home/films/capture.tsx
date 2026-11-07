import { Fragment, useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import type { Act } from "@/stageshow/act";
import { Stage } from "@/stageshow/stage";

import { FilmIcon, Logo, loopBack, Micro, Ruled } from "./parts";
import { FILM_COMPACT_BELOW, FILM_SIZES } from "./sizes";

import "./capture.css";

const MODES = [
    { icon: "keyboard", mode: "type" },
    { icon: "mic", mode: "voice" },
    { icon: "scan", mode: "scan" },
] as const;

type Mode = (typeof MODES)[number]["mode"];

const TAGS = ["amount", "merchant", "category", "account", "date"] as const;
type Tag = (typeof TAGS)[number];

interface Scene {
    out: boolean;
    mode: Mode;
    saved: boolean;
    scan: 0 | 1 | 2 | 3;
    typed: string;
}

const START: Scene = { mode: "type", out: false, saved: false, scan: 0, typed: "" };
const END: Scene = { mode: "scan", out: false, saved: true, scan: 3, typed: "" };

const LINE = 18;
const HEAD = 28;
const RULE = 12;
const PAD = 12;
const BAND = 32;
const RECEIPT_HEIGHT = PAD + HEAD + RULE + 3 * LINE + RULE + 3 * LINE + PAD;
const SWEEP_MS = 1000;
const PRICES = ["8.99", "11.49", "21.52"] as const;

const merchantAt = PAD + HEAD / 2;
const amountAt = PAD + HEAD + RULE + 3 * LINE + RULE + LINE / 2;
const MARKS = [
    { at: merchantAt, tag: "merchant" },
    { at: amountAt, tag: "amount" },
    { at: amountAt + LINE, tag: "account" },
    { at: amountAt + 2 * LINE, tag: "date" },
] as const satisfies readonly { at: number; tag: Tag }[];

const sweepAt = (y: number) => y / (RECEIPT_HEIGHT + BAND);

const BAR_COUNT = 40;
const noise = (index: number, salt: number) =>
    Math.abs(Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43_758.5453) % 1;
const BARS = Array.from({ length: BAR_COUNT }, (_, index) => {
    const taper = 0.3 + 0.7 * Math.sin((Math.PI * (index + 0.5)) / BAR_COUNT);
    const peak = (salt: number, loudness: number) => (0.12 + 0.88 * noise(index, salt)) * taper * loudness;
    return { a: peak(1, 0.7), b: peak(2, 1), c: peak(3, 0.9), d: peak(4, 0.55) };
});

interface Part {
    end: number;
    start: number;
    tag?: Tag;
}

function partsOf(sentence: string, slots: Record<Tag, string>) {
    const parts: Part[] = [];
    let cursor = 0;
    for (const tag of TAGS) {
        const start = sentence.indexOf(slots[tag], cursor);
        if (start !== -1) {
            const end = start + slots[tag].length;
            parts.push({ end: start, start: cursor }, { end, start, tag });
            cursor = end;
        }
    }
    parts.push({ end: sentence.length, start: cursor });
    return parts.filter((part) => part.end > part.start);
}

const makeScript = (sentence: string) => {
    const ends: number[] = [];
    let at = 0;
    for (const word of sentence.split(" ")) {
        at += word.length;
        ends.push(at);
        at += 1;
    }
    return async (act: Act<Scene>) => {
        await act.wait(500);
        await act.type("typed", sentence, { interval: 40 });
        await act.wait(350);
        act.put({ saved: true });
        await act.wait(1600);

        act.put({ saved: false });
        await act.wait(280);
        act.put({ mode: "voice", typed: "" });
        await act.wait(2250);
        for (const end of ends) {
            act.put({ typed: sentence.slice(0, end) });
            // oxlint-disable-next-line no-await-in-loop -- spoken words land one after another
            await act.wait(90);
        }
        await act.wait(350);
        act.put({ saved: true });
        await act.wait(1600);

        act.put({ saved: false });
        await act.wait(280);
        act.put({ mode: "scan", scan: 0, typed: "" });
        await act.wait(350);
        act.put({ scan: 1 });
        await act.wait(950);
        act.put({ scan: 2 });
        await act.wait(SWEEP_MS + 300);
        act.put({ scan: 3 });
        await act.wait(250);
        act.put({ saved: true });
        await loopBack(act, { out: true }, START);
    };
};

function Sentence({
    labels,
    live,
    parts,
    sentence,
    typed,
}: {
    labels: Record<Tag, string>;
    live: boolean;
    parts: readonly Part[];
    sentence: string;
    typed: string;
}) {
    const shown = typed.length;
    const chars = (from: number, to: number) => {
        const out: ReactNode[] = [];
        for (let index = from; index < to; index += 1) {
            if (live && index === shown) {
                out.push(<i className="cap-caret" key="caret" />);
            }
            out.push(
                <span className="cap-ch" data-in={index < shown || undefined} key={index}>
                    {sentence[index]}
                </span>
            );
        }
        return out;
    };
    return (
        <p className="cap-text">
            {parts.map((part) =>
                part.tag ? (
                    <span className="cap-token" data-lit={shown >= part.end || undefined} key={part.start}>
                        <span className="cap-tag">{labels[part.tag]}</span>
                        {chars(part.start, part.end)}
                    </span>
                ) : (
                    <Fragment key={part.start}>{chars(part.start, part.end)}</Fragment>
                )
            )}
        </p>
    );
}

export function CaptureFilm() {
    const copy = useIntlayer("film-capture");
    const sentence = copy.sentence.value;
    const slots: Record<Tag, string> = {
        account: copy.slots.account.value,
        amount: copy.slots.amount.value,
        category: copy.slots.category.value,
        date: copy.slots.date.value,
        merchant: copy.slots.merchant.value,
    };
    const labels: Record<Tag, string> = {
        account: copy.labels.account.value,
        amount: copy.labels.amount.value,
        category: copy.labels.category.value,
        date: copy.labels.date.value,
        merchant: copy.labels.merchant.value,
    };
    const parts = partsOf(sentence, slots);
    const script = useMemo(() => makeScript(sentence), [sentence]);
    return (
        <Stage<Scene>
            compact={{ below: FILM_COMPACT_BELOW, ...FILM_SIZES.capture.compact }}
            height={FILM_SIZES.capture.wide.height}
            initial={START}
            play="loop"
            poster={END}
            script={script}
            width={FILM_SIZES.capture.wide.width}
        >
            {({ mode, out, saved, scan, typed }, _rect, layout) => (
                <div className="film-scene" data-out={out || undefined}>
                    <div className="cap-panel film-panel" data-layout={layout}>
                        <div className="cap-head">
                            <Micro>{copy.newEntry}</Micro>
                            <div className="cap-modes">
                                {MODES.map((entry) => (
                                    <span
                                        className="cap-mode"
                                        data-on={mode === entry.mode || undefined}
                                        key={entry.mode}
                                    >
                                        <FilmIcon name={entry.icon} size={layout === "compact" ? 18 : 20} />
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="cap-body" data-mode={mode}>
                            <div
                                className="cap-layer"
                                data-on={mode === "type" || (mode === "voice" && typed !== "") || undefined}
                            >
                                <Sentence
                                    labels={labels}
                                    live={mode === "type" && typed.length < sentence.length}
                                    parts={parts}
                                    sentence={sentence}
                                    typed={typed}
                                />
                            </div>
                            <div className="cap-layer" data-on={(mode === "voice" && typed === "") || undefined}>
                                <div className="cap-wave">
                                    {BARS.map((bar, index) => (
                                        <span
                                            className="cap-bar"
                                            key={index}
                                            style={{ "--a": bar.a, "--b": bar.b, "--c": bar.c, "--d": bar.d }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="cap-layer" data-on={mode === "scan" || undefined}>
                                <div className="cap-scan">
                                    <span className="cap-corner" data-c="tl" />
                                    <span className="cap-corner" data-c="tr" />
                                    <span className="cap-corner" data-c="bl" />
                                    <span className="cap-corner" data-c="br" />
                                    <div className="cap-group" data-read={scan >= 2 || undefined}>
                                        <div
                                            className="cap-receipt"
                                            data-in={scan >= 1 || undefined}
                                            data-sweep={scan === 2 || undefined}
                                            style={{
                                                "--h": RECEIPT_HEIGHT,
                                                "--head": HEAD,
                                                "--line": LINE,
                                                "--pad": PAD,
                                                "--rule": RULE,
                                            }}
                                        >
                                            <div className="cap-shadow">
                                                <div className="cap-paper">
                                                    <div
                                                        className="cap-name cap-mark"
                                                        style={{ "--at": sweepAt(merchantAt) }}
                                                    >
                                                        COSTCO
                                                    </div>
                                                    <div className="cap-rule" />
                                                    {copy.receipt.items.map((item, index) => (
                                                        <div className="cap-line" key={item.value}>
                                                            <span>{item}</span>
                                                            <span>{PRICES[index]}</span>
                                                        </div>
                                                    ))}
                                                    <div className="cap-rule" />
                                                    <div
                                                        className="cap-line cap-mark cap-total"
                                                        style={{ "--at": sweepAt(amountAt) }}
                                                    >
                                                        <span>{copy.receipt.total}</span>
                                                        <span>42.00</span>
                                                    </div>
                                                    <div
                                                        className="cap-line cap-mark"
                                                        style={{ "--at": sweepAt(amountAt + LINE) }}
                                                    >
                                                        <span>{copy.receipt.account}</span>
                                                        <span>****4417</span>
                                                    </div>
                                                    <div
                                                        className="cap-line cap-mark"
                                                        style={{ "--at": sweepAt(amountAt + 2 * LINE) }}
                                                    >
                                                        <span>{copy.receipt.date}</span>
                                                        <span>14:32</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="cap-sweep" />
                                        </div>
                                        <div className="cap-tags">
                                            {MARKS.map((mark) => (
                                                <span
                                                    className="cap-chip"
                                                    key={mark.tag}
                                                    style={{ "--at": sweepAt(mark.at), "--y": mark.at }}
                                                >
                                                    <span>{labels[mark.tag]}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="cap-result film-panel film-rise" data-in={saved || undefined} data-layout={layout}>
                        <Ruled left={copy.today} right="−$42.00" />
                        <div className="cap-row">
                            <Logo name="costco" size={layout === "compact" ? 36 : 40} />
                            <span className="cap-who">
                                <b>Costco</b>
                                <Micro>{copy.sub}</Micro>
                            </span>
                            <span className="cap-amount">−$42.00</span>
                        </div>
                    </div>
                </div>
            )}
        </Stage>
    );
}
