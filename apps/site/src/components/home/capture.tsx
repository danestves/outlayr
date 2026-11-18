import type { AnimationEvent, KeyboardEvent, MouseEvent } from "react";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { CAPTURE_WAYS, FILM_SECONDS } from "@/components/app-ui/capture-timing";

import { CaptureFilm, playWay } from "./slots/capture-film";

const STEP = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 } as const;
const IN_VIEW = 0.35;

function isStep(key: string): key is keyof typeof STEP {
    return Object.hasOwn(STEP, key);
}

function keyedWay(key: string, current: number): number | null {
    if (key === "Home") {
        return 0;
    }
    if (key === "End") {
        return CAPTURE_WAYS.length - 1;
    }
    return isStep(key) ? (current + STEP[key] + CAPTURE_WAYS.length) % CAPTURE_WAYS.length : null;
}

function nextWay(current: number, auto: boolean): number | null {
    const next = current + 1;
    return auto && next < CAPTURE_WAYS.length ? next : null;
}

function watch(section: HTMLElement | null) {
    const stage = section?.querySelector(".hz-capture-stage");
    if (!section || !stage) {
        return;
    }
    let away = true;
    let fetched = false;
    const sync = () => section.toggleAttribute("data-away", away || document.hidden);
    const observer = new IntersectionObserver(
        ([entry]) => {
            away = !entry?.isIntersecting;
            if (!away && !fetched) {
                fetched = true;
                for (const image of section.querySelectorAll<HTMLImageElement>(".hz-capture-film img")) {
                    const early = new Image();
                    early.src = image.src;
                }
            }
            const way = section.querySelector<HTMLElement>('[aria-selected="true"] [data-way]')?.dataset.way;
            if (!away && way && !section.querySelector("[data-take]")) {
                playWay(section, way);
            }
            sync();
        },
        { threshold: IN_VIEW }
    );
    observer.observe(stage);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", sync);
    };
}

export function Capture() {
    const { how } = useIntlayer("horizon");
    const { colon } = useIntlayer("site");
    const [current, setCurrent] = useState(0);
    const [auto, setAuto] = useState(true);
    const [paused, setPaused] = useState(false);
    const [playing, setPlaying] = useState(true);
    const way = CAPTURE_WAYS[current] ?? "type";

    const select = (target: HTMLElement, index: number) => {
        const section = target.closest("section");
        setCurrent(index);
        setPaused(false);
        setPlaying(true);
        if (section) {
            playWay(section, CAPTURE_WAYS[index] ?? "type");
        }
    };

    const pick = (event: MouseEvent<HTMLButtonElement>, index: number) => {
        setAuto(false);
        select(event.currentTarget, index);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const next = keyedWay(event.key, current);
        if (next === null) {
            return;
        }
        event.preventDefault();
        setAuto(false);
        select(event.currentTarget, next);
        document.querySelector<HTMLButtonElement>(`#way-${CAPTURE_WAYS[next]}`)?.focus();
    };

    const onAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
        if (event.animationName !== "capture-clock") {
            return;
        }
        const next = nextWay(current, auto);
        if (next === null) {
            setAuto(false);
            setPlaying(false);
            return;
        }
        select(event.currentTarget, next);
    };

    return (
        <section
            aria-labelledby="how-title"
            className="hz-section"
            data-paused={paused || undefined}
            id="how"
            ref={watch}
        >
            <div className="hz-container hz-split hz-capture">
                <div data-reveal="group">
                    <h2 className="hz-head hz-r" id="how-title">
                        <span className="hz-lead-in">{how.lead}</span> {how.rest}
                    </h2>
                    <ul
                        aria-label={how.label.value}
                        className="hz-ways hz-r"
                        role="tablist"
                        style={{ "--i": "1", "--k": `${current}` }}
                    >
                        <li aria-hidden="true" className="hz-ways-thumb" />
                        {CAPTURE_WAYS.map((id, index) => (
                            <li className="contents" key={id} role="presentation">
                                <button
                                    aria-controls="how-stage"
                                    aria-selected={index === current}
                                    className="hz-way"
                                    id={`way-${id}`}
                                    onClick={(event) => pick(event, index)}
                                    onKeyDown={onKeyDown}
                                    role="tab"
                                    tabIndex={index === current ? 0 : -1}
                                    type="button"
                                >
                                    <span className="hz-way-name">{how.ways[id].name}</span>
                                    <span className="hz-way-line">
                                        <span className="sr-only">{colon}</span>
                                        {how.ways[id].line}
                                    </span>
                                    <span
                                        aria-hidden="true"
                                        className="hz-way-bar"
                                        data-way={id}
                                        style={{ "--film": `${FILM_SECONDS[id]}s` }}
                                    />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="hz-play" data-reveal="group">
                    <div
                        aria-labelledby={`way-${way}`}
                        className="hz-capture-stage hz-r"
                        id="how-stage"
                        onAnimationEnd={onAnimationEnd}
                        role="tabpanel"
                        style={{ "--i": "2" }}
                    >
                        <CaptureFilm way={way} />
                        {playing ? (
                            <button
                                aria-label={paused ? how.play.value : how.pause.value}
                                className="hz-capture-pause"
                                onClick={() => setPaused(!paused)}
                                type="button"
                            >
                                <svg aria-hidden="true" height="14" viewBox="0 0 14 14" width="14">
                                    {paused ? (
                                        <path d="M3.5 2.2v9.6a.6.6 0 0 0 .9.5l8-4.8a.6.6 0 0 0 0-1L4.4 1.7a.6.6 0 0 0-.9.5Z" />
                                    ) : (
                                        <path d="M3 2h2.6v10H3zM8.4 2H11v10H8.4z" />
                                    )}
                                </svg>
                            </button>
                        ) : null}
                    </div>
                    <p aria-hidden="true" className="hz-caption">
                        {how.ways[way].line}
                    </p>
                </div>
            </div>
        </section>
    );
}
