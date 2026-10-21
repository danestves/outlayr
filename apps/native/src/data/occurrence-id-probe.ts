import { utcDateString } from "@outlayr/money/dates";

import { uuidV5 } from "@/domain/uuid5";

// Spawned with `TZ` forced: Jest caches the host zone on first `Date` use, so only a fresh process sees another. It
// re-derives instead of importing `recurrence-backfill`, which would pull drizzle and the db layer into bare node.
const OCCURRENCE_NAMESPACE = "0f2b9f1e-6d3a-4c58-9a71-2c8f5d6e4b31";

const [parentLocalId = "", isoHolding = ""] = process.argv.slice(2);
const holding = new Date(isoHolding);

process.stdout.write(uuidV5(`${parentLocalId}:${utcDateString(holding.getTime())}`, OCCURRENCE_NAMESPACE));
