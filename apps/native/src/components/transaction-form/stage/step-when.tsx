import { addDays, startOfDay } from "@outlayr/money/calendar";

import { formatChargeDate, formatSentenceDate, formatWeekdayDay } from "@/domain/dates";
import { useLanguage, useTranslation } from "@/i18n/context";

import { StageOptionRow } from "./stage-options";
import type { StageOptionItem } from "./stage-options";

type WhenOptionId = "chosen" | "pick" | `day-${number}`;

const DAYS_OFFERED = 7;

const NAMED_DAYS = ["transaction.sentence.when.today", "transaction.sentence.when.yesterday"] as const;

/** Naming a day keeps the clock time the entry already carries. */
function atSameTime(day: Date, source: Date): Date {
    const next = startOfDay(day);
    next.setHours(source.getHours(), source.getMinutes(), source.getSeconds(), source.getMilliseconds());
    return next;
}

interface StepWhenProps {
    date: Date;
    /** Names today; the host already holds a clock, and a test pins it. */
    now: Date;
    /** Opens the host's date picker; the stage has no calendar of its own. */
    onPick: () => void;
    onSelect: (date: Date) => void;
    /**
     * Defaults to the form's "Date" field label; a host with a better key passes it here
     * rather than this file minting copy.
     */
    pickLabel?: string;
}

export function StepWhen({ date, now, onPick, onSelect, pickLabel }: StepWhenProps) {
    const t = useTranslation();
    const { language } = useLanguage();

    const today = startOfDay(now);
    const chosen = startOfDay(date).getTime();

    const days = Array.from({ length: DAYS_OFFERED }, (_, back) => {
        const day = addDays(today, -back);
        const named = NAMED_DAYS[back];
        return {
            accessibilityLabel: named ? undefined : formatChargeDate(day, now, language),
            day,
            id: `day-${back}` as const,
            label: named ? t(named) : formatWeekdayDay(day, language),
        };
    });
    const chosenDay = days.find(({ day }) => day.getTime() === chosen);

    const options: StageOptionItem<WhenOptionId>[] = [...days];
    if (!chosenDay) {
        options.push({ id: "chosen", label: formatSentenceDate(date, language) });
    }
    options.push({ id: "pick", label: pickLabel ?? t("transaction.field.date") });

    const pick = (id: WhenOptionId) => {
        const picked = days.find((option) => option.id === id);
        if (picked) {
            onSelect(atSameTime(picked.day, date));
            return;
        }
        onPick();
    };

    return <StageOptionRow onSelect={pick} options={options} selectedId={chosenDay?.id ?? "chosen"} />;
}
