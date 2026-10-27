import * as Schema from "effect/Schema";

export class CloudError extends Schema.TaggedError<CloudError>()("CloudError", {
    cause: Schema.Defect(),
    kind: Schema.Literals(["query", "mutation", "action", "download", "upload"]),
    path: Schema.String,
}) {
    override get message(): string {
        return `Cloud ${this.kind} ${this.path} failed`;
    }
}
