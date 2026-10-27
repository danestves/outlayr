/** Typed so a drizzle upgrade that changes the bundle's shape fails the build, not the migration. */
declare module "*/drizzle/migrations" {
    const bundle: {
        migrations: Record<string, string>;
    };
    export default bundle;
}
