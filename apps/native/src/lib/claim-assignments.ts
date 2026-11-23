import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { File, Paths } from "expo-file-system";

import { clearDurably, readDurably, writeDurably } from "./durable-file";
import type { CaptureAssignment } from "./queue-file";

const assignmentsFile = () => new File(Paths.document, "claim-assignments");

const CaptureAssignmentSchema = Schema.Struct({
    id: Schema.String,
    ledger: Schema.String,
});

const decodeAssignments = Schema.decodeUnknownOption(Schema.Array(CaptureAssignmentSchema));

// Garbled or missing reads as none: a half-written list must not pin a capture to a ledger.
export function readClaimAssignments(): readonly CaptureAssignment[] {
    try {
        const text = readDurably(assignmentsFile());
        return text === null ? [] : Option.getOrElse(decodeAssignments(JSON.parse(text)), () => []);
    } catch {
        return [];
    }
}

export function writeClaimAssignments(assignments: readonly CaptureAssignment[]): void {
    if (assignments.length === 0) {
        clearClaimAssignments();
        return;
    }
    writeDurably(assignmentsFile(), JSON.stringify(assignments));
}

export function clearClaimAssignments(): void {
    clearDurably(assignmentsFile());
}

// A deleted ledger never opens again: a capture pinned to it follows its route to `to`.
export function retargetClaimAssignments(from: string, to: string): void {
    const assignments = readClaimAssignments();
    if (assignments.some((entry) => entry.ledger === from)) {
        writeClaimAssignments(assignments.map((entry) => (entry.ledger === from ? { ...entry, ledger: to } : entry)));
    }
}
