import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const newestMtime = (dir: string): number => {
    try {
        return Math.max(...readdirSync(dir).map((name) => statSync(join(dir, name)).mtimeMs));
    } catch {
        return Number.NEGATIVE_INFINITY;
    }
};

export default function globalSetup(): void {
    process.env.TZ = "America/Caracas";

    const root = join(import.meta.dirname, "..");
    if (newestMtime(join(root, ".intlayer", "dictionary")) < newestMtime(join(root, "src", "content"))) {
        execFileSync(join(root, "node_modules", ".bin", "intlayer"), ["build"], { cwd: root, stdio: "inherit" });
    }
}
