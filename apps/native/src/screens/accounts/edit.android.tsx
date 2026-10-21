import AccountEditor from "@/components/account-editor";

/** Android form sheets have no app bar, so the title, close and Delete live in the editor's own `SheetHeader`. */
export function AccountEdit({ id }: { id: string }) {
    return <AccountEditor id={id} mode="edit" />;
}
