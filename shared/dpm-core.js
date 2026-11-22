/* =====================================================================
   DPM Document Management Hub - shared helpers (sign-in, Graph, dates)
   Plain script (no build step). Load order:
     shared/dpm-config.js -> shared/dpm-core.js -> the app's own <script>
   The app defines `const CONFIG = { ...DPM_TENANT, LISTS, SCOPES }`;
   these helpers read CONFIG when they are called, not when loaded.
   Same patterns as the MJE Hubs (mje-core.js). No payroll data here - the repo is public.
   ===================================================================== */

const BRAND = Object.assign({ ORGANISATION:"Department of Personnel Management", SHORT:"DPM", APP_NAME:"Document Management Hub",
  LIST_PREFIX:"DPM_", OFFICERS_GROUP:"DPM Officers" }, typeof DPM_BRAND === "object" ? DPM_BRAND : {});
// { batches:"Batches", … } -> { batches:"DPM_Batches", … }
const dpmLists = names => Object.fromEntries(Object.entries(names).map(([k, v]) => [k, BRAND.LIST_PREFIX + v]));

/* ---------------- helpers ---------------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = (n, w = 2) => String(n).padStart(w, "0");
// Local-date YYYY-MM-DD (never toISOString - avoids the UTC+10 shift)
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const TODAY = ymd(new Date());
const YEAR = TODAY.slice(0, 4);
const addDays = (s, n) => { const [y,m,d] = s.split("-").map(Number); return ymd(new Date(y, m-1, d+n)); };
const fmtDate = s => { if (!s) return ""; const [y,m,d] = String(s).slice(0,10).split("-"); return d ? `${d}/${m}/${y}` : s; };
// True only for a real calendar date in YYYY-MM-DD form (rejects 2025-06-31)
const isRealDate = s => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return false; const [y,m,d] = s.split("-").map(Number); const t = new Date(y, m-1, d); return t.getFullYear() === y && t.getMonth() === m-1 && t.getDate() === d; };
const num = v => (v === "" || v == null || isNaN(+v)) ? 0 : +v;
const r2 = v => Math.round(num(v) * 100) / 100;
const kina = v => "K" + num(v).toLocaleString("en-AU", { minimumFractionDigits:2, maximumFractionDigits:2 });
const kinaShort = v => { const n = num(v); return n >= 1e6 ? "K" + (n/1e6).toFixed(2) + "M" : n >= 1e4 ? "K" + Math.round(n/1e3) + "k" : kina(n); };
const norm = s => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
/* ---------------- the Hub's own dialogs (instead of the browser's "…github.io says" boxes) ----------------
   ask()       -> Promise<boolean>  question with two buttons
   tell()      -> Promise           a notice with OK
   showError() -> Promise           an error with "Copy details", so the exact message can be passed on */
function msgDialog(html, focusSel){
  return new Promise(resolve => {
    const d = $("#dlgMsg");
    d.innerHTML = html;
    d.onclick = e => {
      const b = e.target.closest("[data-a]"); if (!b) return;
      if (b.dataset.a === "copy"){ copyText(d.querySelector(".errdetails").textContent, b); return; }
      d.close(); resolve(b.dataset.a === "1");
    };
    d.oncancel = e => { e.preventDefault(); d.close(); resolve(false); };
    d.showModal();
    d.querySelector(focusSel || '[data-a="1"]')?.focus();
  });
}
function ask(message, { title = "Please confirm", ok = "OK", cancel = "Cancel", danger = false } = {}){
  return msgDialog(`<div class="dh"><div class="dt"><span class="kind" ${danger ? 'style="background:var(--crit)"' : ""}>${esc(title)}</span></div></div>
    <div class="db"><p class="msg">${esc(message)}</p></div>
    <div class="df"><button class="btn" data-a="0">${esc(cancel)}</button><button class="btn primary" data-a="1" ${danger ? 'style="background:var(--crit);border-color:var(--crit)"' : ""}>${esc(ok)}</button></div>`);
}
function tell(message, { title = "Note" } = {}){
  return msgDialog(`<div class="dh"><div class="dt"><span class="kind">${esc(title)}</span></div></div>
    <div class="db"><p class="msg">${esc(message)}</p></div>
    <div class="df"><button class="btn primary" data-a="1">OK</button></div>`);
}
function showError(title, err, hint = ""){
  const msg = err && err.message ? err.message : String(err ?? "");
  console.error(title, err);
  const now = new Date();
  const details = [`What: ${title}`, msg ? `Message: ${msg}` : "", err?.status ? `Status: ${err.status}` : "",
    `Screen: ${location.hash || "#dash"}`, `User: ${typeof me === "object" && me.name ? `${me.name} (${me.role})` : "-"}`,
    `When: ${ymd(now)} ${hhmm(now)}`, `App: ${location.origin}${location.pathname}`].filter(Boolean).join("\n");
  return msgDialog(`<div class="dh"><div class="dt"><span class="kind" style="background:var(--crit)">Problem</span><h2>${esc(title)}</h2></div></div>
    <div class="db">${hint ? `<p class="msg">${esc(hint)}</p>` : ""}${msg ? `<p class="msg"><b>${esc(msg)}</b></p>` : ""}
      <details><summary class="note">Details to send if you need help</summary><pre class="errdetails">${esc(details)}</pre></details></div>
    <div class="df"><button class="btn" data-a="copy">Copy details</button><button class="btn primary" data-a="1">OK</button></div>`);
}
async function copyText(text, btn){
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
  if (btn){ const o = btn.textContent; btn.textContent = "Copied ✓"; setTimeout(() => btn.textContent = o, 1500); }
}
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2800); }

/* ---------------- auth (MSAL, PKCE) ---------------- */
let msalApp, account;
async function initAuth(){
  msalApp = new msal.PublicClientApplication({
    auth:{ clientId:CONFIG.CLIENT_ID, authority:`https://login.microsoftonline.com/${CONFIG.TENANT_ID}`, redirectUri: location.origin + location.pathname },
    cache:{ cacheLocation:"localStorage" }
  });
  await msalApp.initialize();
  const res = await msalApp.handleRedirectPromise();
  account = res?.account || msalApp.getAllAccounts()[0];
  if (account) msalApp.setActiveAccount(account);
}
async function token(){
  try { return (await msalApp.acquireTokenSilent({ scopes:CONFIG.SCOPES, account })).accessToken; }
  catch(e){ await msalApp.acquireTokenRedirect({ scopes:CONFIG.SCOPES, account }); }
}
// ID token for the Hub's own app registration - the AWS reading service checks it (issuer = this tenant, audience = CLIENT_ID)
async function idToken(){
  try { return (await msalApp.acquireTokenSilent({ scopes:["openid","profile"], account })).idToken; }
  catch(e){ await msalApp.acquireTokenRedirect({ scopes:["openid","profile"], account }); }
}
const signIn  = () => msalApp.loginRedirect({ scopes:CONFIG.SCOPES });
const signOut = () => msalApp.logoutRedirect({ account });

/* ---------------- Graph data layer ---------------- */
let siteId;
async function graph(path, opts = {}){
  const r = await fetch(path.startsWith("http") ? path : "https://graph.microsoft.com/v1.0" + path, {
    ...opts, headers:{ Authorization:"Bearer " + await token(), "Content-Type":"application/json", ...(opts.headers||{}) }
  });
  if (!r.ok){ let m = r.status + " " + r.statusText; try{ m = (await r.json()).error.message; }catch{} const e = new Error(m); e.status = r.status; throw e; }
  return r.status === 204 ? null : r.json();
}
async function getSite(){ siteId = (await graph(`/sites/${CONFIG.SP_HOST}:${CONFIG.SITE_PATH}`)).id; }

// Every item of a SharePoint list, following @odata.nextLink page by page.
// Optional OData filter on fields (best on an indexed column). If SharePoint refuses the filter,
// the whole list is read instead (.filtered = false).
async function listItems(listName, filter, expand = "fields"){
  const base = `/sites/${siteId}/lists/${listName}/items?expand=${expand}&$top=999`;
  const read = async (url, opts) => { const out = []; while (url){ const j = await graph(url, opts); out.push(...j.value.map(i => ({ id:i.id, ...i.fields, _drive:i.driveItem }))); url = j["@odata.nextLink"]; } return out; };
  if (!filter) return read(base);
  try {
    const out = await read(`${base}&$filter=${encodeURIComponent(filter)}`, { headers:{ Prefer:"HonorNonIndexedQueriesWarningMayFailRandomly" } });
    out.filtered = true; return out;
  } catch(e){
    if (isMissingList(e) || isForbidden(e) || e.status === 401) throw e;
    console.warn(`Filtered read of ${listName} refused (${e.message}) - reading the whole list`);
    const out = await read(base); out.filtered = false; return out;
  }
}
const isMissingList = e => e.status === 404 || /not (be )?found|does not exist/i.test(e.message);
const isForbidden = e => e.status === 403 || /access denied|forbidden|not authorized/i.test(e.message);

// Create/update with field fallback: strip any column SharePoint doesn't recognise and retry
async function saveListItem(listName, id, fields){
  const base = `/sites/${siteId}/lists/${listName}/items`;
  let f = { ...fields }, stripped = [];
  for (let attempt = 0; attempt < 8; attempt++){
    try {
      const res = id ? await graph(`${base}/${id}/fields`, { method:"PATCH", body:JSON.stringify(f) })
                     : await graph(base, { method:"POST", body:JSON.stringify({ fields:f }) });
      if (stripped.length) console.warn("Columns not on list, skipped:", stripped);
      return id ? { id, ...res } : { id:res.id, ...res.fields };
    } catch(e){
      const m = /Field '([^']+)' is not recognized/i.exec(e.message);
      if (m && m[1] in f){ stripped.push(m[1]); delete f[m[1]]; continue; }
      throw e;
    }
  }
}
async function deleteListItem(listName, id){ await graph(`/sites/${siteId}/lists/${listName}/items/${id}`, { method:"DELETE" }); }

/* ---------------- documents ---------------- */
async function libraryDrive(listName){
  try { return (await graph(`/sites/${siteId}/lists/${listName}/drive`)).id; } catch(e){ return null; }
}
// PUT a file into <library>/<folder>/<name>; Graph creates the folders. Files up to 4 MB use a simple PUT,
// larger scans use an upload session.
async function uploadToDrive(driveId, folder, name, blob){
  const path = `${folder.split("/").map(encodeURIComponent).join("/")}/${encodeURIComponent(name)}`;
  if (blob.size <= 4 * 1024 * 1024){
    const r = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${path}:/content?@microsoft.graph.conflictBehavior=rename`,
      { method:"PUT", headers:{ Authorization:"Bearer " + await token(), "Content-Type": blob.type || "application/octet-stream" }, body: blob });
    if (!r.ok){ const e = new Error(r.status === 403 ? "you don't have permission to add documents" : `upload failed (${r.status})`); e.status = r.status; throw e; }
    return r.json();
  }
  const s = await graph(`/drives/${driveId}/root:/${path}:/createUploadSession`, { method:"POST", body:JSON.stringify({ item:{ "@microsoft.graph.conflictBehavior":"rename" } }) });
  const chunk = 5 * 320 * 1024; let res;
  for (let start = 0; start < blob.size; start += chunk){
    const end = Math.min(start + chunk, blob.size);
    const r = await fetch(s.uploadUrl, { method:"PUT", headers:{ "Content-Range":`bytes ${start}-${end-1}/${blob.size}` }, body: blob.slice(start, end) });
    if (!r.ok) throw new Error(`upload failed (${r.status})`);
    res = await r.json();
  }
  return res;
}
// Write the document's details (Batch Ref, Document Type ...) onto the file's library item
async function tagDriveItem(driveId, itemId, fields){
  return graph(`/drives/${driveId}/items/${itemId}/listItem/fields`, { method:"PATCH", body:JSON.stringify(fields) });
}
