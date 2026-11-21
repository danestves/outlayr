import type { Provider } from "@outlayr/storage/provider";
import * as Config from "effect/Config";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

export const StorageProviderName = Schema.Literals(["convex", "r2", "s3"]);
export type StorageProviderName = typeof StorageProviderName.Type;

type BucketProvider = Exclude<StorageProviderName, "convex">;

export type StorageSetup = Provider | { readonly kind: "unconfigured"; readonly requested: BucketProvider };

const R2_REGION = "auto";
const S3_DEFAULT_REGION = "us-east-1";
const R2_DOMAIN = "r2.cloudflarestorage.com";

const setting = (name: string) =>
    Config.String(name).pipe(Config.option, Config.map(Option.filter((value) => value.trim() !== "")));

const secret = (name: string) =>
    Config.Redacted(name).pipe(Config.option, Config.map(Option.filter((value) => Redacted.value(value) !== "")));

const credentials = Config.all({
    r2: Config.all({
        accountId: setting("R2_ACCOUNT_ID"),
        accessKeyId: secret("R2_ACCESS_KEY_ID"),
        bucket: setting("R2_BUCKET"),
        endpoint: setting("R2_ENDPOINT"),
        secretAccessKey: secret("R2_SECRET_ACCESS_KEY"),
    }),
    s3: Config.all({
        accessKeyId: secret("S3_ACCESS_KEY_ID"),
        awsAccessKeyId: secret("AWS_ACCESS_KEY_ID"),
        awsRegion: setting("AWS_REGION"),
        awsSecretAccessKey: secret("AWS_SECRET_ACCESS_KEY"),
        bucket: setting("S3_BUCKET"),
        endpoint: setting("S3_ENDPOINT"),
        forcePathStyle: setting("S3_FORCE_PATH_STYLE"),
        region: setting("S3_REGION"),
        secretAccessKey: secret("S3_SECRET_ACCESS_KEY"),
    }),
});

type Credentials = typeof credentials extends Config.Config<infer A> ? A : never;

const anySet = (...values: readonly Option.Option<unknown>[]): boolean => values.some((value) => Option.isSome(value));

const r2Endpoint = (endpoint: Option.Option<string>, accountId: Option.Option<string>): Option.Option<string> =>
    Option.firstSomeOf([endpoint, accountId.pipe(Option.map((id) => `https://${id}.${R2_DOMAIN}`))]);

function r2Setup(found: Credentials["r2"]): Option.Option<Provider> {
    return Option.all({
        accessKeyId: found.accessKeyId,
        bucket: found.bucket,
        endpoint: r2Endpoint(found.endpoint, found.accountId),
        secretAccessKey: found.secretAccessKey,
    }).pipe(
        Option.map(({ accessKeyId, bucket, endpoint, secretAccessKey }): Provider => ({
            accessKeyId: Redacted.value(accessKeyId),
            bucket,
            endpoint,
            forcePathStyle: false,
            kind: "s3",
            region: R2_REGION,
            secretAccessKey: Redacted.value(secretAccessKey),
        }))
    );
}

function s3Setup(found: Credentials["s3"]): Option.Option<Provider> {
    return Option.all({
        accessKeyId: Option.firstSomeOf([found.accessKeyId, found.awsAccessKeyId]),
        bucket: found.bucket,
        secretAccessKey: Option.firstSomeOf([found.secretAccessKey, found.awsSecretAccessKey]),
    }).pipe(
        Option.map(({ accessKeyId, bucket, secretAccessKey }): Provider => ({
            accessKeyId: Redacted.value(accessKeyId),
            bucket,
            endpoint: Option.getOrUndefined(found.endpoint),
            forcePathStyle: Option.match(found.forcePathStyle, {
                onNone: () => false,
                onSome: (value) => value.trim().toLowerCase() === "true",
            }),
            kind: "s3",
            region: Option.getOrElse(Option.firstSomeOf([found.region, found.awsRegion]), () => S3_DEFAULT_REGION),
            secretAccessKey: Redacted.value(secretAccessKey),
        }))
    );
}

function unconfigured(requested: BucketProvider): StorageSetup {
    return { kind: "unconfigured", requested };
}

// Read per call, so a deployment that gains its bucket variables uses them on the next call, not the next cold start.
export const storageSetup: Config.Config<StorageSetup> = Config.all({
    found: credentials,
    requested: Config.schema(StorageProviderName, "STORAGE_PROVIDER").pipe(Config.option),
}).pipe(
    Config.map(({ found, requested }): StorageSetup => {
        const setups: Record<BucketProvider, Option.Option<Provider>> = {
            r2: r2Setup(found.r2),
            s3: s3Setup(found.s3),
        };
        const touched: Record<BucketProvider, boolean> = {
            r2: anySet(
                found.r2.accountId,
                found.r2.accessKeyId,
                found.r2.bucket,
                found.r2.endpoint,
                found.r2.secretAccessKey
            ),
            // AWS_* alone must not select s3: the shared variables are a credential fallback, not a provider signal.
            s3: anySet(
                found.s3.bucket,
                found.s3.endpoint,
                found.s3.forcePathStyle,
                found.s3.region,
                found.s3.accessKeyId,
                found.s3.secretAccessKey
            ),
        };
        if (Option.isSome(requested)) {
            const provider = requested.value;
            return provider === "convex"
                ? { kind: "convex" }
                : Option.getOrElse(setups[provider], () => unconfigured(provider));
        }
        const detected = (["r2", "s3"] as const).find((provider) => touched[provider]);
        return detected === undefined
            ? { kind: "convex" }
            : Option.getOrElse(setups[detected], () => unconfigured(detected));
    })
);

// Reads and deletes still run when the bucket is half set; only minting a new upload url refuses.
export const componentProvider = (setup: StorageSetup): Provider =>
    setup.kind === "unconfigured" ? { kind: "convex" } : setup;
