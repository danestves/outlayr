import { Files } from "files-sdk";
import { s3Fetch } from "files-sdk/s3-fetch";

import type { Provider } from "./provider";

export const bucketFor = (provider: Provider): Files | null => {
    if (provider.kind === "convex") {
        return null;
    }
    return new Files({
        adapter: s3Fetch({
            accessKeyId: provider.accessKeyId,
            bucket: provider.bucket,
            endpoint: provider.endpoint ?? `https://s3.${provider.region}.amazonaws.com`,
            forcePathStyle: provider.forcePathStyle,
            region: provider.region,
            secretAccessKey: provider.secretAccessKey,
        }),
    });
};
