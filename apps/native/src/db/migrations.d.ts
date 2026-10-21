/** Typed so a drizzle upgrade that changes the bundle's shape fails the build, not the migration. */
declare module "*/drizzle/migrations" {
    const bundle: {
        journal: {
            entries: {
                idx: number;
                when: number;
                tag: string;
                breakpoints: boolean;
            }[];
        };
        migrations: Record<string, string>;
    };
    export default bundle;
}
