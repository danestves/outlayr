import "@/components/app-ui/capture.css";
import { CAPTURE_WAYS } from "@/components/app-ui/capture-timing";
import type { CaptureWay } from "@/components/app-ui/capture-timing";

import { Replica } from "../replica";
import { PhoneFit } from "./phone-fit";
import type { SlotProps } from "./placeholder";

export function playWay(root: HTMLElement, way: string) {
    for (const marked of root.querySelectorAll<HTMLElement>("[data-take]")) {
        delete marked.dataset.take;
    }
    for (const target of root.querySelectorAll<HTMLElement>(`[data-way="${way}"]`)) {
        target.dataset.take = "play";
        for (const animation of target.getAnimations({ subtree: true })) {
            animation.currentTime = 0;
        }
    }
}

function Film({ theme, way }: { theme: NonNullable<SlotProps["theme"]>; way: CaptureWay }) {
    if (way === "say") {
        return <Replica>{({ SayFilm }, locale) => <SayFilm locale={locale} theme={theme} />}</Replica>;
    }
    if (way === "snap") {
        return <Replica>{({ SnapFilm }, locale) => <SnapFilm locale={locale} theme={theme} />}</Replica>;
    }
    return <Replica>{({ TypeFilm }, locale) => <TypeFilm locale={locale} theme={theme} />}</Replica>;
}

export function CaptureFilm({ theme = "light", way }: SlotProps & { way: CaptureWay }) {
    return (
        <div className="hz-capture-phone">
            <PhoneFit dark={theme === "dark"}>
                {CAPTURE_WAYS.map((id) => (
                    <div className="hz-capture-film" data-on={id === way || undefined} data-way={id} key={id}>
                        <Film theme={theme} way={id} />
                    </div>
                ))}
            </PhoneFit>
        </div>
    );
}
