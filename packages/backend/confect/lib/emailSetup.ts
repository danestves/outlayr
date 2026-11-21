import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

export const EmailProviderName = Schema.Literals(["log", "cloudflare", "resend", "smtp"]);
export type EmailProviderName = typeof EmailProviderName.Type;

type SendingProvider = Exclude<EmailProviderName, "log">;

interface SmtpAuth {
    readonly password: Redacted.Redacted;
    readonly username: string;
}

export type SendingSetup =
    | {
          readonly accountId: string;
          readonly from: string;
          readonly provider: "cloudflare";
          readonly token: Redacted.Redacted;
      }
    | { readonly apiKey: Redacted.Redacted; readonly from: string; readonly provider: "resend" }
    | {
          readonly auth: Option.Option<SmtpAuth>;
          readonly from: string;
          readonly host: string;
          readonly port: number;
          readonly provider: "smtp";
      };

export type EmailSetup =
    | SendingSetup
    | { readonly provider: "log" }
    | { readonly provider: "unconfigured"; readonly requested: SendingProvider };

export const REQUIRED_VARIABLES = {
    cloudflare: "CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_EMAIL_TOKEN and EMAIL_FROM",
    resend: "RESEND_API_KEY and EMAIL_FROM",
    smtp: "SMTP_HOST and EMAIL_FROM",
} satisfies Record<SendingProvider, string>;

const DEFAULT_SMTP_PORT = 587;

const setting = (name: string) =>
    Config.String(name).pipe(Config.option, Config.map(Option.filter((value) => value.trim() !== "")));

const secret = (name: string) =>
    Config.Redacted(name).pipe(Config.option, Config.map(Option.filter((value) => Redacted.value(value) !== "")));

const credentials = Config.all({
    cloudflare: Config.all({
        accountId: setting("CLOUDFLARE_ACCOUNT_ID"),
        token: secret("CLOUDFLARE_EMAIL_TOKEN"),
    }).pipe(Config.map(Option.all)),
    resend: Config.all({ apiKey: secret("RESEND_API_KEY") }).pipe(Config.map(Option.all)),
    smtp: Config.all({
        auth: Config.all({ password: secret("SMTP_PASSWORD"), username: setting("SMTP_USERNAME") }).pipe(
            Config.map(Option.all)
        ),
        host: setting("SMTP_HOST"),
        port: Config.Int("SMTP_PORT").pipe(Config.withDefault(DEFAULT_SMTP_PORT)),
    }).pipe(Config.map(({ host, ...rest }) => host.pipe(Option.map((value) => ({ ...rest, host: value }))))),
});

type Credentials = typeof credentials extends Config.Config<infer A> ? A : never;

const SENDING_ORDER = ["cloudflare", "resend", "smtp"] as const satisfies readonly SendingProvider[];

const sendingSetups = (found: Credentials, from: string): Record<SendingProvider, Option.Option<SendingSetup>> => ({
    cloudflare: found.cloudflare.pipe(Option.map((value) => ({ ...value, from, provider: "cloudflare" as const }))),
    resend: found.resend.pipe(Option.map((value) => ({ ...value, from, provider: "resend" as const }))),
    smtp: found.smtp.pipe(Option.map((value) => ({ ...value, from, provider: "smtp" as const }))),
});

function sendingSetup(requested: SendingProvider, found: Credentials, from: Option.Option<string>): EmailSetup {
    return from.pipe(
        Option.flatMap((address) => sendingSetups(found, address)[requested]),
        Option.getOrElse((): EmailSetup => ({ provider: "unconfigured", requested }))
    );
}

export const emailSetup: Config.Config<EmailSetup> = Config.all({
    found: credentials,
    from: setting("EMAIL_FROM"),
    requested: Config.schema(EmailProviderName, "EMAIL_PROVIDER").pipe(Config.option),
}).pipe(
    Config.map(({ found, from, requested }): EmailSetup => {
        if (Option.isSome(requested)) {
            return requested.value === "log" ? { provider: "log" } : sendingSetup(requested.value, found, from);
        }
        const detected = SENDING_ORDER.find((provider) => Option.isSome<unknown>(found[provider]));
        return detected === undefined ? { provider: "log" } : sendingSetup(detected, found, from);
    })
);
