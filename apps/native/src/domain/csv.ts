/** RFC 4180 plus what spreadsheets actually emit: bare `LF`, a trailing newline, and a leading byte order mark. */

const NEEDS_QUOTING = /[",\r\n]/;

function escapeField(value: string): string {
    if (!NEEDS_QUOTING.test(value)) {
        return value;
    }
    return `"${value.replaceAll('"', '""')}"`;
}

export function formatCsvRow(fields: readonly string[]): string {
    return fields.map(escapeField).join(",");
}

/** Blank and all-empty rows are dropped. */
export function parseCsv(text: string): string[][] {
    const source = text.codePointAt(0) === 0xfe_ff ? text.slice(1) : text;
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;

    const endField = () => {
        row.push(field);
        field = "";
    };
    const endRow = () => {
        endField();
        if (row.some((cell) => cell !== "")) {
            rows.push(row);
        }
        row = [];
    };

    for (let i = 0; i < source.length; i += 1) {
        const char = source[i];

        if (quoted) {
            if (char === '"') {
                if (source[i + 1] === '"') {
                    field += '"';
                    i += 1;
                    continue;
                }
                quoted = false;
                continue;
            }
            field += char;
            continue;
        }

        if (char === '"' && field === "") {
            quoted = true;
            continue;
        }
        if (char === ",") {
            endField();
            continue;
        }
        if (char === "\r") {
            if (source[i + 1] === "\n") {
                i += 1;
            }
            endRow();
            continue;
        }
        if (char === "\n") {
            endRow();
            continue;
        }
        field += char;
    }

    if (field !== "" || row.length > 0) {
        endRow();
    }

    return rows;
}
