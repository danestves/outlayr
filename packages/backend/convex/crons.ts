import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron("refresh open exchange rates", "5 * * * *", internal.openexchangerates.fetchRates, {});

crons.interval("refresh cotizave ves rates", { minutes: 72 }, internal.cotizave.fetchRates, {});

crons.interval("prune stale exchange rates", { hours: 24 }, internal.exchangeRates.pruneStale, {});

crons.interval("drop expired deletion jobs", { hours: 24 }, internal.accountDeletion.cleanupExpired, {});

export default crons;
