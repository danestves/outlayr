import * as Schema from "effect/Schema";

export class PendingPickError extends Schema.TaggedError<PendingPickError>()("PendingPickError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "The pending photo pick could not be read";
    }
}
