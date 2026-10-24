import { Video } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Img, interpolate, Sequence, Series, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

import type { Lang } from "./copy";
import { COPY } from "./copy";
import { AppIcon, Banner, Headline, Page, Phone } from "./parts";
import { INK, MONO, MUTED } from "./theme";

const FILL = { height: "100%", objectFit: "cover", width: "100%" } as const;

export function BankShortcut({ lang }: { lang: Lang }) {
    const { fps } = useVideoConfig();
    const copy = COPY[lang];
    const cut = linearTiming({ durationInFrames: 12 });

    return (
        <TransitionSeries>
            <TransitionSeries.Sequence name="Hook" durationInFrames={Math.round(4 * fps)} premountFor={fps}>
                <Page label={copy.label}>
                    <Headline title={copy.hook} />
                    <Sequence from={Math.round(0.9 * fps)} premountFor={fps}>
                        <Banner app="BBVA" body={copy.bank3Body} glyph="B" now={copy.now} tint="#072146" top={1060} />
                    </Sequence>
                    <Sequence from={Math.round(1.4 * fps)} premountFor={fps}>
                        <Banner
                            app="Payoneer"
                            body={copy.bank2Body}
                            glyph="P"
                            now={copy.now}
                            tint="#FF4800"
                            top={890}
                        />
                    </Sequence>
                    <Sequence from={Math.round(1.9 * fps)} premountFor={fps}>
                        <Banner
                            app={copy.bank}
                            body={copy.bankBody}
                            glyph="$"
                            now={copy.now}
                            tint="#117ACA"
                            top={720}
                        />
                    </Sequence>
                </Page>
            </TransitionSeries.Sequence>
            <TransitionSeries.Transition presentation={fade()} timing={cut} />

            <TransitionSeries.Sequence name="Intro" durationInFrames={Math.round(2.8 * fps)} premountFor={fps}>
                <Page label={copy.label}>
                    <Headline sub={copy.introSub} title={copy.intro} />
                    <Intro />
                </Page>
            </TransitionSeries.Sequence>
            <TransitionSeries.Transition presentation={fade()} timing={cut} />

            <TransitionSeries.Sequence name="Get the shortcut" durationInFrames={198} premountFor={fps}>
                <Page label={copy.label}>
                    <Headline step="01" sub={copy.step1Sub} title={copy.step1} />
                    <Phone>
                        <Series>
                            <Series.Sequence durationInFrames={138} premountFor={fps}>
                                <Video
                                    muted
                                    playbackRate={1.25}
                                    src={staticFile("clips/get-shortcut.mp4")}
                                    style={FILL}
                                    trimAfter={5.75 * fps}
                                    trimBefore={0}
                                />
                            </Series.Sequence>
                            <Series.Sequence durationInFrames={60} premountFor={fps}>
                                <Video
                                    muted
                                    playbackRate={1.25}
                                    src={staticFile("clips/get-shortcut.mp4")}
                                    style={FILL}
                                    trimAfter={8.75 * fps}
                                    trimBefore={6.3 * fps}
                                />
                            </Series.Sequence>
                        </Series>
                    </Phone>
                </Page>
            </TransitionSeries.Sequence>
            <TransitionSeries.Transition presentation={fade()} timing={cut} />

            <TransitionSeries.Sequence name="Pick your banks" durationInFrames={339} premountFor={fps}>
                <Page label={copy.label}>
                    <Headline step="02" sub={copy.step2Sub} title={copy.step2} />
                    <Phone>
                        <Video
                            muted
                            playbackRate={1.75}
                            src={staticFile("clips/pick-banks.mp4")}
                            style={FILL}
                            trimAfter={23.75 * fps}
                            trimBefore={4 * fps}
                        />
                    </Phone>
                </Page>
            </TransitionSeries.Sequence>
            <TransitionSeries.Transition presentation={fade()} timing={cut} />

            <TransitionSeries.Sequence name="Turn it on" durationInFrames={214} premountFor={fps}>
                <Page label={copy.label}>
                    <Headline step="03" sub={copy.step3Sub} title={copy.step3} />
                    <Phone>
                        <Video
                            muted
                            playbackRate={1.25}
                            src={staticFile("clips/turn-on.mp4")}
                            style={FILL}
                            trimAfter={8.9 * fps}
                            trimBefore={0}
                        />
                    </Phone>
                </Page>
            </TransitionSeries.Sequence>
            <TransitionSeries.Transition presentation={fade()} timing={cut} />

            <TransitionSeries.Sequence name="Logged" durationInFrames={Math.round(9.4 * fps)} premountFor={fps}>
                <Page label={copy.label}>
                    <Headline sub={copy.payoffSub} title={copy.payoff} />
                    <Phone>
                        <Series>
                            <Series.Sequence durationInFrames={Math.round(2.2 * fps)} premountFor={fps}>
                                <Img src={staticFile("clips/home.png")} style={FILL} />
                                <Sequence from={Math.round(0.3 * fps)} premountFor={fps}>
                                    <Banner
                                        app={copy.bank}
                                        body={copy.bankBody}
                                        glyph="$"
                                        now={copy.now}
                                        tint="#117ACA"
                                        top={66}
                                    />
                                </Sequence>
                            </Series.Sequence>
                            <Series.Sequence durationInFrames={Math.round(7.2 * fps)} premountFor={fps}>
                                <Video
                                    muted
                                    src={staticFile("clips/logged.mp4")}
                                    style={FILL}
                                    trimAfter={9.4 * fps}
                                    trimBefore={2 * fps}
                                />
                            </Series.Sequence>
                        </Series>
                    </Phone>
                </Page>
            </TransitionSeries.Sequence>
            <TransitionSeries.Transition presentation={fade()} timing={cut} />

            <TransitionSeries.Sequence name="End" durationInFrames={Math.round(3.4 * fps)} premountFor={fps}>
                <Page label={copy.label}>
                    <End path={copy.endPath} requires={copy.endRequires} />
                </Page>
            </TransitionSeries.Sequence>
        </TransitionSeries>
    );
}

function Intro() {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const pop = spring({ config: { damping: 14 }, delay: Math.round(0.4 * fps), fps, frame });
    return (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 240 }}>
            <div style={{ opacity: pop, scale: interpolate(pop, [0, 1], [0.8, 1]) }}>
                <AppIcon size={300} />
            </div>
        </div>
    );
}

function End({ path, requires }: { path: string; requires: string }) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const rise = spring({ config: { damping: 200 }, fps, frame });
    return (
        <div
            style={{
                alignItems: "center",
                display: "flex",
                flexDirection: "column",
                gap: 40,
                marginTop: 420,
                opacity: rise,
                translate: `0 ${interpolate(rise, [0, 1], [30, 0])}px`,
            }}
        >
            <AppIcon size={220} />
            <div style={{ color: INK, fontFamily: MONO, fontSize: 92, letterSpacing: -2 }}>outlayr</div>
            <div style={{ fontSize: 40, fontWeight: 500, maxWidth: 860, textAlign: "center" }}>{path}</div>
            <div style={{ color: MUTED, fontFamily: MONO, fontSize: 30 }}>{requires}</div>
        </div>
    );
}
