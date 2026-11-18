import { useIntlayer } from "react-intlayer";

import { GetAppButton } from "@/components/get-app";
import { LogoMark } from "@/components/logo-mark";
import { watchGround } from "@/lib/ground";

const GROUND_LINE = 40;
const CLOSE_REACH = 100_000;
const SETTLE_MS = 150;

function track(bar: HTMLElement | null) {
    const hero = document.querySelector(".hz-actions");
    const close = document.querySelector(".hz-close-actions");
    if (!bar || !hero || !close) {
        return;
    }
    let past = false;
    let closing = false;
    let settle = 0;
    const untint = () => {
        clearTimeout(settle);
        settle = window.setTimeout(() => bar.toggleAttribute("data-tint", past), SETTLE_MS);
    };
    const paint = () => {
        if (past) {
            clearTimeout(settle);
            bar.toggleAttribute("data-tint", true);
        } else {
            untint();
        }
        bar.toggleAttribute("data-past", past);
        bar.toggleAttribute("data-up", past && !closing);
    };
    const scroll = () => {
        if (!past && Object.hasOwn(bar.dataset, "tint")) {
            untint();
        }
    };
    const heroWatch = new IntersectionObserver(([entry]) => {
        if (entry) {
            past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
            paint();
        }
    });
    const closeWatch = new IntersectionObserver(
        ([entry]) => {
            if (entry) {
                closing = entry.isIntersecting;
                paint();
            }
        },
        { rootMargin: `${CLOSE_REACH}px 0px 0px 0px` }
    );
    heroWatch.observe(hero);
    closeWatch.observe(close);
    addEventListener("scroll", scroll, { passive: true });
    const ground = watchGround(bar, () => innerHeight - GROUND_LINE);
    return () => {
        heroWatch.disconnect();
        closeWatch.disconnect();
        clearTimeout(settle);
        removeEventListener("scroll", scroll);
        ground();
    };
}

export function InstallBar() {
    const { getApp } = useIntlayer("site");
    return (
        <aside className="hz-install" ref={track}>
            <span aria-hidden="true" className="hz-install-icon">
                <LogoMark className="size-6" />
            </span>
            <span className="hz-install-text">
                <span className="hz-install-name">Outlayr</span> <span className="hz-install-sub">{getApp.free}</span>
            </span>
            <GetAppButton className="hz-pill" placement="install">
                {getApp.title}
            </GetAppButton>
        </aside>
    );
}
