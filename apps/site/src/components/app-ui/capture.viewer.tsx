import type { CanvasProps } from "./canvas";
import { VoiceScreen } from "./voice";
import type { VoicePhase } from "./voice";

const voice = (phase: VoicePhase) =>
    function VoiceStill(canvas: CanvasProps) {
        return <VoiceScreen {...canvas} phase={phase} />;
    };

export const screens = {
    "voice-corrected": voice("corrected"),
    "voice-listening": voice("listening"),
    "voice-ready": voice("ready"),
    "voice-result": voice("result"),
    "voice-sending": voice("sending"),
    "voice-starting": voice("starting"),
    "voice-thinking": voice("thinking"),
};
