declare module "sql.js" {
    type Cell = string | number | Uint8Array | null;

    interface Statement {
        free: () => boolean;
        getAsObject: () => Record<string, Cell>;
        step: () => boolean;
    }

    interface Database {
        close: () => void;
        prepare: (sql: string) => Statement;
    }

    interface SqlJsStatic {
        Database: new (data: Uint8Array) => Database;
    }

    export default function initSqlJs(config: { locateFile: () => string }): Promise<SqlJsStatic>;
}
