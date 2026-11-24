import { beforeEach, expect, test, vi } from "vite-plus/test";

const files = vi.hoisted(() => new Map<string, string>());

vi.mock("expo-file-system", () => {
    class File {
        private readonly fileName: string;
        constructor(_directory: unknown, name: string) {
            this.fileName = name;
        }
        get name() {
            return this.fileName;
        }
        get parentDirectory() {
            return {};
        }
        get exists() {
            return files.has(this.fileName);
        }
        textSync() {
            return files.get(this.fileName) ?? "";
        }
        writeSync(text: string) {
            files.set(this.fileName, text);
        }
        delete() {
            files.delete(this.fileName);
        }
        moveSync(destination: File) {
            files.set(destination.name, this.textSync());
            files.delete(this.fileName);
        }
    }
    return { File, Paths: { document: {} } };
});

import { File, Paths } from "expo-file-system";

import { readDurably, writeDurably } from "./durable-file";

const durableFile = () => new File(Paths.document, "routing");

beforeEach(() => {
    files.clear();
});

test("reads the finished sibling when a crash left only the tmp copy", () => {
    files.set("routing.tmp", "complete");

    expect(readDurably(durableFile())).toBe("complete");
});

test("reads the main file when both copies exist", () => {
    files.set("routing", "main");
    files.set("routing.tmp", "stale");

    expect(readDurably(durableFile())).toBe("main");
});

test("a crash during the next write keeps the copy a previous crash left in the sibling", () => {
    files.set("routing.tmp", "recovered");
    const write = vi.spyOn(File.prototype, "writeSync").mockImplementation(function writeSync(this: File) {
        files.set(this.name, "");
        throw new Error("killed mid-write");
    });

    expect(() => writeDurably(durableFile(), "next")).toThrow("killed mid-write");
    write.mockRestore();

    expect(readDurably(durableFile())).toBe("recovered");
});
