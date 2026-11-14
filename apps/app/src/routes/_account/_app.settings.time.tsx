import { createFileRoute } from "@tanstack/react-router";

import { Time } from "@/components/dashboard/settings/time";

export const Route = createFileRoute("/_account/_app/settings/time")({ component: Time });
