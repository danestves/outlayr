import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";

import bundle from "../../drizzle/migrations";
import { LEGACY_MIGRATION_NAMES } from "./legacy-migration-names";

const DRIZZLE_DIR = join(import.meta.dirname, "..", "..", "drizzle");
const MIGRATION_FOLDER = /^\d{14}_/;

const folders = (): string[] =>
    readdirSync(DRIZZLE_DIR)
        .filter((name) => MIGRATION_FOLDER.test(name))
        .sort();

describe("drizzle/migrations.js is a tracked file, not a generated one", () => {
    it("bundles the SQL of every migration folder under the folder's name", () => {
        const onDisk = Object.fromEntries(
            folders().map((name) => [name, readFileSync(join(DRIZZLE_DIR, name, "migration.sql"), "utf-8")])
        );
        expect(bundle.migrations).toStrictEqual(onDisk);
    });

    it("sorts the migrations 0.45 shipped by name in the order they shipped", () => {
        const shipped = folders().slice(0, LEGACY_MIGRATION_NAMES.size);
        expect(shipped.map((name) => Number(name.slice(15, 19)))).toStrictEqual(shipped.map((_name, index) => index));
    });
});
