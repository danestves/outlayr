// Jest never loads `.env`, and `@outlayr/env/native` requires Convex at import time. Nothing dials these.
process.env.EXPO_PUBLIC_CONVEX_URL ??= "https://test.convex.cloud";
process.env.EXPO_PUBLIC_CONVEX_SITE_URL ??= "https://test.convex.site";
