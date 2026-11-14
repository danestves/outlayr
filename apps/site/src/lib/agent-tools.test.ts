import { expect, it } from "vite-plus/test";

import { searchPages } from "./agent-tools";

const PAGES = [
    {
        description: "Cómo funciona el escáner de recibos",
        path: "/guides/receipt-scanner",
        title: "Escáner de recibos",
    },
    { description: "Outlayr and YNAB on price", path: "/compare/ynab", title: "YNAB alternative" },
    { path: "/terms", title: "Terms of Use" },
];

it.each([
    { paths: ["/guides/receipt-scanner", "/compare/ynab", "/terms"], query: "  " },
    { paths: ["/guides/receipt-scanner"], query: "ESCANER como" },
    { paths: ["/compare/ynab"], query: "ynab price" },
    { paths: [], query: "ynab terms" },
])("'$query' finds $paths", ({ paths, query }) => {
    expect(searchPages(PAGES, query).map(({ path }) => path)).toEqual(paths);
});
