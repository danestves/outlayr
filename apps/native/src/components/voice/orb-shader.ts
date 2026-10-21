// The Liquid Orb editor's `siri` program with its glass shell (lersent001/orb, MIT), ported from WGSL to SkSL
// expression for expression, so the editor's URL params map 1:1 into `orb-profile.ts`: retune there, not here.
// Output is premultiplied, and nothing outside the limb paints, so the orb sits on any ground.
export const ORB_SKSL = `
uniform float2 iResolution;
uniform float time;
uniform float speed;
uniform float radius;
uniform float zoom;
uniform float warp;
uniform float ridgeAmt;
uniform float shade;
uniform float sheen;
uniform float gloss;
uniform float shellMidAlpha;
uniform float shellEdgeAlpha;
uniform float exposure;
uniform float edgeSoftness;
uniform float edgeGlow;
uniform float glassOpacity;
uniform float contourDeform;
uniform float3 colorA;
uniform float3 colorB;
uniform float3 colorC;
uniform float3 colorD;
uniform float3 highlightColor;
uniform float3 shellInner;
uniform float3 shellMid;
uniform float3 shellEdge;
uniform float3 sheenColor;
uniform float3 specColor;
uniform float3 canvasColor;
uniform float3 glowColor;

const float CLEAR_EA = 0.995;
const float CLEAR_EB = 1.04;
const float CONTOUR_STRENGTH = 0.09;

float edgeD(float soft) {
    return soft - 0.005;
}

float3 edgeGlowOf(float3 col, float2 uv, float rad, float soft, float glow, float3 glowRGB) {
    if (glow <= 0.0) { return col; }
    float r = length(uv);
    float outside = smoothstep(rad - max(soft, 0.0005), rad + max(soft, 0.0005), r);
    return col + glowRGB * (glow * exp(-max(r - rad, 0.0) * 11.0) * outside);
}

float3 finishEmission(float3 colorIn, float2 p) {
    float3 color = colorIn;
    color = mix(color, highlightColor, shade * 0.22 * smoothstep(0.15, 1.15, dot(p, float2(-0.32, 0.78))));
    color = color * (1.0 - shade * 0.34 * smoothstep(-0.1, 1.2, dot(p, float2(0.45, -0.62))));
    color = color * (1.0 - shade * 0.22 * smoothstep(0.72, 1.08, length(p)));
    return clamp(color, float3(0.0), float3(1.0));
}

float2 siriBand(float2 q, float drift, float phaseOffset, float amplitude, float mainY, float envelope, float softness) {
    float y = amplitude * envelope * sin(q.x + drift + phaseOffset);
    float distanceToLine = abs(q.y - y);
    float crest = 0.018 / (sqrt(distanceToLine * distanceToLine + softness * softness) + 0.026);
    float bandDistance = max(0.0, max(q.y - max(mainY, y), min(mainY, y) - q.y));
    float band = 0.018 / (bandDistance + 0.075);
    return float2(crest, band);
}

float3 siriFluid(float2 p, float t) {
    float scale = 0.74 + zoom * 0.34;
    float2 q = p / scale;
    float envelopeBase = cos(1.57079633 * min(abs(0.9 * q.x), 1.0));
    float envelope = envelopeBase * envelopeBase;
    float low = 0.5 + 0.5 * cos(t * 0.37);
    float mid = 0.5 + 0.5 * sin(t * 0.51 + 1.2);
    float high = 0.5 + 0.5 * cos(t * 0.73 + 2.1);
    float drift = t * 2.4;
    float mainAmplitude = 0.25 + ridgeAmt * 0.075 + low * 0.018;
    float bandAmplitude = mainAmplitude + mid * 0.025 + high * 0.018;
    float mainY = mainAmplitude * envelope * sin(q.x * 1.1 + drift);
    float separation = 1.85 + warp * 0.2 + mid * 0.28;
    float softness = 0.035 + (1.0 - ridgeAmt) * 0.018 + mid * 0.006;

    float2 band0 = siriBand(q, drift, -separation, bandAmplitude, mainY, envelope, softness);
    float2 band1 = siriBand(q, drift, -separation * 0.34, bandAmplitude, mainY, envelope, softness);
    float2 band2 = siriBand(q, drift, separation * 0.34, bandAmplitude, mainY, envelope, softness);
    float2 band3 = siriBand(q, drift, separation, bandAmplitude, mainY, envelope, softness);
    float w0 = band0.x + band0.y;
    float w1 = band1.x + band1.y;
    float w2 = band2.x + band2.y;
    float w3 = band3.x + band3.y;
    float total = w0 + w1 + w2 + w3;
    float d0 = w0 * w0;
    float d1 = w1 * w1;
    float d2 = w2 * w2;
    float d3 = w3 * w3;
    float dominantTotal = d0 + d1 + d2 + d3;
    float3 spectral = (colorA * d0 + colorC * d1 + colorB * d2 + colorD * d3) / max(dominantTotal, 0.0001);
    float energy = (1.0 - exp(-total * 0.58)) * envelope;
    float mainDistance = abs(q.y - mainY);
    float whiteCore = exp(-mainDistance * mainDistance / 0.0028) * envelope;
    float3 atmosphere = mix(colorD, colorB, smoothstep(-0.7, 0.7, q.y)) * 0.018;
    float3 color = atmosphere + spectral * energy * 1.14;
    color = color + highlightColor * whiteCore * (0.18 + 0.1 * low);
    color = color / (float3(1.0) + color * 0.18);
    return finishEmission(color, p);
}

float3 over(float3 dst, float3 src, float a) {
    float k = clamp(a, 0.0, 1.0);
    return src * k + dst * (1.0 - k);
}

float refractionProfile(float t) {
    float depth = clamp(t, 0.0, 1.0);
    float circular = sqrt(max(1.0 - (1.0 - depth) * (1.0 - depth), 0.0));
    return 1.0 - circular;
}

float highlightLobe(float2 normal, float2 direction, float cut, float power) {
    float angular = clamp((dot(normal, direction) - cut) / max(1.0 - cut, 0.001), 0.0, 1.0);
    return pow(angular, power);
}

float2 contourWave(float angle, float t) {
    float wave = sin(angle * 3.0 + t * 0.62) * 0.52
        + sin(angle * 5.0 - t * 0.41 + 1.7) * 0.31
        + sin(angle * 2.0 + t * 0.23 + 3.1) * 0.17;
    float slope = cos(angle * 3.0 + t * 0.62) * 1.56
        + cos(angle * 5.0 - t * 0.41 + 1.7) * 1.55
        + cos(angle * 2.0 + t * 0.23 + 3.1) * 0.34;
    return float2(wave, slope);
}

float contourScale(float2 uv, float t, float amount) {
    if (amount <= 0.0) { return 1.0; }
    float2 contour = contourWave(atan(uv.y, uv.x), t);
    return 1.0 + clamp(amount, 0.0, 1.0) * CONTOUR_STRENGTH * contour.x;
}

float2 contourNormal(float2 uv, float rad, float t, float amount) {
    float dist = length(uv);
    if (dist <= 0.0001) { return float2(0.0); }
    float2 radial = uv / dist;
    float2 contour = contourWave(atan(uv.y, uv.x), t);
    float slope = clamp(amount, 0.0, 1.0) * CONTOUR_STRENGTH * contour.y;
    float2 tangent = float2(-radial.y, radial.x);
    return normalize(radial - tangent * (rad * slope / dist));
}

half4 main(float2 fragCoord) {
    float2 fc = float2(fragCoord.x, iResolution.y - fragCoord.y);
    float2 uv = (2.0 * fc - iResolution) / max(min(iResolution.x, iResolution.y), 1.0);

    float rad = max(radius, 0.05);
    float t = time * speed;
    float contourRad = rad * contourScale(uv, t, contourDeform);

    if (length(uv) > contourRad * (1.01 + edgeD(edgeSoftness))) {
        float3 halo = clamp(edgeGlowOf(float3(0.0), uv, contourRad, edgeSoftness, edgeGlow, glowColor), float3(0.0), float3(1.0));
        float haloAlpha = max(halo.r, max(halo.g, halo.b));
        return half4(half3(halo), half(haloAlpha));
    }

    float2 p = uv / contourRad;
    float pd = length(p);

    float clearFa = 1.0 - smoothstep(CLEAR_EA, CLEAR_EB, pd);
    float2 normal = contourNormal(uv, rad, t, contourDeform);
    float edgeDepth = max(1.0 - pd, 0.0);
    float refractionWidth = 0.015 + 0.95 * clamp(shellMidAlpha, 0.0, 1.0);
    float refractionT = edgeDepth / max(refractionWidth, 0.001);
    float profile = pow(refractionProfile(refractionT), 0.68);
    float refractionAmount = 1.6 * clamp(glassOpacity, 0.0, 1.0) * profile;
    float2 refractedP = p - normal * refractionAmount;
    float3 fcol = float3(0.0);
    if (clearFa > 0.0) {
        float channelSplit = 0.14 * clamp(gloss, 0.0, 2.0) * clamp(glassOpacity, 0.0, 1.0) * profile;
        float3 redSample = siriFluid(refractedP - normal * channelSplit, t);
        float3 greenSample = siriFluid(refractedP, t);
        float3 blueSample = siriFluid(refractedP + normal * channelSplit, t);
        fcol = float3(redSample.r, greenSample.g, blueSample.b);
    }

    float lum = dot(fcol, float3(0.213, 0.715, 0.072));
    float3 clearSat = clamp(float3(lum) + (fcol - float3(lum)) * 1.22, float3(0.0), float3(1.0));
    float3 col = over(canvasColor, clearSat, 0.99 * clearFa);

    float surfaceWidth = 0.026 + 0.055 * clamp(shellEdgeAlpha, 0.0, 1.0);
    float surfaceBand = (1.0 - smoothstep(0.0, surfaceWidth, edgeDepth)) * clearFa;
    float opticalRim = pow(surfaceBand, 1.8);
    col = over(col, shellInner, opticalRim * glassOpacity * 0.45);

    float2 coolDirection = normalize(float2(0.84, 0.54));
    float2 warmDirection = normalize(float2(-0.62, -0.78));
    float coolSplit = highlightLobe(normal, coolDirection, -0.32, 1.8);
    float warmSplit = highlightLobe(normal, warmDirection, -0.28, 2.0);
    float dispersion = opticalRim * clamp(gloss, 0.0, 2.0) * (0.8 + 0.8 * shellEdgeAlpha);
    col = over(col, shellMid, dispersion * coolSplit);
    col = over(col, shellEdge, dispersion * warmSplit);

    float edgeShadow = opticalRim * (0.015 + 0.15 * shellEdgeAlpha)
        * (0.15 + 0.85 * max(dot(normal, float2(0.45, -0.89)), 0.0));
    col = col * (1.0 - edgeShadow);

    float2 keyDirection = normalize(float2(-0.68, 0.73));
    float2 fillDirection = normalize(float2(0.74, -0.67));
    float key = opticalRim * highlightLobe(normal, keyDirection, 0.2, 2.8) * clamp(sheen, 0.0, 2.0) * 1.4;
    float fill = opticalRim * highlightLobe(normal, fillDirection, 0.4, 3.6) * clamp(sheen, 0.0, 2.0);
    col = over(col, sheenColor, key);
    col = over(col, specColor, fill);

    float ballA = 1.0 - smoothstep(0.99 - edgeD(edgeSoftness), 1.01 + edgeD(edgeSoftness), pd);
    col = clamp(col * max(exposure, 0.0), float3(0.0), float3(1.0)) * ballA;
    float3 edged = clamp(edgeGlowOf(col, uv, contourRad, edgeSoftness, edgeGlow, glowColor), float3(0.0), float3(1.0));
    float emissionAlpha = max(edged.r, max(edged.g, edged.b));
    float alpha = clamp(max(ballA, emissionAlpha), 0.0, 1.0);
    return half4(half3(edged), half(alpha));
}
`;
