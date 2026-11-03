import { CloseToolbar } from "@/components/close-toolbar";
import ProfileEditor from "@/components/profile-editor";

export default function ProfileEditScreen() {
    return (
        <>
            <CloseToolbar placement="left" />
            <ProfileEditor mode="edit" />
        </>
    );
}
