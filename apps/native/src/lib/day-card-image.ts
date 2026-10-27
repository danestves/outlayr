import { ImageFormat, Skia } from "@shopify/react-native-skia";
import type { SkCanvas } from "@shopify/react-native-skia";
import * as Effect from "effect/Effect";

import { layoutDayCard } from "@/domain/day-card";
import type { CardTone, DayCardInput } from "@/domain/day-card";
import { translateNow } from "@/i18n/runtime";

import { shareFile, TransferError, TransferFailedError } from "./data-transfer";
import { loadCardTypefaces } from "./day-card-fonts";
import type { CardTypefaces } from "./day-card-fonts";

/** Retina-density raster of a layout measured in points. */
const SCALE = 3;

/** Fixed light ink on paper: the card is viewed in Photos and Messages, where a dark export reads as a fault. */
const PAPER = "#FFFFFF";
const INK = "#17150F";
const MUTED = "#767676";

function paintFor(tone: CardTone) {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(tone === "ink" ? INK : MUTED));
    paint.setAntiAlias(true);
    return paint;
}

function draw(canvas: SkCanvas, input: DayCardInput, typefaces: CardTypefaces): void {
    const layout = layoutDayCard(input);

    const background = Skia.Paint();
    background.setColor(Skia.Color(PAPER));
    canvas.drawRect(Skia.XYWHRect(0, 0, layout.width, layout.height), background);

    const rulePaint = paintFor("muted");
    rulePaint.setAlphaf(0.35);
    for (const rule of layout.rules) {
        canvas.drawRect(Skia.XYWHRect(rule.x, rule.y, rule.width, rule.height), rulePaint);
    }

    for (const text of layout.texts) {
        const font = Skia.Font(typefaces[text.weight], text.size);
        const paint = paintFor(text.tone);
        const { width } = font.measureText(text.text);
        const x = text.align === "right" ? text.x - width : text.x;
        canvas.drawText(text.text, x, text.y, paint, font);
    }
}

function renderDayCard(input: DayCardInput, typefaces: CardTypefaces): Uint8Array | null {
    const layout = layoutDayCard(input);
    const surface = Skia.Surface.MakeOffscreen(Math.ceil(layout.width * SCALE), Math.ceil(layout.height * SCALE));
    if (surface == null) {
        return null;
    }

    const canvas = surface.getCanvas();
    canvas.scale(SCALE, SCALE);
    draw(canvas, input, typefaces);
    surface.flush();

    const encoded = surface.makeImageSnapshot().encodeToBytes(ImageFormat.PNG);
    return encoded.length > 0 ? encoded : null;
}

export const shareDayCard = Effect.fn("DayCardImage.share")(function* shareDayCard(
    input: DayCardInput,
    fileName: string
) {
    const typefaces = yield* loadCardTypefaces();
    const bytes = yield* Effect.try({
        catch: (cause) => new TransferFailedError({ cause, operation: "render" }),
        try: () => renderDayCard(input, typefaces),
    });
    if (bytes == null) {
        return yield* new TransferError({ key: "alerts.dayCard.undrawable" });
    }
    yield* shareFile(bytes, fileName, "image/png", translateNow("alerts.dayCard.shareTitle"));
});
