import { defineConfig } from "vite-plus";

export default defineConfig({
    test: {
        allowOnly: false,
        include: ["oxlint/**/*.test.ts"],
    },
});
