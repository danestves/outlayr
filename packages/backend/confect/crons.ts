import { CronJob, CronJobs } from "@confect/server";
import * as Cron from "effect/Cron";
import * as Duration from "effect/Duration";

import refs from "./_generated/refs";

export default CronJobs.make()
    .add(
        CronJob.make(
            "refresh open exchange rates",
            Cron.parseUnsafe("5 * * * *"),
            refs.internal.openexchangerates.fetchRates
        )
    )
    .add(CronJob.make("refresh cotizave ves rates", Duration.minutes(72), refs.internal.cotizave.fetchRates))
    .add(CronJob.make("prune stale exchange rates", Duration.hours(24), refs.internal.exchangeRates.pruneStale, {}))
    .add(CronJob.make("drop expired deletion jobs", Duration.hours(24), refs.internal.accountDeletion.cleanupExpired));
