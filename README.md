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

### Endorsement packs

Some packs come from DPM itself: a DPM minute, a Secretary's endorsement letter or a Reference Form A, with the schedules, but no Batch Control Form and often no pink forms. Set **Batch kind** to *Endorsement pack* (a scan sets it automatically). Section 1 then records the cover document instead of the Batch Control Form, and:

- the Batch Control Form fields and the pink form per line aren't required (missing pink forms are a warning);
- the cover's own figures must add up (gross − tax = net), and its totals must equal the lines when it covers the same number of claims (a warning when it covers more, e.g. some already paid);
- any other total the cover states, e.g. in the subject line, is listed as a warning.

When the batch includes the Power BI *PE & Budget Monitoring* printout, its budget, spending to date and forecast are kept on the batch. A warning shows when the agency is over budget, and the dashboard shows each agency's latest position.

A Checker can't accept a batch they entered themselves. Every action (created, submitted, accepted, rejected with reasons, returned, resubmitted, document added) is written to `DPM_BatchEvents`.

## Scanning and reading

A web page can't drive a scanner. Scan the whole batch to a PDF with the scanner's own software or the Windows Scan app (phone photos also work), then load it in section **4 · Scanned batch** of the batch page.

- **Viewing:** every page is shown as a thumbnail and opens beside the form (with rotate and zoom).
- **Read automatically** (once the AWS service is set up and the `ReadAutomatically` setting isn't `Off`):
  - Each page is identified and read, and the values fill empty fields. They stay highlighted until a person checks them.
  - Differences between documents are listed. Examples: a pink form that doesn't match its summary line, a handwritten "Paid", unreadable boxes, invalid dates.
  - A value already on the form is never overwritten; the difference is listed instead.
  - Pages scanned upside down or sideways are turned upright and read again (and filed upright).
  - When the Batch Control Form leaves Pay No blank, it is taken from the pink form's Pay Run.
  - The gratuity on an employment contract is compared with the amount claimed.
- **File documents:** each run of pages with the same document type and employee is saved as one PDF in `DPM_BatchDocuments/<Agency>/<Batch Ref>/`, with its details. The complete scan can be kept as well.

## Review the batch

When the Hub's AWS service is switched on, **Review the batch** (under Checks) sends the whole batch to Claude Sonnet as text, with no page images. That covers what was entered, the payment lines, the Hub's own checks, and what was read from every scanned page. Claude replies with a short list of points to query that the fixed checks can't catch, for example:

- figures that disagree between the letter, the schedules, the pink forms and the calculations;
- dates out of order;
- final entitlements worked out at today's salary rather than the salary on the date someone left;
- a gratuity basis or period that doesn't match the contract;
- matters on a minute that aren't in the pack.

Each point is marked **Query**, **Check** or **Note** and names the documents and pages. The list:

- is saved with the batch (`ReviewFindings`) and recorded in its history;
- can be copied for an email to the agency;
- adds its *Query* points to the rejection reasons.

It's advice for the Checker only: nothing is accepted or rejected automatically. The notes made while reading the scan (`ReadNotes`) and what was read from each page (`ReadData`) are also kept on the batch, so a review can be run later.

## Connecting to SharePoint

1. Run the setup kit on the site (see its README).
2. Register an Entra app named *DPM Document Management Hub*:
   - Type: single-page application.
   - Redirect URIs: `https://marcusappdev.github.io/DPM/` and `https://marcusappdev.github.io/DPM/index.html`.
   - Delegated permissions: Graph `Sites.ReadWrite.All` and `User.Read`, with admin consent granted.
3. Put its client ID in `shared/dpm-config.js`.

**IDs only in this repo.** It's public: never commit payroll data, employee names, file numbers or scans.
