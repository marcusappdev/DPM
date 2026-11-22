# DPM Document Management Hub

Registers batches of payroll documents that government agencies submit to the Department of Personnel Management. Each batch is a Batch Control Form, a DPM Validated Summary, and one Special Offline Payment Form (the pink form) per employee. The Hub checks every entry and rejects the whole batch if any form fails. It keeps the scanned documents in SharePoint with their details and shows a dashboard.

It replaces the weekly "Master Register - Overspending Agencies" spreadsheet: officers enter each batch in the Hub instead.

**Status:** proof of concept on Concept Group's Microsoft 365 tenant (`/sites/DPM`). Once it's right, it moves to DPM's own tenant.

## How it's built

- A single-page app on GitHub Pages: `index.html` plus `shared/`. There's no build step.
- **Data:** SharePoint Online lists and a document library with the prefix `DPM_`, created by the **DPM Hub setup kit** (`Setup-DPM-Hub.ps1`). The kit is kept outside this repo.
- **Sign-in and access:** Microsoft Graph with MSAL (PKCE). Access follows the person's SharePoint permissions, and their **Hub Role** (Data Entry, Checker, Manager, Admin) comes from the `DPM_Users` list.
- **Demo mode:** while `CLIENT_ID` in `shared/dpm-config.js` is the placeholder, the app runs on made-up data held in the browser.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The app: dashboard, batches, batch entry and checks, register, agencies & codes, settings |
| `shared/dpm-config.js` | Tenant, site and list prefix. The **only** file to change when moving tenants |
| `shared/dpm-core.js` | Sign-in, Graph calls, document upload, date helpers (same patterns as the MJE Hubs) |
| `shared/dpm.css` | Look and feel |
| `shared/dpm-crest.png`, `dpm-icon*.png` | PNG national crest - logo and tab icon |
| `aws/dpm-reader.yaml` | CloudFormation template for the "Read automatically" service (Claude on Amazon Bedrock, Australia) |
| `aws/README-AWS.md` | Step-by-step AWS console setup for that service |

## Checks on every batch

One error anywhere rejects the whole batch.

- Required Batch Control Form and summary fields are filled; Pay No looks like `23/26`.
- Every date is a real calendar date, and summary sign-offs are in date order.
- The Number of Forms equals the number of payment lines, and each line has its pink form ticked.
- Employee / file numbers are 8 characters, which catches a dropped digit.
- On each line, net = gross − tax; the summary totals equal the lines; tax is no more than 40% (setting `MaxTaxPct`) and matches any rate stated in the remarks.
- The payment period is given, and the nature of claim is given where the transaction type needs it (e.g. Final Entitlement).
- A line with a handwritten "Paid" note is held.
- Possible duplicate: the same employee, transaction type and period already in another live batch.
- Warning when an employee number has a different name elsewhere in the register.

A Checker can't accept a batch they entered themselves. Every action (created, submitted, accepted, rejected with reasons, returned, resubmitted, document added) is written to `DPM_BatchEvents`.

## Scanning and reading

A web page can't drive a scanner. Scan the whole batch to a PDF with the scanner's own software or the Windows Scan app (phone photos also work), then load it in section **4 · Scanned batch** of the batch page.

- **Viewing:** every page is shown as a thumbnail and opens beside the form (with rotate and zoom).
- **Read automatically** (once the AWS service is set up and the `ReadAutomatically` setting isn't `Off`):
  - Each page is identified and read, and the values fill empty fields. They stay highlighted until a person checks them.
  - Differences between documents are listed. Examples: a pink form that doesn't match its summary line, a handwritten "Paid", unreadable boxes, invalid dates.
  - A value already on the form is never overwritten; the difference is listed instead.
- **File documents:** each run of pages with the same document type and employee is saved as one PDF in `DPM_BatchDocuments/<Agency>/<Batch Ref>/`, with its details. The complete scan can be kept as well.

## Connecting to SharePoint

1. Run the setup kit on the site (see its README).
2. Register an Entra app named *DPM Document Management Hub*:
   - Type: single-page application.
   - Redirect URIs: `https://marcusappdev.github.io/DPM/` and `https://marcusappdev.github.io/DPM/index.html`.
   - Delegated permissions: Graph `Sites.ReadWrite.All` and `User.Read`, with admin consent granted.
3. Put its client ID in `shared/dpm-config.js`.

**IDs only in this repo.** It's public: never commit payroll data, employee names, file numbers or scans.
