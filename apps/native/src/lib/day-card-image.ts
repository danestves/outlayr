import { ImageFormat, Skia } from "@shopify/react-native-skia";
import type { SkCanvas } from "@shopify/react-native-skia";
import * as Effect from "effect/Effect";

import { CARD_INK, CARD_MUTED, CARD_PAPER, layoutDayCard } from "@/domain/day-card";
import type { CardTone, DayCardInput, DayCardLayout } from "@/domain/day-card";
import { translateNow } from "@/i18n/runtime";

import { shareFile, TransferError, TransferFailedError } from "./data-transfer";
import { loadCardTypefaces } from "./day-card-fonts";
import type { CardTypefaces } from "./day-card-fonts";

/** Retina-density raster of a layout measured in points. */
const SCALE = 3;

function paintFor(tone: CardTone) {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color(tone === "ink" ? CARD_INK : CARD_MUTED));
    paint.setAntiAlias(true);
    return paint;
}

function draw(canvas: SkCanvas, layout: DayCardLayout, typefaces: CardTypefaces): void {
    const background = Skia.Paint();
    background.setColor(Skia.Color(CARD_PAPER));
    canvas.drawRect(Skia.XYWHRect(0, 0, layout.width, layout.height), background);

    const rulePaint = paintFor("muted");
    rulePaint.setAlphaf(0.35);
    for (const rule of layout.rules) {
        canvas.drawRect(Skia.XYWHRect(rule.x, rule.y, rule.width, rule.height), rulePaint);
    }

    const trackPaint = paintFor("muted");
    trackPaint.setAlphaf(0.2);
    for (const bar of layout.bars ?? []) {
        canvas.drawRRect(
            Skia.RRectXY(Skia.XYWHRect(bar.x, bar.y, bar.width, bar.height), bar.height / 2, bar.height / 2),
            trackPaint
        );
        const fill = Skia.Paint();
        fill.setColor(Skia.Color(bar.color));
        fill.setAntiAlias(true);
        canvas.drawRRect(
            Skia.RRectXY(
                Skia.XYWHRect(bar.x, bar.y, Math.max(bar.height, bar.width * bar.fraction), bar.height),
                bar.height / 2,
                bar.height / 2
            ),
            fill
        );
    }

    for (const text of layout.texts) {
        const font = Skia.Font(typefaces[text.weight], text.size);
        const paint = paintFor(text.tone);
        const { width } = font.measureText(text.text);
        const x = text.align === "right" ? text.x - width : text.x;
        canvas.drawText(text.text, x, text.y, paint, font);
    }
}

function renderCard(layout: DayCardLayout, typefaces: CardTypefaces): Uint8Array | null {
    const surface = Skia.Surface.MakeOffscreen(Math.ceil(layout.width * SCALE), Math.ceil(layout.height * SCALE));
    if (surface == null) {
        return null;
    }

    const canvas = surface.getCanvas();
    canvas.scale(SCALE, SCALE);
    draw(canvas, layout, typefaces);
    surface.flush();

    const encoded = surface.makeImageSnapshot().encodeToBytes(ImageFormat.PNG);
    return encoded.length > 0 ? encoded : null;
}

export const shareCard = Effect.fn("DayCardImage.share")(function* shareCard(
    layout: DayCardLayout,
    fileName: string,
    dialogTitle: string
) {
    const typefaces = yield* loadCardTypefaces();
    const bytes = yield* Effect.try({
        catch: (cause) => new TransferFailedError({ cause, operation: "render" }),
        try: () => renderCard(layout, typefaces),
    });
    if (bytes == null) {
        return yield* new TransferError({ key: "alerts.dayCard.undrawable" });
    }
    yield* shareFile(bytes, fileName, "image/png", dialogTitle);
});

export const shareDayCard = (input: DayCardInput, fileName: string) =>
    shareCard(layoutDayCard(input), fileName, translateNow("alerts.dayCard.shareTitle"));
