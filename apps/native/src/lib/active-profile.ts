import { File, Paths } from "expo-file-system";

import { parseProfileId } from "@/domain/profiles";

const activeProfileFile = () => new File(Paths.document, "active-profile");

let active: { id: string | undefined } | null = null;

export function activeProfileId(): string | undefined {
    if (active === null) {
        const file = activeProfileFile();
        active = { id: file.exists ? parseProfileId(file.textSync()) : undefined };
    }
    return active.id;
}

export function writeActiveProfile(profileId: string | undefined): void {
    const file = activeProfileFile();
    if (profileId === undefined) {
        if (file.exists) {
            file.delete();
        }
    } else {
        file.write(profileId);
    }
}

export function resetActiveProfile(): void {
    writeActiveProfile(undefined);
    active = { id: undefined };
}
