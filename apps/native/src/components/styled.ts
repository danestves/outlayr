import { Image as ExpoImage } from "expo-image";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { withUniwind } from "uniwind";

// `withUniwind` may run only once per component, so every wrapper lives here; RN and Reanimated components already
// take `className`. `GlassView` is absent on purpose: wrapped, it renders no glass at all.
export const Image = withUniwind(ExpoImage);
export const LinearGradient = withUniwind(ExpoLinearGradient);
