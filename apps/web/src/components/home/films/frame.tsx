import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Icon } from "@/components/icon";
import { useReducedMotion } from "@/lib/reduced-motion";
import { PlayChoice } from "@/stageshow/reduced-motion";

import "./films.css";

export function FilmFrame({
    children,
    className = "",
    label,
}: {
    children: ReactNode;
    className?: string;
    label: string;
}) {
    const { pause, play } = useIntlayer("story");
    const reduced = useReducedMotion();
    const [choice, setChoice] = useState<boolean | null>(null);
    const playing = choice ?? !reduced;
    return (
        <figure aria-label={label} className={`film relative ${className}`}>
            <div aria-hidden>
                <PlayChoice value={playing}>{children}</PlayChoice>
            </div>
            <button
                aria-label={playing ? pause.value : play.value}
                className="glass fluid absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-full active:scale-[0.98]"
                onClick={() => setChoice(!playing)}
                type="button"
            >
                <Icon name={playing ? "pause" : "play"} />
            </button>
        </figure>
    );
}
