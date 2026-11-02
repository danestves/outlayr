import type { ReactNode } from "react";

const BEZEL = {
    sizes: "(min-width: 40rem) 320px, 224px",
    src: "/app/iphone.webp",
    srcSet: "/app/iphone-500.webp 500w, /app/iphone.webp 1000w",
};
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

const SPANISH_SCREENS = new Set(["04", "05", "06", "10", "log-an-expense"]);

export function screenSources(name: string, locale: string) {
    const spanish = locale === "es" && SPANISH_SCREENS.has(name);
    const base = spanish ? `/screens/es/${name}` : `/screens/${name}`;
    return { dark: `${base}-dark.webp`, src: `${base}.webp` };
}

export function Screen({
    alt,
    dark,
    eager = false,
    src,
}: {
    alt: string;
    dark?: string;
    eager?: boolean;
    src: string;
}) {
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
                src={dark ?? src.replace(/\.webp$/u, "-dark.webp")}
                width={880}
            />
        </>
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
