import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { runEdge } from "./runEdge";
import { storageSetup } from "./storageSetup";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("storageSetup", () => {
    it("keeps files in Convex file storage when nothing is set", async () => {
        await expect(runEdge(storageSetup)).resolves.toStrictEqual({ kind: "convex" });
    });

    it("keeps the legacy R2_ENDPOINT deployment working", async () => {
        vi.stubEnv("R2_ACCESS_KEY_ID", "key");
        vi.stubEnv("R2_BUCKET", "outlayr-files");
        vi.stubEnv("R2_ENDPOINT", "https://account.r2.cloudflarestorage.com");
        vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");

        await expect(runEdge(storageSetup)).resolves.toStrictEqual({
            accessKeyId: "key",
            bucket: "outlayr-files",
            endpoint: "https://account.r2.cloudflarestorage.com",
            forcePathStyle: false,
            kind: "s3",
            region: "auto",
            secretAccessKey: "secret",
        });
    });

    it("builds the R2 endpoint from R2_ACCOUNT_ID", async () => {
        vi.stubEnv("R2_ACCESS_KEY_ID", "key");
        vi.stubEnv("R2_ACCOUNT_ID", "0123456789abcdef");
        vi.stubEnv("R2_BUCKET", "outlayr-files");
        vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");

        await expect(runEdge(storageSetup)).resolves.toMatchObject({
            endpoint: "https://0123456789abcdef.r2.cloudflarestorage.com",
            kind: "s3",
        });
    });

    it("stays unconfigured when R2 is only half set", async () => {
        vi.stubEnv("R2_BUCKET", "outlayr-files");

        await expect(runEdge(storageSetup)).resolves.toStrictEqual({ kind: "unconfigured", requested: "r2" });
    });

    it("lets an explicit s3 fall back to the AWS credentials and region", async () => {
        vi.stubEnv("STORAGE_PROVIDER", "s3");
        vi.stubEnv("S3_BUCKET", "outlayr-files");
        vi.stubEnv("AWS_ACCESS_KEY_ID", "aws-key");
        vi.stubEnv("AWS_SECRET_ACCESS_KEY", "aws-secret");

        await expect(runEdge(storageSetup)).resolves.toStrictEqual({
            accessKeyId: "aws-key",
            bucket: "outlayr-files",
            endpoint: undefined,
            forcePathStyle: false,
            kind: "s3",
            region: "us-east-1",
            secretAccessKey: "aws-secret",
        });
    });

    it("takes explicit convex over the bucket variables", async () => {
        vi.stubEnv("STORAGE_PROVIDER", "convex");
        vi.stubEnv("R2_ACCESS_KEY_ID", "key");
        vi.stubEnv("R2_BUCKET", "outlayr-files");
        vi.stubEnv("R2_ENDPOINT", "https://account.r2.cloudflarestorage.com");
        vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");

        await expect(runEdge(storageSetup)).resolves.toStrictEqual({ kind: "convex" });
    });
});
