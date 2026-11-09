import { createFileRoute } from "@tanstack/react-router";

import { Email } from "@/components/dashboard/settings/email";

export const Route = createFileRoute("/_account/app/settings/email")({ component: Email });
