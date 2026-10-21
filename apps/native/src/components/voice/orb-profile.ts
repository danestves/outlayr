// Mirrors the Liquid Orb editor's `siri` preset with the app's palette swapped in; idle scales active by its ratios.

export interface OrbProfile {
    colorA: readonly [number, number, number];
    colorB: readonly [number, number, number];
    colorC: readonly [number, number, number];
    colorD: readonly [number, number, number];
    contourDeform: number;
    exposure: number;
    glowColor: readonly [number, number, number];
    highlightColor: readonly [number, number, number];
    ridgeAmt: number;
    speed: number;
    warp: number;
    zoom: number;
}

export type Rgb = readonly [number, number, number];

function rgb(hex: string): Rgb {
    const channel = (at: number) => Number.parseInt(hex.slice(at, at + 2), 16) / 255;
    return [channel(1), channel(3), channel(5)];
}

const ACTIVE_PROFILE: OrbProfile = {
    colorA: rgb("#EC603B"),
    colorB: rgb("#65B3EE"),
    colorC: rgb("#FDCC41"),
    colorD: rgb("#C2371B"),
    contourDeform: 0.18,
    exposure: 2,
    glowColor: rgb("#EC603B"),
    highlightColor: rgb("#FFFFFF"),
    ridgeAmt: 0.5,
    speed: 0.82,
    warp: 3.2,
    zoom: 0.36,
};

const IDLE_PROFILE: OrbProfile = {
    colorA: rgb("#B07660"),
    colorB: rgb("#6C8CA0"),
    colorC: rgb("#B8A472"),
    colorD: rgb("#8A4A3A"),
    contourDeform: 0.05,
    exposure: 1.36,
    glowColor: rgb("#6C5A55"),
    highlightColor: rgb("#C9C3B8"),
    ridgeAmt: 0.24,
    speed: 0.246,
    warp: 1.664,
    zoom: 0.3384,
};

export const SHARED_UNIFORMS = {
    canvasColor: rgb("#17150F"),
    edgeGlow: 0,
    edgeSoftness: 0.005,
    glassOpacity: 0.44,
    gloss: 0.24,
    radius: 0.72,
    shade: 0.12,
    sheen: 0.28,
    sheenColor: rgb("#FFF4EA"),
    shellEdge: rgb("#F5B89E"),
    shellEdgeAlpha: 0.18,
    shellInner: rgb("#FFFFFF"),
    shellMid: rgb("#FFD9C4"),
    shellMidAlpha: 0.18,
    specColor: rgb("#FFE8DC"),
} as const;

function mixRgb(from: Rgb, to: Rgb, k: number): [number, number, number] {
    "worklet";
    return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k];
}

export function blendProfile(activation: number): OrbProfile {
    "worklet";
    const k = Math.min(1, Math.max(0, activation));
    const lerp = (a: number, b: number) => a + (b - a) * k;
    return {
        colorA: mixRgb(IDLE_PROFILE.colorA, ACTIVE_PROFILE.colorA, k),
        colorB: mixRgb(IDLE_PROFILE.colorB, ACTIVE_PROFILE.colorB, k),
        colorC: mixRgb(IDLE_PROFILE.colorC, ACTIVE_PROFILE.colorC, k),
        colorD: mixRgb(IDLE_PROFILE.colorD, ACTIVE_PROFILE.colorD, k),
        contourDeform: lerp(IDLE_PROFILE.contourDeform, ACTIVE_PROFILE.contourDeform),
        exposure: lerp(IDLE_PROFILE.exposure, ACTIVE_PROFILE.exposure),
        glowColor: mixRgb(IDLE_PROFILE.glowColor, ACTIVE_PROFILE.glowColor, k),
        highlightColor: mixRgb(IDLE_PROFILE.highlightColor, ACTIVE_PROFILE.highlightColor, k),
        ridgeAmt: lerp(IDLE_PROFILE.ridgeAmt, ACTIVE_PROFILE.ridgeAmt),
        speed: lerp(IDLE_PROFILE.speed, ACTIVE_PROFILE.speed),
        warp: lerp(IDLE_PROFILE.warp, ACTIVE_PROFILE.warp),
        zoom: lerp(IDLE_PROFILE.zoom, ACTIVE_PROFILE.zoom),
    };
}
