import { defineConfig } from "vite-plus";

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        env: { TZ: "UTC" },
    },
});
