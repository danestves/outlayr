import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Label } from "panelui-web/label";
import { Switch } from "panelui-web/switch";
import { Tabs } from "panelui-web/tabs";
import { useToast } from "panelui-web/toast";
import { useId } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { writeSettings } from "@/lib/ledger-settings";

export function SectionHead({ action, title }: { action?: ReactNode; title: ReactNode }) {
    const { title: settings } = useIntlayer("dashboard-settings");
    return (
        <div className="flex min-h-16 items-center gap-2 max-lg:min-h-12">
            <Button
                aria-label={settings.value}
                className="-ml-2.5 lg:hidden"
                render={<Link to="/app/settings" />}
                size="icon"
                variant="ghost"
            >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={22} />
            </Button>
            <h1 className="mr-auto shrink-0 text-lg font-semibold tracking-[-0.02em]">{title}</h1>
            {action}
        </div>
    );
}

export function SettingsCard({
    action,
    children,
    footer,
    title,
}: {
    action?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    title: ReactNode;
}) {
    return (
        <Frame className="min-w-0">
            <Frame.Header>
                <Frame.Title as="h2">{title}</Frame.Title>
                {action ? <Frame.Action>{action}</Frame.Action> : null}
            </Frame.Header>
            <Frame.Panel>{children}</Frame.Panel>
            {footer ? <Frame.Footer className="text-sm">{footer}</Frame.Footer> : null}
        </Frame>
    );
}

export function Row({
    children,
    hint,
    label,
    labelFor,
    leading,
}: {
    children?: ReactNode;
    hint?: ReactNode;
    label: ReactNode;
    leading?: ReactNode;
    labelFor?: string;
}) {
    return (
        <div className="border-border flex items-center gap-3 border-t px-4 py-3 first:border-t-0 max-sm:flex-wrap max-sm:gap-y-2">
            {leading}
            <div className="min-w-0 flex-1">
                <Label className="block text-sm leading-5 font-medium" htmlFor={labelFor}>
                    {label}
                </Label>
                {hint ? <p className="text-muted-foreground text-sm leading-5">{hint}</p> : null}
            </div>
            {children}
        </div>
    );
}

export function ToggleRow({
    checked,
    disabled,
    hint,
    label,
    onChange,
}: {
    checked: boolean;
    disabled?: boolean;
    hint?: ReactNode;
    label: string;
    onChange: (next: boolean) => void;
}) {
    const id = useId();
    return (
        <Row hint={hint} label={label} labelFor={id}>
            <Switch checked={checked} disabled={disabled} id={id} onCheckedChange={onChange} />
        </Row>
    );
}

export function Choice<Value extends string | number>({
    label,
    onChange,
    options,
    value,
}: {
    label: string;
    onChange: (next: Value) => void;
    options: readonly { label: ReactNode; value: Value }[];
    value: Value;
}) {
    return (
        <Tabs
            onValueChange={(next) => {
                const picked = options.find((option) => option.value === next);
                if (picked) {
                    onChange(picked.value);
                }
            }}
            value={value}
        >
            <Tabs.List aria-label={label}>
                {options.map((option) => (
                    <Tabs.Trigger key={option.value} value={option.value}>
                        {option.label}
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
        </Tabs>
    );
}

export function useSaveSettings() {
    const { dbClient } = useRouteContext({ from: "__root__" });
    const toast = useToast();
    const { saveFailed } = useIntlayer("dashboard-settings");
    return (changes: Readonly<Record<string, string>>) => {
        writeSettings(dbClient, changes).catch(() => {
            toast.add({ title: saveFailed.value, type: "destructive" });
        });
    };
}
