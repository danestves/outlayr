import type { KeyboardEvent } from "react";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { CaptureFilm } from "./slots/capture-film";
import type { CaptureWay } from "./slots/capture-film";

const WAYS = ["type", "say", "snap"] as const satisfies readonly CaptureWay[];

const STEP = { ArrowDown: 1, ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1 } as const;

function isStep(key: string): key is keyof typeof STEP {
    return Object.hasOwn(STEP, key);
}

export function Capture() {
    const { how } = useIntlayer("horizon");
    const [current, setCurrent] = useState(0);
    const way = WAYS[current] ?? "type";

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (!isStep(event.key)) {
            return;
        }
        event.preventDefault();
        const next = (current + STEP[event.key] + WAYS.length) % WAYS.length;
        setCurrent(next);
        document.querySelector<HTMLButtonElement>(`#way-${WAYS[next]}`)?.focus();
    };

    return (
        <section aria-labelledby="how-title" className="hz-section" id="how">
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
                        {WAYS.map((id, index) => (
                            <li className="contents" key={id} role="presentation">
                                <button
                                    aria-controls="how-stage"
                                    aria-selected={index === current}
                                    className="hz-way"
                                    id={`way-${id}`}
                                    onClick={() => setCurrent(index)}
                                    onKeyDown={onKeyDown}
                                    role="tab"
                                    tabIndex={index === current ? 0 : -1}
                                    type="button"
                                >
                                    <span className="hz-way-name">{how.ways[id].name}</span>
                                    <span className="hz-way-line">
                                        <span className="sr-only">: </span>
                                        {how.ways[id].line}
                                    </span>
                                    <span aria-hidden="true" className="hz-way-bar" />
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
                        role="tabpanel"
                        style={{ "--i": "2" }}
                    >
                        <CaptureFilm way={way} />
                    </div>
                    <p aria-hidden="true" className="hz-caption">
                        {how.ways[way].line}
                    </p>
                </div>
            </div>
        </section>
    );
}
