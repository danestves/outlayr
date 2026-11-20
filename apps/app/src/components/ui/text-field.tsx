import { Field } from "panelui-web/field";
import type { FieldProps } from "panelui-web/field";
import { Input } from "panelui-web/input";
import type { InputProps } from "panelui-web/input";
import type { ReactNode } from "react";

export interface TextFieldProps extends Omit<InputProps, "children"> {
    description?: ReactNode;
    error?: ReactNode;
    invalid?: FieldProps["invalid"];
    label: ReactNode;
}

export function TextField({ description, error, invalid, label, ...input }: TextFieldProps) {
    return (
        <Field invalid={invalid ?? Boolean(error)}>
            <Field.Label>{label}</Field.Label>
            <Input {...input} />
            {description ? <Field.Description>{description}</Field.Description> : null}
            {error ? <Field.Error match>{error}</Field.Error> : null}
        </Field>
    );
}
