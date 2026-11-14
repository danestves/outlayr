import CalendarRemove01Icon from "@hugeicons/core-free-icons/CalendarRemove01Icon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PauseIcon from "@hugeicons/core-free-icons/PauseIcon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import PlayIcon from "@hugeicons/core-free-icons/PlayIcon";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { useIntlayer } from "react-intlayer";

import type { Candidate, Charge, Schedule } from "@/lib/recurring";

import { Glyph } from "../accounts/glyph";

export interface ScheduleActions {
    confirm: (candidate: Candidate) => void;
    dismiss: (candidate: Candidate) => void;
    edit: (schedule: Schedule) => void;
    log: (schedule: Schedule, charge: Charge) => void;
    logAgain: (schedule: Schedule) => void;
    open: (schedule: Schedule) => void;
    pause: (schedule: Schedule) => void;
    remove: (schedule: Schedule) => void;
    restart: (schedule: Schedule) => void;
    resume: (schedule: Schedule) => void;
    stop: (schedule: Schedule) => void;
}

export function ScheduleMenu({ actions, schedule }: { actions: ScheduleActions; schedule: Schedule }) {
    const copy = useIntlayer("dashboard-recurring").actions;
    const { state } = schedule;
    return (
        <Menu>
            <Menu.Trigger
                aria-label={copy.more({ name: schedule.name }).value}
                onClick={(event) => event.stopPropagation()}
                render={<Button className="text-muted-foreground" size="icon-sm" variant="ghost" />}
            >
                <Glyph icon={MoreVerticalIcon} size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" alignOffset={-4} className="app-shell ph-no-capture w-[220px]" sideOffset={4}>
                {state === "stopped" ? null : (
                    <Menu.Item onClick={() => actions.edit(schedule)}>
                        <Glyph icon={PencilEdit01Icon} size={16} />
                        {copy.edit}
                    </Menu.Item>
                )}
                {state === "active" ? (
                    <Menu.Item onClick={() => actions.pause(schedule)}>
                        <Glyph icon={PauseIcon} size={16} />
                        {copy.pause}
                    </Menu.Item>
                ) : null}
                {state === "paused" ? (
                    <Menu.Item onClick={() => actions.resume(schedule)}>
                        <Glyph icon={PlayIcon} size={16} />
                        {copy.resume}
                    </Menu.Item>
                ) : null}
                {state === "stopped" ? (
                    <Menu.Item onClick={() => actions.restart(schedule)}>
                        <Glyph icon={PlayIcon} size={16} />
                        {copy.restart}
                    </Menu.Item>
                ) : null}
                <Menu.Item onClick={() => actions.logAgain(schedule)}>
                    <Glyph icon={Copy01Icon} size={16} />
                    {copy.logAgain}
                </Menu.Item>
                {state === "active" ? (
                    <Menu.Item onClick={() => actions.stop(schedule)}>
                        <Glyph icon={CalendarRemove01Icon} size={16} />
                        {copy.stop}
                    </Menu.Item>
                ) : null}
                <Menu.Separator />
                <Menu.Item onClick={() => actions.remove(schedule)} variant="destructive">
                    <Glyph icon={Delete02Icon} size={16} />
                    {copy.delete}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}
