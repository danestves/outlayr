import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { playScene } from "@/lib/scene";
import { sway } from "@/lib/sway";

import { BudgetsPhone } from "./slots/budgets-phone";
import { InsightsPhone } from "./slots/insights-phone";
import { LogPhone } from "./slots/log-phone";

const SKY = ["day", "gold", "dusk", "night"] as const;

function FanPhone({ children, side }: { children: ReactNode; side?: "left" | "right" }) {
    return (
        <div className="hz-fan-phone" data-side={side}>
            <figure className="hz-fan-body">
                {children}
                <span aria-hidden="true" className="hz-fan-glare" />
                <span aria-hidden="true" className="hz-fan-catch" />
            </figure>
        </div>
    );
}

export function Sunset() {
    const { dusk } = useIntlayer("horizon");
    return (
        <section aria-labelledby="dusk-title" className="hz-dusk" id="features">
            <div className="hz-dusk-head" data-reveal="group">
                <h2 className="hz-dusk-title hz-r" id="dusk-title">
                    <span className="hz-lead-in">{dusk.lead}</span> {dusk.rest}
                </h2>
                <p className="hz-dusk-line hz-r" style={{ "--i": "1" }}>
                    {dusk.line}
                </p>
            </div>
            <div className="hz-track" ref={playScene}>
                <div aria-hidden="true" className="hz-night-mark" data-night-ground="" />
                <div className="hz-sunset" data-reveal="group" ref={sway}>
                    <div aria-hidden="true" className="hz-sky">
                        {SKY.map((layer) => (
                            <div className="hz-sky-layer" data-layer={layer} key={layer} />
                        ))}
                        <div className="hz-sunset-sun">
                            <div className="hz-sun">
                                <div className="hz-sun-disc" />
                            </div>
                        </div>
                    </div>
                    <div aria-hidden="true" className="hz-ground" />
                    <div aria-hidden="true" className="hz-glow" />
                    <div className="hz-fan">
                        <div className="hz-fan-rig">
                            <FanPhone side="left">
                                <LogPhone />
                            </FanPhone>
                            <FanPhone side="right">
                                <BudgetsPhone />
                            </FanPhone>
                            <FanPhone>
                                <InsightsPhone />
                            </FanPhone>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
