import { Replica } from "../replica";
import type { SlotProps } from "./placeholder";

export function NewEntryCard({ theme = "light" }: SlotProps) {
    return <Replica>{({ SentenceCard }, locale) => <SentenceCard fit locale={locale} theme={theme} />}</Replica>;
}
