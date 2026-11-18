import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function TodayCard({ theme = "light" }: SlotProps) {
    return <Replica>{({ TodayCard: Today }, locale) => <Today fit locale={locale} theme={theme} />}</Replica>;
}
