import { api } from "@outlayr/backend/convex/_generated/api";
import { createServerFn } from "@tanstack/react-start";
import { ConvexHttpClient } from "convex/browser";

import { ENV } from "@/env";

export const getSharedReport = createServerFn({ method: "GET" })
    .validator((slug: string) => slug)
    .handler(async ({ data: slug }) => {
        const url = ENV.VITE_CONVEX_URL;
        return url ? await new ConvexHttpClient(url).query(api.sharedReports.view, { slug }) : null;
    });
