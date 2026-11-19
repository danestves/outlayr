import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { demoCast } from "@/components/app-ui/cast";

export const getDemoCast = createServerFn({ method: "GET" }).handler(() =>
    demoCast(getRequestHeader("cf-ipcountry") ?? null)
);
