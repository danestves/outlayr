import { Animation } from "@expo/ui/swift-ui/modifiers";

export const FORM_BLUR_RADIUS = 8;
// MUST track `LAUNCH_SPRING`/`RETURN_SPRING` in the fly-up context: the hero is Reanimated and this blur SwiftUI,
// and only this pairing keeps them on one curve.
export const FLY_UP = Animation.spring({
    dampingFraction: 0.85,
    response: 0.4,
});
export const FLY_BACK = Animation.spring({
    dampingFraction: 0.98,
    response: 0.29,
});

// `UINavigationBar` in this form sheet reports y=16 (react-native-screens' grabber band) and a height of 54.
export const HEADER_HEIGHT = 70;
// 24pt under the bar, less the 6pt the hero's ring adds above its tile.
export const HERO_TOP_PADDING = 18;
// 28pt, less the 6pt the ring adds under the tile.
export const HERO_BOTTOM_PADDING = 22;
export const FORM_TOP_MARGIN = 8;

export const CAPTION_CLEARANCE = 24;
export const CTA_BOTTOM_PADDING = 8;
/** What `.controlSize(.large)` on a bordered-prominent button measures. */
export const CTA_HEIGHT = 50;
