import type { ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import { HAIR, INK, MONO, MUTED, PAPER, SANS } from "./theme";

const GRID_STEP = 90;
const PHONE_WIDTH = 660;
const SCREEN_ASPECT = 1564 / 720;
const BEZEL = 14;
const ENTER = Easing.bezier(0.16, 1, 0.3, 1);

export function Page({ label, children }: { children: ReactNode; label: string }) {
    return (
        <AbsoluteFill
            style={{
                backgroundColor: PAPER,
                backgroundImage: `linear-gradient(${HAIR} 1px, transparent 1px), linear-gradient(90deg, ${HAIR} 1px, transparent 1px)`,
                backgroundSize: `${GRID_STEP}px ${GRID_STEP}px`,
                color: INK,
                fontFamily: SANS,
            }}
        >
            <div
                style={{
                    borderBottom: `1px solid ${INK}`,
                    display: "flex",
                    fontFamily: MONO,
                    fontSize: 26,
                    justifyContent: "space-between",
                    letterSpacing: 3,
                    margin: "0 72px",
                    paddingBottom: 18,
                    paddingTop: 84,
                    textTransform: "uppercase",
                }}
            >
                <span>outlayr</span>
                <span style={{ color: MUTED }}>{label}</span>
            </div>
            {children}
        </AbsoluteFill>
    );
}

export function Headline({
    step,
    title,
    sub,
    delay = 0,
}: {
    delay?: number;
    step?: string;
    sub?: string;
    title: string;
}) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const rise = (offset: number) => ({
        opacity: interpolate(frame, [delay + offset, delay + offset + 0.5 * fps], [0, 1], {
            easing: ENTER,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
        }),
        translate: `0 ${interpolate(frame, [delay + offset, delay + offset + 0.6 * fps], [28, 0], {
            easing: ENTER,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
        })}px`,
    });
    return (
        <div style={{ margin: "0 72px", paddingTop: 56 }}>
            {step ? (
                <div style={{ ...rise(0), fontFamily: MONO, fontSize: 30, letterSpacing: 2, marginBottom: 14 }}>
                    {step}
                </div>
            ) : null}
            <div style={{ ...rise(3), fontSize: 76, fontWeight: 600, letterSpacing: -2, lineHeight: 1.04 }}>
                {title}
            </div>
            {sub ? (
                <div style={{ ...rise(8), color: MUTED, fontFamily: MONO, fontSize: 30, marginTop: 20 }}>{sub}</div>
            ) : null}
        </div>
    );
}

export function Phone({ children }: { children: ReactNode }) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const lift = spring({ config: { damping: 200 }, fps, frame });
    const height = PHONE_WIDTH * SCREEN_ASPECT;
    return (
        <div
            style={{
                backgroundColor: "#0C0B09",
                borderRadius: 86,
                bottom: -height * 0.04,
                boxShadow: "0 40px 80px rgba(23, 21, 15, 0.25)",
                height: height + BEZEL * 2,
                left: (1080 - PHONE_WIDTH - BEZEL * 2) / 2,
                padding: BEZEL,
                position: "absolute",
                translate: `0 ${interpolate(lift, [0, 1], [120, 0])}px`,
                width: PHONE_WIDTH + BEZEL * 2,
            }}
        >
            <div style={{ borderRadius: 72, height, overflow: "hidden", position: "relative", width: PHONE_WIDTH }}>
                {children}
            </div>
        </div>
    );
}

export function Banner({
    app,
    body,
    glyph,
    now,
    tint,
    top = 0,
}: {
    app: string;
    body: string;
    glyph: string;
    now: string;
    tint: string;
    top?: number;
}) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const drop = spring({ config: { damping: 18, mass: 0.7 }, fps, frame });
    return (
        <div
            style={{
                alignItems: "center",
                backgroundColor: "rgba(250, 249, 246, 0.94)",
                borderRadius: 34,
                boxShadow: "0 18px 40px rgba(23, 21, 15, 0.18)",
                display: "flex",
                gap: 22,
                left: 20,
                opacity: interpolate(drop, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }),
                padding: "22px 26px",
                position: "absolute",
                right: 20,
                top,
                translate: `0 ${interpolate(drop, [0, 1], [-140, 0])}px`,
            }}
        >
            <div
                style={{
                    alignItems: "center",
                    backgroundColor: tint,
                    borderRadius: 16,
                    color: "white",
                    display: "flex",
                    flex: "none",
                    fontSize: 34,
                    fontWeight: 600,
                    height: 64,
                    justifyContent: "center",
                    width: 64,
                }}
            >
                {glyph}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", fontSize: 28, fontWeight: 600, justifyContent: "space-between" }}>
                    <span>{app}</span>
                    <span style={{ color: MUTED, fontWeight: 400 }}>{now}</span>
                </div>
                <div style={{ fontSize: 27, lineHeight: 1.25 }}>{body}</div>
            </div>
        </div>
    );
}

export function AppIcon({ size }: { size: number }) {
    return <Img src={staticFile("icon.png")} style={{ borderRadius: size * 0.225, height: size, width: size }} />;
}
