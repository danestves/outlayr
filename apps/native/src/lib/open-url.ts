import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { Linking } from "react-native";

export class OpenUrlError extends Schema.TaggedError<OpenUrlError>()("OpenUrlError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "No app could open the link";
    }
}

export const openUrl = (url: string) =>
    Effect.tryPromise({ catch: (cause) => new OpenUrlError({ cause }), try: () => Linking.openURL(url) });
