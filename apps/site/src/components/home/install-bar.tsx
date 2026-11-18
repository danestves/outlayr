import { useIntlayer } from "react-intlayer";

import { GetAppButton } from "@/components/get-app";
import { LogoMark } from "@/components/logo-mark";
import { watchGround } from "@/lib/ground";

const GROUND_LINE = 40;

function track(bar: HTMLDivElement | null) {
    const hero = document.querySelector(".hz-actions");
    const close = document.querySelector(".hz-close-actions");
    if (!bar || !hero || !close) {
        return;
    }
    let past = false;
    let closing = false;
    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const above = entry.boundingClientRect.top < 0;
            if (entry.target === hero) {
                past = !entry.isIntersecting && above;
            } else {
                closing = entry.isIntersecting || above;
            }
        }
        bar.toggleAttribute("data-up", past && !closing);
    });
    observer.observe(hero);
    observer.observe(close);
    const ground = watchGround(bar, () => innerHeight - GROUND_LINE);
    return () => {
        observer.disconnect();
        ground();
    };
}

export function InstallBar() {
    const { getApp } = useIntlayer("site");
    return (
        <div className="hz-install" ref={track}>
            <span aria-hidden="true" className="hz-install-icon">
                <LogoMark className="size-6" />
            </span>
            <span className="hz-install-text">
                <span className="hz-install-name">Outlayr</span> <span className="hz-install-sub">{getApp.free}</span>
            </span>
            <GetAppButton className="hz-pill" placement="install">
                {getApp.title}
            </GetAppButton>
        </div>
    );
}
