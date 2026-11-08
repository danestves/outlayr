import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { addDays } from "@/lib/ledger";

import { useDateFormat } from "../home/format";

const YEAR = 4;

/** "Today · Sun, Nov 8", "Yesterday · Sat, Nov 7", "Fri, Nov 6", with the year once it isn't this one. */
export function useDayTitle() {
    const { ledger } = useDashboard();
    const { today, yesterday } = useIntlayer("dashboard-transactions");
    const date = useDateFormat();
    const before = addDays(ledger.today, -1);
    return (day: string) => {
        const weekday = date.weekday(day);
        if (day === ledger.today) {
            return `${today.value} · ${weekday}`;
        }
        if (day === before) {
            return `${yesterday.value} · ${weekday}`;
        }
        return day.slice(0, YEAR) === ledger.today.slice(0, YEAR) ? weekday : `${weekday} ${day.slice(0, YEAR)}`;
    };
}
