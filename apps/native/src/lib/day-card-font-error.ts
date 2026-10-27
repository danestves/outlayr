import * as Schema from "effect/Schema";

export class DayCardFontError extends Schema.TaggedError<DayCardFontError>()("DayCardFontError", {
    cause: Schema.optional(Schema.Defect()),
    reason: Schema.Literals(["noFace", "notLoaded"]),
    weight: Schema.optional(Schema.Literals(["medium", "mono", "regular", "semibold"])),
}) {
    override get message(): string {
        return this.reason === "noFace"
            ? `No system face draws the day card's ${this.weight} text`
            : "A day card font file did not load";
    }
}
