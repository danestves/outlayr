import CategoryEditor from "@/components/category-editor";

// An Android form sheet has no app bar, so the editor's own `SheetHeader` carries the title, close and Delete.
export function CategoryEditScreen({ id }: { id: string }) {
    return <CategoryEditor id={id} mode="edit" />;
}
