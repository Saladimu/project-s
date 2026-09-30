# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project overview

**Project S - Task Manager** is a mobile-first static web app for entering and
managing task data stored in a Google Sheet. There is **no build step, no
package manager, and no test runner** - the app runs by opening `index.html`
(or serving the folder over HTTP).

Data comes from one of three connection modes (see `js/api.js`):
- `api` - read/write via a deployed Google Apps Script web app (`apps script/Code.gs`)
- `read` - read-only from a publicly viewable Google Sheet via gviz (default)
- `demo` - in-memory sample data, used when no URLs are configured

## Commands

```bash
# Preview locally (static server, no build required)
python3 -m http.server 8000
```

```bash
# Apps Script backend must be pasted into the sheet's Extensions > Apps Script
# and deployed as a Web app (there is no local backend server in this repo)
```

There is no lint, typecheck, or test command. Verify changes by serving the
folder and exercising the UI in a browser.

## File map

```
index.html            App shell - 4 views: Dashboard, Tasks, Organizations, Settings
css/styles.css        Mobile-first styling + light/dark theme variables
js/cache.js           TaskCache: in-memory + localStorage (5-min TTL)
js/api.js             ProjectS API client (api / read / demo modes)
js/app.js             UI logic, rendering, formatting, security
sw.js                 Service worker (offline shell + asset caching)
apps script/Code.gs   Google Apps Script backend
README.md             Full feature docs + changelog
```

## Conventions and rules

### No build / vanilla JS
- Keep code plain ES5-style browser JavaScript inside IIFEs (`var`, function
  expressions). Do not introduce frameworks, bundlers, or npm dependencies.
- Do not add `package.json` unless explicitly requested.

### Asset versioning (required on every CSS/JS change)
Assets are cache-busted with a query string. When you edit a file, bump its
version in `index.html`:
- `css/styles.css?v=N`
- `js/cache.js?v=N`
- `js/api.js?v=N`
- `js/app.js?v=N`

When caching behavior or precached files change, also bump `CACHE_NAME` in
`sw.js` (e.g. `project-s-v6` -> `project-s-v7`). Bump it on every deploy that
changes the app: the client detects the new `sw.js`, activates it, and shows
the in-app **"A new version is available"** banner with the **Hard Refresh**
button. Skipping the bumps leaves users on stale files and suppresses the
update prompt.

### Caching
- `js/cache.js` (`TaskCache`): memory first, async `localStorage` write,
  **5-minute TTL**, keyed by connection mode/URL.
- Read actions (`init`, `tasks`, `options`, `orgs`) go through the cache;
  write actions must invalidate it.
- `sw.js`: navigations/HTML are network-first (3s cap); versioned CSS/JS/images
  are cache-first.

### Dates - always GMT+7
All calendar logic uses a fixed **GMT+7** offset (`GMT7_OFFSET_MS` in
`js/app.js`), never the device timezone. Use `isoDate()`, `todayGMT7()`,
`fmtDate()`, `isOverdue()`. The backend formats dates in the spreadsheet
timezone and never uses `Date.toISOString()` for sheet cells.

### Security
- Settings are locked by default with password `00000` (`DEFAULT_PWD` in
  `js/app.js`); the hash is stored locally. Change before deploying.
- The spreadsheet / Apps Script URLs stay masked while the default password is
  in use. Unlocked Settings auto-lock after 5 minutes idle.
- Never hardcode, read, or print LLM/API keys or other credentials.

### Backend (`apps script/Code.gs`)
- `Task-ID` and `Duration` are formula columns - the app never writes them.
  `Task-ID` is an array formula that lives only in `B2`; `Duration` is copied
  down per row with relative references.
- Backup / restore / wipe operate on the sheet literally named `TaskList`
  (`CONFIG.TASK_SHEET`) by exact name - never header auto-detection.
- Reject duplicate organisation names (case-insensitive) and block deleting or
  renaming an organisation still referenced by a task. Enforce the same checks
  in the app, the demo layer, and `Code.gs`.
- Block deleting a task that other tasks relate to through `Task Relate`
  (matched against the task's `Task-ID`, case-insensitive). Enforce in the app,
  the demo layer, and `Code.gs` (`deleteTask_`).

### Data model
Task columns: `No | Task-ID | Task name | Task Relate | Purpose | PIC |
Organization | Date | Due Date | Value | Note | Internal | Duration | Status`.
The Organization sheet supplies `Name` (+ optional `Description`). Add new
columns by header - the backend maps by header name, so no code change is
needed for optional additions.

## Necessary notes

- `README.md` is the source of truth for features and has a detailed changelog;
  update it when behavior changes.
- The app talks directly to Google (`docs.google.com` gviz, `script.google.com`),
  which already sends permissive CORS headers - no local reverse proxy is used
  or needed.
- Keep the UI responsive across mobile / tablet (>= 768px) / desktop (>= 1024px)
  breakpoints.
- Toast/alert messages and confirmation dialogs are part of the UX; preserve
  them when refactoring.
