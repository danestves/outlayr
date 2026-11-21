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
    smtp: "SMTP_HOST and EMAIL_FROM; SMTP_PORT must be valid and SMTP_USERNAME with SMTP_PASSWORD, both or neither",
} satisfies Record<SendingProvider, string>;

const DEFAULT_SMTP_PORT = 587;
const MIN_SMTP_PORT = 1;
const MAX_SMTP_PORT = 65_535;

const setting = (name: string) =>
    Config.String(name).pipe(Config.option, Config.map(Option.filter((value) => value.trim() !== "")));

const secret = (name: string) =>
    Config.Redacted(name).pipe(Config.option, Config.map(Option.filter((value) => Redacted.value(value) !== "")));

const credentials = Config.all({
    cloudflare: Config.all({
        accountId: setting("CLOUDFLARE_ACCOUNT_ID"),
        token: secret("CLOUDFLARE_EMAIL_TOKEN"),
    }),
    resend: Config.all({ apiKey: secret("RESEND_API_KEY") }),
    smtp: Config.all({
        host: setting("SMTP_HOST"),
        password: secret("SMTP_PASSWORD"),
        port: setting("SMTP_PORT"),
        username: setting("SMTP_USERNAME"),
    }),
});

type Credentials = typeof credentials extends Config.Config<infer A> ? A : never;

const SENDING_ORDER = ["cloudflare", "resend", "smtp"] as const satisfies readonly SendingProvider[];

const anySet = (...values: readonly Option.Option<unknown>[]): boolean => values.some((value) => Option.isSome(value));

const smtpPort = (value: Option.Option<string>): Option.Option<number> => {
    if (Option.isNone(value)) {
        return Option.some(DEFAULT_SMTP_PORT);
    }
    const port = Number(value.value);
    return Number.isInteger(port) && port >= MIN_SMTP_PORT && port <= MAX_SMTP_PORT ? Option.some(port) : Option.none();
};

const smtpAuth = (
    username: Option.Option<string>,
    password: Option.Option<Redacted.Redacted>
): Option.Option<Option.Option<SmtpAuth>> => {
    if (Option.isSome(username) && Option.isSome(password)) {
        return Option.some(Option.some({ password: password.value, username: username.value }));
    }
    return Option.isNone(username) && Option.isNone(password) ? Option.some(Option.none()) : Option.none();
};

function cloudflareSetup(found: Credentials["cloudflare"], from: Option.Option<string>): Option.Option<SendingSetup> {
    return Option.all({ accountId: found.accountId, token: found.token }).pipe(
        Option.flatMap(({ accountId, token }) =>
            from.pipe(
                Option.map((address): SendingSetup => ({ accountId, from: address, provider: "cloudflare", token }))
            )
        )
    );
}

function resendSetup(found: Credentials["resend"], from: Option.Option<string>): Option.Option<SendingSetup> {
    return found.apiKey.pipe(
        Option.flatMap((apiKey) =>
            from.pipe(Option.map((address): SendingSetup => ({ apiKey, from: address, provider: "resend" })))
        )
    );
}

function smtpSetup(found: Credentials["smtp"], from: Option.Option<string>): Option.Option<SendingSetup> {
    return Option.all({
        auth: smtpAuth(found.username, found.password),
        host: found.host,
        port: smtpPort(found.port),
    }).pipe(
        Option.flatMap(({ auth, host, port }) =>
            from.pipe(Option.map((address): SendingSetup => ({ auth, from: address, host, port, provider: "smtp" })))
        )
    );
}

function unconfigured(requested: SendingProvider): EmailSetup {
    return { provider: "unconfigured", requested };
}

export const emailSetup: Config.Config<EmailSetup> = Config.all({
    found: credentials,
    from: setting("EMAIL_FROM"),
    requested: Config.schema(EmailProviderName, "EMAIL_PROVIDER").pipe(Config.option),
}).pipe(
    Config.map(({ found, from, requested }): EmailSetup => {
        const setups: Record<SendingProvider, Option.Option<SendingSetup>> = {
            cloudflare: cloudflareSetup(found.cloudflare, from),
            resend: resendSetup(found.resend, from),
            smtp: smtpSetup(found.smtp, from),
        };
        const touched: Record<SendingProvider, boolean> = {
            cloudflare: anySet(found.cloudflare.accountId, found.cloudflare.token),
            resend: anySet(found.resend.apiKey),
            smtp: anySet(found.smtp.host, found.smtp.password, found.smtp.port, found.smtp.username),
        };
        if (Option.isSome(requested)) {
            const provider = requested.value;
            return provider === "log"
                ? { provider: "log" }
                : Option.getOrElse(setups[provider], () => unconfigured(provider));
        }
        const detected = SENDING_ORDER.find((provider) => touched[provider]);
        return detected === undefined
            ? { provider: "log" }
            : Option.getOrElse(setups[detected], () => unconfigured(detected));
    })
);
