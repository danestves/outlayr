import * as Console from "effect/Console";
import * as Effect from "effect/Effect";

import refs from "../_generated/refs";
import { MutationRunner } from "../_generated/services";
import type { Notice } from "../tables/outboundEmails";
import { EmailError } from "./email";
import type { Email } from "./email";
import { emailSetup } from "./emailSetup";

export const sendEmail = Effect.fn("Email.send")(function* sendEmail(
    to: string,
    email: Email,
    notice?: typeof Notice.Type
) {
    const setup = yield* emailSetup;
    if (setup.provider === "log") {
        yield* Console.log(`[mail] to ${to}: ${email.subject}\n\n${email.text}`);
        return true;
    }
    if (setup.provider === "unconfigured") {
        return yield* new EmailError({ provider: setup.requested, reason: "unconfigured" });
    }
    const { runMutation } = yield* MutationRunner;
    return yield* runMutation(refs.internal.emailOutbox.enqueue, { ...email, notice, to }).pipe(Effect.orDie);
});
