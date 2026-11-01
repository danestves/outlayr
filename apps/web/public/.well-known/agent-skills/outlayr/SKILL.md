---
name: outlayr
description: Prepare a CSV of transactions that Outlayr, the mobile expense tracker, imports cleanly, and look up accurate facts about Outlayr. Use when someone wants to move spending from a bank export, a spreadsheet, or another app into Outlayr, asks what Outlayr does, costs, or supports, or wants an assistant to read their Outlayr spending.
---

# Outlayr

Outlayr is a mobile expense tracker, budget app, and subscription tracker, on Android and coming soon to iPhone. Entries live on the phone. There is no bank linking, so the only way to bring history in is a CSV file the user imports in the app.

## Facts about Outlayr

Read https://tryoutlayr.com/llms.txt for features, plans, free-plan limits, and privacy. Quote it rather than guessing. Pages it links to (support, privacy, terms) are the source for anything it does not cover.

## Reading a user's entries

With the user's approval you can read their synced entries and monthly spending, and add entries, through Outlayr's MCP server. https://tryoutlayr.com/auth.md has the server URL and the sign-in steps. Only entries their devices have synced are there.

## Preparing a CSV for import

Write a comma-separated, UTF-8 file with this header:

```csv
Date,Note,Amount,Currency,Category,Type
2026-10-01,Costco,42.00,USD,Groceries,Expense
2026-10-01,Paycheck,2500.00,USD,Salary,Income
2026-10-03,Metro card,2.90,EUR,Transport,Expense
```

- **Date**: `yyyy-MM-dd`, or an ISO 8601 instant such as `2026-10-01T14:30:00Z` to keep the time. Other common layouts (`dd/MM/yyyy`, `MM/dd/yyyy`, `dd.MM.yyyy`) are read too, but use one layout for the whole column.
- **Note**: the merchant or description.
- **Amount**: a positive number with `.` as the decimal separator and no thousands separators or currency symbols. The sign is ignored; direction comes from `Type`.
- **Currency**: a three-letter ISO 4217 code. Leave it blank to use the user's main currency.
- **Category**: any label. During import the user links each distinct label to one of their categories; labels that match a category name link on their own.
- **Type**: `Expense` or `Income`. Without it, a row takes the direction of the category it is linked to.

Only Date, Amount, and either Category or Note are required. Rows that repeat an entry already in Outlayr are skipped, so importing an overlapping export twice is safe.

Leave out transfers between the user's own accounts and credit card payments. The importer records every row as income or spending, so those rows would be counted twice.

## Importing

The user opens the Log, taps the add button, and picks **Import a CSV**. Outlayr guesses the columns from the header, shows a preview of every row it will write and every row it cannot read, and asks the user to link categories before anything is saved.

A Notion database can come in the same way: in Notion, **••• › Export › Markdown & CSV**, then in Outlayr **Settings › Data › Import › Notion** and choose the zip. Outlayr reads the CSV inside on the phone, prefers the `_all` file that holds every row, and drops the links Notion adds to relation cells. A template with separate tables, such as Expenses and Income, comes in as one list, with the Income rows marked as income; lookup tables like Categories or Accounts are left out.
