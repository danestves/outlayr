import { View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useSetting } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useLoggedDaysOfMonth } from "@/data/ledger-stats";
import { monthLongTitle, weekdayInitial } from "@/domain/dates";
import { useLanguage } from "@/i18n/context";

import { monthGrid } from "./month-grid";

function DayCell({ day, logged, today }: { day: number | null; logged: boolean; today: number }) {
    if (day === null) {
        return <View className="h-9 flex-1" />;
    }
    const isToday = day === today;
    const ahead = day > today;
    return (
        <View
            className={cn(
                "h-9 flex-1 items-center justify-center rounded-[10px]",
                isToday && "bg-accent",
                ahead && "bg-pro-wash"
            )}
        >
            <Text
                className={cn(
                    "text-callout tabular-nums",
                    isToday && "text-accent-foreground font-sans-semibold",
                    ahead && "text-pro-wash-foreground",
                    !isToday && !ahead && "text-muted"
                )}
            >
                {String(day)}
            </Text>
            {logged && !ahead ? (
                <View className={cn("absolute bottom-1 size-1 rounded-full", isToday ? "bg-pro" : "bg-income")} />
            ) : null}
        </View>
    );
}

export function MonthAhead({ label, now }: { label: string; now: number }) {
    const { language } = useLanguage();
    const logged = useLoggedDaysOfMonth(useDatabase(), now);
    const today = new Date(now);
    const { weeks, weekdays } = monthGrid(today, useSetting("firstWeekday"));
    const month = monthLongTitle(today, language);

    return (
        <View accessibilityLabel={`${month}. ${label}`} accessible className="pt-4">
            <View className="border-foreground flex-row items-center justify-between border-b pb-2">
                <MonoLabel className="text-foreground">{month}</MonoLabel>
                <MonoLabel>{label}</MonoLabel>
            </View>
            <View className="flex-row gap-1.5 pt-2.5 pb-1">
                {weekdays.map((weekday) => (
                    <MonoLabel className="flex-1 text-center" key={weekday.getDay()}>
                        {weekdayInitial(weekday, language)}
                    </MonoLabel>
                ))}
            </View>
            <View className="gap-1.5">
                {weeks.map((week) => (
                    <View className="flex-row gap-1.5" key={week[0]?.key}>
                        {week.map((cell) => (
                            <DayCell
                                day={cell.day}
                                key={cell.key}
                                logged={cell.day !== null && logged.has(cell.day)}
                                today={today.getDate()}
                            />
                        ))}
                    </View>
                ))}
            </View>
        </View>
    );
}
