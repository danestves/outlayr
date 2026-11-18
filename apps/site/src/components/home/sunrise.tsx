import { useIntlayer } from "react-intlayer";

import { openStoreOnIpad } from "@/components/get-app";
import { StoreBadges } from "@/components/store-badges";
import { GET_APP_ID } from "@/lib/download";
import { playScene } from "@/lib/scene";
import { sway } from "@/lib/sway";

import { LogoTiles } from "./logo-tiles";
import { QrButton } from "./qr-button";

function stage(section: HTMLElement | null) {
    openStoreOnIpad();
    const scene = playScene(section);
    const pointer = sway(section);
    return () => {
        scene?.();
        pointer?.();
    };
}

export function Sunrise() {
    const { close } = useIntlayer("horizon");
    return (
        <section
            aria-labelledby="close-title"
            className="hz-close"
            data-night-ground=""
            data-sky="night"
            id={GET_APP_ID}
            ref={stage}
        >
            <div aria-hidden="true" className="hz-close-sky">
                <div className="hz-close-dawn" />
                <div className="hz-close-edge" />
                <div className="hz-close-sun">
                    <div className="hz-sun" data-halo="close">
                        <div className="hz-sun-disc" />
                    </div>
                </div>
            </div>
            <LogoTiles />
            <div className="hz-close-body" data-reveal="group">
                <h2 className="hz-close-title hz-r" id="close-title">
                    <span className="hz-lead-in">{close.lead}</span> {close.rest}
                </h2>
                <p className="hz-close-line hz-r" style={{ "--i": "1" }}>
                    {close.line}
                </p>
                <div className="hz-close-actions hz-r" style={{ "--i": "2" }}>
                    <StoreBadges lead="app-store" placement="closing" size="lg" />
                    <span aria-hidden="true" className="hz-rule" />
                    <QrButton placement="close" />
                </div>
            </div>
        </section>
    );
}
