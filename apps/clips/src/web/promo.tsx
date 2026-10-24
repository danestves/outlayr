import { linearTiming, TransitionSeries } from "@remotion/transitions";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import type { ReactNode } from "react";
import { AbsoluteFill, Img, Sequence, staticFile, useVideoConfig } from "remotion";

import { Capture } from "./capture";
import { Chaos } from "./chaos";
import { Film, reveal, useSeconds } from "./kit";
import { Month } from "./month";
import { Sorted } from "./sorted";
import { FLUID, mix, ramp, useTheme } from "./theme";

const CUT = 0.6;

type Empty = Record<string, never>;

function BlurPush({
    children,
    presentationDirection,
    presentationProgress,
}: TransitionPresentationComponentProps<Empty>) {
    const entering = presentationDirection === "entering";
    const p = entering ? presentationProgress : 1 - presentationProgress;
    return (
        <AbsoluteFill
            style={{
                filter: p < 0.999 ? `blur(${(1 - p) * 26}px)` : undefined,
                opacity: p,
                scale: String(entering ? mix(1.04, 1, p) : mix(0.97, 1, p)),
                translate: `0 ${(1 - p) * (entering ? 140 : -140)}px`,
            }}
        >
            {children}
        </AbsoluteFill>
    );
}

const blurPush = (): TransitionPresentation<Empty> => ({ component: BlurPush, props: {} });

function Beat({ children, from, scale = 1 }: { children: ReactNode; from: number; scale?: number }) {
    const { fps } = useVideoConfig();
    return (
        <AbsoluteFill style={{ scale: String(scale) }}>
            <Sequence from={-Math.round(from * fps)}>{children}</Sequence>
        </AbsoluteFill>
    );
}

function EndCard() {
    const t = useSeconds();
    const theme = useTheme();
    return (
        <AbsoluteFill style={{ alignItems: "center", gap: 40, justifyContent: "center" }}>
            <div style={{ ...reveal(ramp(t, 0.15, 1), 60, 24), scale: String(mix(0.9, 1, ramp(t, 0.15, 1.2))) }}>
                <Img
                    src={staticFile("icon.png")}
                    style={{
                        display: "block",
                        filter: "drop-shadow(0 30px 50px rgba(0, 0, 0, 0.45))",
                        height: 240,
                        width: 240,
                    }}
                />
            </div>
            <span
                style={{
                    color: theme.fg,
                    fontSize: 76,
                    fontWeight: 500,
                    letterSpacing: "-0.03em",
                    ...reveal(ramp(t, 0.4, 1), 40, 20),
                }}
            >
                Outlayr
            </span>
        </AbsoluteFill>
    );
}

export const PROMO_SECONDS = 4.2 + 5 + 6.1 + 4.6 + 2.4 - 4 * CUT;

export function Promo() {
    const { fps } = useVideoConfig();
    const cut = () => (
        <TransitionSeries.Transition
            presentation={blurPush()}
            timing={linearTiming({ durationInFrames: Math.round(CUT * fps), easing: FLUID })}
        />
    );
    return (
        <Film mode="dark">
            <TransitionSeries>
                <TransitionSeries.Sequence durationInFrames={Math.round(4.2 * fps)} premountFor={fps}>
                    <Beat from={2.4} scale={1.22}>
                        <Chaos mode="dark" />
                    </Beat>
                </TransitionSeries.Sequence>
                {cut()}
                <TransitionSeries.Sequence durationInFrames={5 * fps} premountFor={fps}>
                    <Beat from={0.2} scale={1.18}>
                        <Capture mode="dark" />
                    </Beat>
                </TransitionSeries.Sequence>
                {cut()}
                <TransitionSeries.Sequence durationInFrames={Math.round(6.1 * fps)} premountFor={fps}>
                    <Beat from={0.3} scale={1.14}>
                        <Sorted mode="dark" />
                    </Beat>
                </TransitionSeries.Sequence>
                {cut()}
                <TransitionSeries.Sequence durationInFrames={Math.round(4.6 * fps)} premountFor={fps}>
                    <Beat from={0} scale={1.28}>
                        <Month mode="dark" />
                    </Beat>
                </TransitionSeries.Sequence>
                {cut()}
                <TransitionSeries.Sequence durationInFrames={Math.round(2.4 * fps)} premountFor={fps}>
                    <EndCard />
                </TransitionSeries.Sequence>
            </TransitionSeries>
        </Film>
    );
}
