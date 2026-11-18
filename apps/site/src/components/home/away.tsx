import { useIntlayer } from "react-intlayer";

import { sway } from "@/lib/sway";

import { WatchFace } from "./slots/watch";
import { MonthWidget } from "./slots/widget-month";
import { MonthWidgetSmall } from "./slots/widget-month-small";
import { TodayWidget } from "./slots/widget-today";
import { TodayListWidget } from "./slots/widget-today-list";

export function Away() {
    const { away } = useIntlayer("horizon");
    return (
        <section aria-labelledby="away-title" className="hz-section">
            <div className="hz-container hz-split">
                <div data-reveal="group">
                    <h2 className="hz-head hz-r" id="away-title">
                        <span className="hz-lead-in">{away.lead}</span> {away.rest}
                    </h2>
                    <p className="hz-line hz-r" style={{ "--i": 1 }}>
                        {away.line}
                    </p>
                </div>
                <div className="hz-away-stage" data-reveal="group" ref={sway}>
                    <div className="hz-piece hz-piece-month" style={{ "--z": 1 }}>
                        <MonthWidget />
                    </div>
                    <div className="hz-piece hz-piece-left" style={{ "--z": 1 }}>
                        <MonthWidgetSmall />
                    </div>
                    <div className="hz-piece hz-piece-watch" style={{ "--z": 2 }}>
                        <div className="hz-r" style={{ "--i": 1 }}>
                            <WatchFace />
                        </div>
                    </div>
                    <div className="hz-piece hz-piece-today" style={{ "--z": 3 }}>
                        <TodayWidget />
                    </div>
                    <div className="hz-piece hz-piece-list" style={{ "--z": 3 }}>
                        <TodayListWidget />
                    </div>
                </div>
            </div>
        </section>
    );
}
