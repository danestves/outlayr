import type { CanvasProps } from "./canvas";
import { ScanScreen } from "./scan";
import type { ScanStep } from "./scan";
import { VoiceScreen } from "./voice";
import type { VoicePhase } from "./voice";

const voice = (phase: VoicePhase) =>
    function VoiceStill(canvas: CanvasProps) {
        return <VoiceScreen {...canvas} phase={phase} />;
    };

const scan = (step: ScanStep) =>
    function ScanStill(canvas: CanvasProps) {
        return <ScanScreen {...canvas} step={step} />;
    };

export const screens = {
    "scan-intro": scan("intro"),
    "scan-reading": scan("reading"),
    "scan-review": scan("review"),
    "voice-corrected": voice("corrected"),
    "voice-listening": voice("listening"),
    "voice-ready": voice("ready"),
    "voice-result": voice("result"),
    "voice-sending": voice("sending"),
    "voice-starting": voice("starting"),
    "voice-thinking": voice("thinking"),
};
