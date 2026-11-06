import { defineConfig } from "vite-plus";

export default defineConfig({
    test: {
        env: { TZ: "UTC" },
    },
});
