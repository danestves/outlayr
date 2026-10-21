import { AlphaType, ColorType, FilterMode, MipmapMode, Skia } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";

import { logoPlate } from "@/domain/logo-plate";
import type { LogoPixels, LogoPlate } from "@/domain/logo-plate";

const LOGO_SAMPLE = 128;
/** Small enough to blur away JPEG noise, large enough that two different logos never agree. */
const SIGNATURE_SIDE = 16;

export function decodeImage(bytes: Uint8Array): SkImage | null {
    return Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(bytes));
}

/** Read back as unpremultiplied RGBA. */
function samplePixels(image: SkImage, side: number, ground?: string): LogoPixels | null {
    const scale = side / Math.max(image.width(), image.height());
    const width = Math.max(1, Math.round(image.width() * scale));
    const height = Math.max(1, Math.round(image.height() * scale));
    const surface = Skia.Surface.MakeOffscreen(width, height);
    if (surface == null) {
        return null;
    }
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color(ground ?? "transparent"));
    canvas.drawImageRectOptions(
        image,
        Skia.XYWHRect(0, 0, image.width(), image.height()),
        Skia.XYWHRect(0, 0, width, height),
        FilterMode.Linear,
        MipmapMode.Linear
    );
    surface.flush();
    const data = surface
        .makeImageSnapshot()
        .readPixels(0, 0, { alphaType: AlphaType.Unpremul, colorType: ColorType.RGBA_8888, height, width });
    return data instanceof Uint8Array ? { data, height, width } : null;
}

export function platePlan(image: SkImage): LogoPlate {
    const pixels = samplePixels(image, LOGO_SAMPLE);
    return pixels == null ? { kind: "keep" } : logoPlate(pixels);
}

export function drawOnPlate(image: SkImage, maxSide: number): SkImage | null {
    const plan = platePlan(image);
    if (plan.kind === "keep") {
        return null;
    }
    const width = image.width();
    const height = image.height();
    const side = Math.min(maxSide, Math.max(width, height));
    const surface = Skia.Surface.MakeOffscreen(side, side);
    if (surface == null) {
        return null;
    }
    const { color, source, target } = plan;
    const canvas = surface.getCanvas();
    canvas.clear(Skia.Color(color));
    canvas.drawImageRectOptions(
        image,
        Skia.XYWHRect(source.x * width, source.y * height, source.width * width, source.height * height),
        Skia.XYWHRect(target.x * side, target.y * side, target.width * side, target.height * side),
        FilterMode.Linear,
        MipmapMode.Linear
    );
    surface.flush();
    return surface.makeImageSnapshot();
}

/** A logo stored before plates went into a JPEG, which dropped alpha: the same as drawing it over black. */
export function blackBakedSignature(image: SkImage): Uint8Array | null {
    return samplePixels(image, SIGNATURE_SIDE, "black")?.data ?? null;
}
