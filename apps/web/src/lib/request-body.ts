import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export class RequestBodyError extends Schema.TaggedError<RequestBodyError>()("RequestBodyError", {
    cause: Schema.Defect(),
    method: Schema.String,
}) {
    override get message(): string {
        return `The ${this.method} request body is not valid JSON.`;
    }
}

export const readJsonBody = Effect.fn("Request.readJsonBody")((request: Request) =>
    Effect.tryPromise({
        catch: (cause) => new RequestBodyError({ cause, method: request.method }),
        try: (): Promise<Schema.Json> => request.json(),
    })
);
