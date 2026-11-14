import { lazy, Suspense, useState } from "react";
import type { CSSProperties } from "react";

import { FilmFrame } from "./frame";
import { FILM_SIZES } from "./sizes";

const FILMS = {
    capture: lazy(async () => {
        const { CaptureFilm } = await import("./capture");
        return { default: CaptureFilm };
    }),
    chaos: lazy(async () => {
        const { ChaosFilm } = await import("./chaos");
        return { default: ChaosFilm };
    }),
    month: lazy(async () => {
        const { MonthFilm } = await import("./month");
        return { default: MonthFilm };
    }),
    sorted: lazy(async () => {
        const { SortedFilm } = await import("./sorted");
        return { default: SortedFilm };
    }),
} as const;

const NEAR_VIEWPORT = "800px 0px";

export function LazyFilm({ label, name }: { label: string; name: keyof typeof FILMS }) {
    const [near, setNear] = useState(false);
    const Film = FILMS[name];
    const { compact, wide } = FILM_SIZES[name];
    const size: CSSProperties = {
        "--c-h": compact.height,
        "--c-w": compact.width,
        "--w-h": wide.height,
        "--w-w": wide.width,
    };

    const watch = (node: HTMLDivElement | null) => {
        if (node === null || near) {
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setNear(true);
                    observer.disconnect();
                }
            },
            { rootMargin: NEAR_VIEWPORT }
        );
        observer.observe(node);
        return () => observer.disconnect();
    };

    return (
        <FilmFrame label={label}>
            <div className="film-slot" ref={watch} style={size}>
                <div>
                    {near ? (
                        <Suspense fallback={null}>
                            <Film />
                        </Suspense>
                    ) : null}
                </div>
            </div>
        </FilmFrame>
    );
}
