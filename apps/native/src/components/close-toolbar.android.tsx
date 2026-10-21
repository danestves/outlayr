// Nothing on Android: a modal's app bar already carries an X, and a form sheet's `SheetHeader` draws its own.
export function CloseToolbar(_props: { placement: "left" | "right" }) {
    return null;
}
