import * as Schema from "effect/Schema";

export class FilePreviewError extends Schema.TaggedError<FilePreviewError>()("FilePreviewError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "The attachment could not be opened";
    }
}
