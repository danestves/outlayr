import type { ComponentProps, ReactNode } from "react";
import { useId, useState } from "react";

import { LogoMark } from "../logo-mark";

const PILL =
    "flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-[15px] font-medium disabled:opacity-50";

export const SOLID_PILL = `${PILL} bg-app-ink text-app-bg`;
export const LINE_PILL = `${PILL} bg-app-group ring-1 ring-app-rule ring-inset`;
export const TEXT_BUTTON = "text-app-muted hover:text-app-ink px-2 py-2 text-sm";

export function Screen({ children, title }: { children?: ReactNode; title?: ReactNode }) {
    return (
        <main className="bg-app-bg text-app-ink flex min-h-dvh flex-col items-center px-7 pt-[clamp(3rem,14dvh,7rem)] pb-10">
            <div className="flex w-full max-w-[22rem] flex-col text-center">
                <LogoMark className="mb-5 size-7 self-center" />
                {title ? <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1> : null}
                {children}
            </div>
        </main>
    );
}

export function Muted({ children }: { children: ReactNode }) {
    return <p className="text-app-muted -mt-3 mb-5 text-sm">{children}</p>;
}

export function ErrorLine({ message }: { message: string | null }) {
    return message ? (
        <p className="text-app-spend mb-3 text-sm" role="alert">
            {message}
        </p>
    ) : null;
}

export function Field({
    label,
    secret,
    ...input
}: Omit<ComponentProps<"input">, "type"> & { label: string; secret?: boolean }) {
    const id = useId();
    const [shown, setShown] = useState(false);
    return (
        <div className="bg-app-group ring-app-rule focus-within:ring-app-ink mb-2.5 flex items-center gap-3 rounded-2xl px-3.5 py-2 text-left ring-1 ring-inset">
            <div className="min-w-0 flex-1">
                <label className="text-app-muted block text-[11px]" htmlFor={id}>
                    {label}
                </label>
                <input
                    {...input}
                    className="w-full bg-transparent text-[15px] outline-none"
                    id={id}
                    type={secret && !shown ? "password" : "text"}
                />
            </div>
            {secret ? (
                <button
                    className="text-app-muted hover:text-app-ink text-xs"
                    onClick={() => setShown(!shown)}
                    type="button"
                >
                    {shown ? "Hide" : "Show"}
                </button>
            ) : null}
        </div>
    );
}

export const CODE_LENGTH = 6;
const NON_DIGITS = /\D/gu;
const SLOTS = Array.from({ length: CODE_LENGTH }, (_, slot) => slot);

export function CodeField({ onChange, value }: { onChange: (code: string) => void; value: string }) {
    const [focused, setFocused] = useState(false);
    const active = Math.min(value.length, CODE_LENGTH - 1);
    return (
        <div className="relative mb-5 flex justify-center gap-2">
            {SLOTS.map((slot) => (
                <span
                    className={`bg-app-group flex h-[52px] w-10 items-center justify-center rounded-xl font-mono text-[22px] font-semibold ring-1 ring-inset ${
                        focused && slot === active ? "ring-app-ink" : "ring-app-rule"
                    }`}
                    key={slot}
                >
                    {value.charAt(slot)}
                </span>
            ))}
            <input
                aria-label="Code"
                autoComplete="one-time-code"
                autoFocus
                className="absolute inset-0 w-full cursor-text opacity-0"
                inputMode="numeric"
                maxLength={CODE_LENGTH}
                onBlur={() => setFocused(false)}
                onChange={(event) => onChange(event.target.value.replaceAll(NON_DIGITS, "").slice(0, CODE_LENGTH))}
                onFocus={() => setFocused(true)}
                value={value}
            />
        </div>
    );
}
