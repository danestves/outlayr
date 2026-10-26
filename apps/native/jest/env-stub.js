// Jest never resolves a real env, and `cloud-configuration` reads the Convex URLs at import time. Nothing dials these.
module.exports = {
    ENV: {
        EXPO_PUBLIC_CONVEX_SITE_URL: "https://test.convex.site",
        EXPO_PUBLIC_CONVEX_URL: "https://test.convex.cloud",
    },
};
