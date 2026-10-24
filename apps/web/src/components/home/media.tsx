import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { Icon } from "@/components/icon";
import { useReducedMotion } from "@/lib/reduced-motion";
import { usePaintedTheme } from "@/lib/theme";

const BEZEL = {
    sizes: "(min-width: 40rem) 320px, 224px",
    src: "/app/iphone.webp",
    srcSet: "/app/iphone-500.webp 500w, /app/iphone.webp 1000w",
};
const AV1 = 'video/mp4; codecs="av01.0.08M.08"';
const FILM_SIZES = "(min-width: 64rem) 664px, calc(100vw - 3rem)";
const VARIANTS = [
    { className: "light-only", variant: "light" },
    { className: "dark-only", variant: "dark" },
] as const;

type Variant = (typeof VARIANTS)[number]["variant"];

export interface Poster {
    height: number;
    sizes: string;
    variants: Record<Variant, { src: string; srcSet: string }>;
    width: number;
}

const VIDEOS = import.meta.glob<string>("/src/assets/videos/*", { eager: true, import: "default" });

export function videoUrl(file: string) {
    const url = VIDEOS[`/src/assets/videos/${file}`];
    if (url === undefined) {
        throw new Error(`Missing video asset: ${file}`);
    }
    return url;
}

export function Phone({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <div className={`phone ${className}`}>
            {children}
            <img
                alt=""
                className="phone-bezel"
                height={2041}
                sizes={BEZEL.sizes}
                src={BEZEL.src}
                srcSet={BEZEL.srcSet}
                width={1000}
            />
        </div>
    );
}

export function Screen({ alt, eager = false, src }: { alt: string; eager?: boolean; src: string }) {
    return (
        <>
            <img
                alt={alt}
                className="phone-screen light-only"
                decoding="async"
                height={1912}
                loading={eager ? "eager" : "lazy"}
                src={src}
                width={880}
            />
            <img
                alt={alt}
                className="phone-screen dark-only"
                decoding="async"
                height={1912}
                loading={eager ? "eager" : "lazy"}
                src={src.replace(/\.webp$/u, "-dark.webp")}
                width={880}
            />
        </>
    );
}

export function useInView<T extends Element>(threshold = 0.3) {
    const ref = useRef<T>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const node = ref.current;
        if (node === null) {
            return;
        }
        const watcher = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), {
            threshold,
        });
        watcher.observe(node);
        return () => watcher.disconnect();
    }, [threshold]);
    return { inView, ref };
}

export function LoopVideo({
    av1,
    className = "relative",
    label,
    poster,
    sources,
}: {
    av1?: Record<Variant, string>;
    className?: string;
    label: string;
    poster: Poster;
    sources: Record<Variant, string>;
}) {
    const { pause, play } = useIntlayer("story");
    const reduced = useReducedMotion();
    const theme = usePaintedTheme();
    const { inView, ref } = useInView<HTMLDivElement>(0.3);
    const video = useRef<HTMLVideoElement>(null);
    const [choice, setChoice] = useState<boolean | null>(null);
    const [paused, setPaused] = useState(true);
    const wanted = choice ?? !reduced;
    const playing = wanted && inView;

    useEffect(() => {
        const element = video.current;
        if (element === null || element.dataset.variant !== theme) {
            return;
        }
        if (playing) {
            element.play().catch(() => undefined);
        } else {
            element.pause();
        }
    }, [playing, theme]);

    const toggle = () => {
        setChoice(paused);
        if (paused) {
            video.current?.play().catch(() => undefined);
        } else {
            video.current?.pause();
        }
    };

    return (
        <div className={className} ref={ref}>
            {VARIANTS.map(({ className: only, variant }) => (
                <img
                    alt=""
                    className={`${only} absolute inset-0 size-full object-cover`}
                    decoding="async"
                    height={poster.height}
                    key={variant}
                    loading="lazy"
                    sizes={poster.sizes}
                    src={poster.variants[variant].src}
                    srcSet={poster.variants[variant].srcSet}
                    width={poster.width}
                />
            ))}
            {theme === null ? null : (
                <video
                    aria-label={label}
                    className="relative size-full object-cover"
                    data-variant={theme}
                    height={poster.height}
                    key={theme}
                    loop
                    muted
                    onPause={() => setPaused(true)}
                    onPlay={() => setPaused(false)}
                    playsInline
                    preload="none"
                    ref={video}
                    width={poster.width}
                >
                    {av1 === undefined ? null : <source src={av1[theme]} type={AV1} />}
                    <source src={sources[theme]} type="video/mp4" />
                </video>
            )}
            <button
                aria-label={paused ? play.value : pause.value}
                className="glass fluid absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-full hover:scale-105 active:scale-[0.98]"
                onClick={toggle}
                type="button"
            >
                <Icon name={paused ? "play" : "pause"} />
            </button>
        </div>
    );
}

export function Film({ label, name }: { label: string; name: string }) {
    const { locale } = useLocale();
    const cut = locale === "es" ? "-es" : "";
    const clip = (variant: Variant, kind: string) => videoUrl(`${name}-${variant}${cut}${kind}`);
    const still = (variant: Variant) => ({
        src: clip(variant, ".webp"),
        srcSet: `${clip(variant, "-720.webp")} 720w, ${clip(variant, ".webp")} 1080w`,
    });
    return (
        <LoopVideo
            av1={{ dark: clip("dark", ".av1.mp4"), light: clip("light", ".av1.mp4") }}
            className="bg-surface relative aspect-square"
            label={label}
            poster={{
                height: 1080,
                sizes: FILM_SIZES,
                variants: { dark: still("dark"), light: still("light") },
                width: 1080,
            }}
            sources={{ dark: clip("dark", ".mp4"), light: clip("light", ".mp4") }}
        />
    );
}

export function Words({ text }: { text: string }) {
    const words = text.split(" ");
    return (
        <>
            {words.map((word, index) => (
                <span data-word key={`${index}-${word}`}>
                    {word}
                    {index < words.length - 1 ? " " : ""}
                </span>
            ))}
        </>
    );
}
