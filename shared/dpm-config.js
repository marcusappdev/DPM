/* =====================================================================
   DPM Document Management Hub - Microsoft 365 connection

   POC: Concept Group's tenant, site /sites/DPM.
   To move to DPM's own tenant, change these four values only
   (Setup-DPM-Hub.ps1 prints TENANT_ID, SP_HOST and SITE_PATH at the end).
   While CLIENT_ID starts with "<<" the app runs in DEMO mode with made-up data.

   IDs only - this repo is public: never put payroll data, employee
   names or file numbers in this file or anywhere in the repo.
   ===================================================================== */
const DPM_TENANT = {
  CLIENT_ID: "cfd8a964-d582-47e1-9174-ecd518cbc559",   // Entra app "DPM Document Management Hub" (Concept Group tenant)
  TENANT_ID: "ea9e105c-2df6-47ef-a8e3-b4aa1d788423",     // Concept Group
  SP_HOST:   "conceptcompg.sharepoint.com",
  SITE_PATH: "/sites/DPM"
};

/* =====================================================================
   The organisation this Hub belongs to.
     ORGANISATION   - full name: header, printouts
     SHORT          - short name: page title, file names, messages
     LIST_PREFIX    - start of every SharePoint list / library name
                      (DPM_ -> DPM_Batches). Must match the setup kit prefix.
     OFFICERS_GROUP - the SharePoint group for data entry and checking officers
   ===================================================================== */
const DPM_BRAND = {
  ORGANISATION:   "Department of Personnel Management",
  SHORT:          "DPM",
  APP_NAME:       "Document Management Hub",
  LIST_PREFIX:    "DPM_",
  OFFICERS_GROUP: "DPM Officers"
};
