/* Project S - backend API client.
 *
 * Three connection modes:
 *   - api   : full read/write via a deployed Google Apps Script web app
 *   - read  : live read-only from a (publicly viewable) Google Sheet via gviz
 *   - demo  : in-memory sample data, used when no URL is configured
 *
 * A default spreadsheet URL is shipped with the app so it connects to the
 * live sheet out of the box. Clearing the URL in Settings switches to demo.
 */
var ProjectS = (function () {
  var LS_API = 'projects_api_url';
  var LS_SHEET = 'projects_sheet_url';
  var LS_CACHE = 'projects_data_cache';
  var CACHE_TTL = 5 * 60 * 1000;

  var DEFAULT_SHEET = 'https://docs.google.com/spreadsheets/d/1FZKSBJl1a_YQkDy24nq4afzEBiV_f73mUX6p4alKR18';

  var config = {
    baseUrl: '',
    sheetUrl: '',
    mode: 'read'
  };

  var state = {
    tasks: [],
    columns: [],
    options: { purpose: [], pic: [], status: [] },
    organizations: [],
    backups: []
  };

  /* ---------------- demo data (mirrors the live sheet) ---------------- */

  function seedDemo() {
    state.columns = ['No', 'Task-ID', 'Task name', 'Purpose', 'PIC', 'Organization', 'Date', 'Due Date', 'Value', 'Note', 'Internal', 'Duration', 'Status'];
    state.options = {
      purpose: ['Local', 'Global'],
      pic: ['Golf', 'Echo'],
      status: ['Done', 'In-Progress', 'Not Started']
    };
    state.organizations = ['Binus', 'Wardaya', 'Kemurnian', 'Jessica', 'Sun Education', 'Kobi Education', 'Scholars']
      .map(function (n, i) { return { row: i + 2, No: i + 1, Name: n }; });
    state.tasks = [
      { row: 2, 'No': 1, 'Task-ID': 'Task-001', 'Task name': 'Bootcamp', 'Purpose': 'Local', 'PIC': 'Golf', 'Organization': 'Binus', 'Date': '2026-07-01', 'Due Date': '', 'Value': 150000, 'Note': 'Binus (4D3N)', 'Internal': false, 'Duration': '', 'Status': 'Done' },
      { row: 3, 'No': 2, 'Task-ID': 'Task-002', 'Task name': 'Formulir Binus', 'Purpose': 'Local', 'PIC': 'Golf', 'Organization': 'Binus', 'Date': '2026-07-10', 'Due Date': '', 'Value': 250000, 'Note': '', 'Internal': false, 'Duration': '', 'Status': 'Done' },
      { row: 4, 'No': 3, 'Task-ID': 'Task-003', 'Task name': 'Les SAT/IELTS', 'Purpose': 'Local', 'PIC': 'Golf', 'Organization': 'Wardaya', 'Date': '2026-07-21', 'Due Date': '2026-09-24', 'Value': 3300000, 'Note': 'setiap selasa dan kamis 20 kali pertemuan', 'Internal': false, 'Duration': '46 days left', 'Status': 'In-Progress' },
      { row: 5, 'No': 4, 'Task-ID': 'Task-004', 'Task name': 'Recommendation letter', 'Purpose': 'Global', 'PIC': 'Echo', 'Organization': 'Jessica', 'Date': '2026-07-10', 'Due Date': '2026-09-30', 'Value': '', 'Note': 'piano', 'Internal': false, 'Duration': '52 days left', 'Status': 'In-Progress' },
      { row: 6, 'No': 5, 'Task-ID': 'Task-005', 'Task name': 'Surat keterangan OSIS', 'Purpose': 'Local', 'PIC': 'Golf', 'Organization': 'Kemurnian', 'Date': '2026-07-20', 'Due Date': '2026-07-27', 'Value': '', 'Note': 'untuk daftar Binus', 'Internal': false, 'Duration': 'Overdue by 13 days', 'Status': 'Done' },
      { row: 7, 'No': 6, 'Task-ID': 'Task-006', 'Task name': 'Online test BINUS', 'Purpose': 'Local', 'PIC': 'Golf', 'Organization': 'Binus', 'Date': '2026-08-01', 'Due Date': '2026-08-05', 'Value': '', 'Note': 'Zoom test jam 14:00', 'Internal': false, 'Duration': '', 'Status': 'Done' },
      { row: 8, 'No': 7, 'Task-ID': 'Task-007', 'Task name': 'Pembayaran binus jurusan Ai semester 1', 'Purpose': 'Local', 'PIC': 'Golf', 'Organization': 'Binus', 'Date': '2026-08-10', 'Due Date': '', 'Value': 27300000, 'Note': 'Deadline 12 Agust 2026', 'Internal': false, 'Duration': '', 'Status': 'In-Progress' },
      { row: 9, 'No': 8, 'Task-ID': 'Task-008', 'Task name': 'Pembayaran biaya peralatan 1x binus', 'Purpose': 'Local', 'PIC': 'Golf', 'Organization': 'Binus', 'Date': '2027-09-01', 'Due Date': '', 'Value': 10200000, 'Note': '1 x bayar selama kuliah', 'Internal': false, 'Duration': '', 'Status': 'Not Started' },
      { row: 10, 'No': 9, 'Task-ID': 'Task-009', 'Task name': 'Pembayarab biaya lab', 'Purpose': 'Local', 'PIC': 'Golf', 'Organization': 'Binus', 'Date': '2027-09-01', 'Due Date': '', 'Value': 3250000, 'Note': 'pembayaran semester 1-4', 'Internal': false, 'Duration': '', 'Status': 'Not Started' },
      { row: 11, 'No': 10, 'Task-ID': 'Task-010', 'Task name': 'Kobi les Ielts', 'Purpose': 'Local', 'PIC': 'Golf', 'Organization': 'Kobi Education', 'Date': '2026-08-15', 'Due Date': '2026-10-04', 'Value': 3900000, 'Note': '16 x pertemuan, setiap sabtu dan minggu jam 13.00-15.00', 'Internal': false, 'Duration': '', 'Status': 'In-Progress' },
      { row: 12, 'No': 11, 'Task-ID': 'Task-011', 'Task name': 'Recommendation letter', 'Purpose': 'Local', 'PIC': 'Golf', 'Organization': 'Kemurnian', 'Date': '2026-08-13', 'Due Date': '2026-10-31', 'Value': '', 'Note': 'Bu anissa', 'Internal': false, 'Duration': '', 'Status': 'In-Progress' }
    ];
  }

  function demo(action, params) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var result = { ok: true };
        switch (action) {
          case 'init':
          case 'options':
            result.sheet = 'Task (demo)';
            result.columns = state.columns.slice();
            result.tasks = clone(state.tasks);
            result.options = {
              purpose: state.options.purpose.slice(),
              pic: state.options.pic.slice(),
              status: state.options.status.slice()
            };
            result.organizations = clone(state.organizations);
            break;
          case 'tasks':
            result.tasks = clone(state.tasks);
            break;
          case 'orgs':
            result.organizations = clone(state.organizations);
            break;
          case 'add':
            var f = params.fields || {};
            var last = state.tasks[state.tasks.length - 1];
            var nextNo = (last && Number(last['No'])) ? Number(last['No']) + 1 : 1;
            f['No'] = nextNo;
            if (!f['Task-ID']) f['Task-ID'] = 'Task-' + pad3(nextNo);
            var newRow = last ? last.row + 1 : 2;
            state.tasks.push(Object.assign({ row: newRow }, f));
            result.row = newRow;
            break;
          case 'update':
            for (var i = 0; i < state.tasks.length; i++) {
              if (state.tasks[i].row === Number(params.row)) {
                Object.keys(params.fields || {}).forEach(function (k) {
                  state.tasks[i][k] = params.fields[k];
                });
              }
            }
            break;
          case 'delete':
            state.tasks = state.tasks.filter(function (t) { return t.row !== Number(params.row); });
            break;
          case 'addOrg':
            var orgName = String(params.name || '').trim();
            var lastOrg = state.organizations[state.organizations.length - 1];
            var nextNo = lastOrg ? Number(lastOrg.No) + 1 : 1;
            var orgRow = lastOrg ? lastOrg.row + 1 : 2;
            state.organizations.push({ row: orgRow, No: nextNo, Name: orgName });
            result = { ok: true, row: orgRow, No: nextNo, Name: orgName };
            break;
          case 'updateOrg':
            state.organizations.forEach(function (o) {
              if (o.row === Number(params.row)) o.Name = String(params.name || '').trim();
            });
            break;
          case 'deleteOrg':
            state.organizations = state.organizations.filter(function (o) { return o.row !== Number(params.row); });
            break;
          case 'backup':
            var bakName = demoBackupName();
            if (state.backups.indexOf(bakName) !== -1 && !params.force) {
              result = { ok: true, needConfirm: true, backup: bakName };
              break;
            }
            if (state.backups.indexOf(bakName) === -1) state.backups.push(bakName);
            result = { ok: true, backup: bakName };
            break;
          case 'listBackups':
            result = { ok: true, backups: state.backups.slice().sort().reverse() };
            break;
          case 'restore':
            var chosenName = String(params.name || '').trim();
            var bakName2 = demoBackupName();
            if (state.backups.indexOf(bakName2) !== -1 && !params.force) {
              result = { ok: true, needConfirm: true, backup: bakName2 };
              break;
            }
            if (state.backups.indexOf(bakName2) === -1) state.backups.push(bakName2);
            result = { ok: true, restored: chosenName, backup: bakName2 };
            break;
          case 'wipe':
            var bakName3 = demoBackupName();
            if (state.backups.indexOf(bakName3) !== -1 && !params.force) {
              result = { ok: true, needConfirm: true, backup: bakName3 };
              break;
            }
            if (state.backups.indexOf(bakName3) === -1) state.backups.push(bakName3);
            state.tasks = [];
            result = { ok: true, backup: bakName3 };
            break;
          case 'ping':
            result.message = 'Demo backend responding.';
            result.sheet = 'Task (demo)';
            break;
          default:
            result = { ok: false, error: 'Unknown action: ' + action };
        }
        resolve(result);
      }, 120);
    });
  }

  /* ---------------- config ---------------- */

  function normalizeSheetUrl(url) {
    var u = String(url || '').trim();
    var m = /\/spreadsheets\/d\/([\w-]+)/.exec(u);
    if (m) return 'https://docs.google.com/spreadsheets/d/' + m[1];
    return u.replace(/\/edit.*$/, '').replace(/\/$/, '');
  }

  function loadConfig() {
    config.baseUrl = (localStorage.getItem(LS_API) || '').trim().replace(/\/+$/, '');
    var storedSheet = localStorage.getItem(LS_SHEET);
    // null = never configured -> use the bundled default sheet URL.
    // ""   = explicitly cleared   -> demo mode.
    config.sheetUrl = storedSheet === null
      ? DEFAULT_SHEET
      : normalizeSheetUrl(storedSheet);
    resolveMode();
  }

  function resolveMode() {
    config.mode = config.baseUrl ? 'api' : (config.sheetUrl ? 'read' : 'demo');
  }

  function setApiUrl(url) {
    config.baseUrl = (url || '').trim().replace(/\/+$/, '');
    if (config.baseUrl) localStorage.setItem(LS_API, config.baseUrl);
    else localStorage.removeItem(LS_API);
    resolveMode();
  }

  function setSheetUrl(url) {
    var cleaned = (url || '').trim() ? normalizeSheetUrl(url) : '';
    config.sheetUrl = cleaned;
    localStorage.setItem(LS_SHEET, cleaned);
    resolveMode();
  }

  function getMode() { return config.mode; }
  function isDemo() { return config.mode === 'demo'; }
  function canWrite() { return config.mode === 'api'; }
  function getBaseUrl() { return config.baseUrl; }
  function getSheetUrl() { return config.sheetUrl; }

  /* ---------------- local cache ---------------- */

  function cacheKey() {
    return [config.mode, config.baseUrl, config.sheetUrl].join('|');
  }

  function getCached() {
    try {
      var raw = localStorage.getItem(LS_CACHE);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || entry.key !== cacheKey()) return null;
      if (Date.now() - (entry.ts || 0) > CACHE_TTL) return null;
      return entry.data || null;
    } catch (e) {
      return null;
    }
  }

  function setCached(data) {
    try {
      localStorage.setItem(LS_CACHE, JSON.stringify({
        key: cacheKey(),
        ts: Date.now(),
        data: data
      }));
    } catch (e) { /* storage full / unavailable - ignore */ }
  }

  function clearCached() {
    try { localStorage.removeItem(LS_CACHE); } catch (e) { /* ignore */ }
  }

  /* ---------------- Apps Script API ---------------- */

  function apiCall(action, params, method) {
    var url = config.baseUrl + '?action=' + encodeURIComponent(action);
    if (method === 'GET' || action === 'init' || action === 'tasks' || action === 'options' || action === 'ping') {
      return fetch(url + buildQs(params), { method: 'GET', mode: 'cors' })
        .then(function (res) { return res.json(); })
        .catch(function (err) { return { ok: false, error: 'Network error: ' + err.message }; });
    }
    return fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(params)
    })
      .then(function (res) { return res.json(); })
      .catch(function (err) { return { ok: false, error: 'Network error: ' + err.message }; });
  }

  /* ---------------- live sheet (gviz) ---------------- */

  function readCall(action, params) {
    switch (action) {
      case 'init':
      case 'options':
      case 'tasks':
      case 'orgs':
      case 'ping':
        return readSheetPayload();
      default:
        return Promise.resolve({
          ok: false,
          error: 'View-only mode (live Google Sheet). To add / edit / delete, deploy and connect the Apps Script backend in Settings.'
        });
    }
  }

  function readSheetPayload() {
    return Promise.all([fetchGviz(''), fetchGviz('Organization')])
      .then(function (results) {
        var taskG = results[0];
        var orgG = results[1];
        var tasks = taskG.rows;
        var columns = taskG.cols;
        var orgs = orgG && orgG.rows.length
          ? orgG.rows.map(function (r, i) {
              return { row: i + 2, No: r.No || '', Name: String(r.Name || '').trim() };
            }).filter(function (o) { return o.Name; })
          : [];
        if (!orgs.length) {
          orgs = unique(tasks.map(function (t) { return t.Organization; }).filter(Boolean))
            .map(function (name, i) { return { row: i + 2, No: i + 1, Name: name }; });
        }
        return {
          ok: true,
          sheet: 'Task (live)',
          columns: columns,
          tasks: tasks,
          options: {
            purpose: unique(tasks.map(function (t) { return t.Purpose; }).filter(Boolean)),
            pic: unique(tasks.map(function (t) { return t.PIC; }).filter(Boolean)),
            status: unique(tasks.map(function (t) { return t.Status; }).filter(Boolean))
          },
          organizations: orgs
        };
      })
      .catch(function (err) {
        return { ok: false, error: 'Could not read the live sheet: ' + err.message };
      });
  }

  function fetchGviz(sheetName) {
    var url = config.sheetUrl + '/gviz/tq?tqx=out:json';
    if (sheetName) url += '&sheet=' + encodeURIComponent(sheetName);
    return fetch(url, { mode: 'cors' })
      .then(function (res) { return res.text(); })
      .then(parseGviz);
  }

  function parseGviz(text) {
    var s = String(text || '').trim();
    s = s.replace(/^\/\*O_o\*\//, '');
    s = s.trim();
    s = s.replace(/^google\.visualization\.Query\.setResponse\(/, '');
    s = s.replace(/\);\s*$/, '');
    var data = JSON.parse(s);
    var rawCols = data.table.cols.map(function (c) { return c.label || ''; });
    var cols = [];
    var colIdx = [];
    for (var i = 0; i < rawCols.length; i++) {
      if (rawCols[i]) { colIdx.push(i); cols.push(rawCols[i]); }
    }
    var rows = data.table.rows.map(function (r) {
      var obj = {};
      colIdx.forEach(function (ci, j) {
        var cell = (r.c && r.c[ci]) ? r.c[ci] : {};
        obj[cols[j]] = normalizeGvizVal(cell.v);
      });
      return obj;
    });
    rows = rows.filter(function (o) {
      return cols.some(function (c) { return o[c] !== '' && o[c] !== null && o[c] !== undefined; });
    });
    return { cols: cols, rows: rows };
  }

  function normalizeGvizVal(v) {
    if (typeof v === 'string') {
      var m = /^Date\((\d+),(\d+),(\d+)\)$/.exec(v);
      if (m) return m[1] + '-' + pad2(Number(m[2]) + 1) + '-' + pad2(Number(m[3]));
      return v;
    }
    return (v === null || v === undefined) ? '' : v;
  }

  /* ---------------- utils ---------------- */

  function buildQs(params) {
    var parts = [];
    Object.keys(params).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null) {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      }
    });
    return parts.length ? '&' + parts.join('&') : '';
  }

  function call(action, params, method) {
    params = params || {};
    if (config.mode === 'demo') return demo(action, params);
    if (config.mode === 'api') return apiCall(action, params, method);
    return readCall(action, params);
  }

  function clone(arr) { return JSON.parse(JSON.stringify(arr)); }

  function unique(arr) {
    var seen = {};
    var out = [];
    arr.forEach(function (v) {
      var key = String(v || '');
      if (key && !seen[key]) { seen[key] = true; out.push(v); }
    });
    return out;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function pad3(n) { return (n < 100 ? (n < 10 ? '00' : '0') : '') + n; }

  function demoBackupName() {
    var now = new Date();
    var dd = pad2(now.getDate());
    var mm = pad2(now.getMonth() + 1);
    var yy = String(now.getFullYear()).slice(-2);
    return 'TaskBAK-' + dd + '-' + mm + '-' + yy;
  }

  seedDemo();

  return {
    loadConfig: loadConfig,
    getMode: getMode,
    isDemo: isDemo,
    canWrite: canWrite,
    getBaseUrl: getBaseUrl,
    getSheetUrl: getSheetUrl,
    setApiUrl: setApiUrl,
    setSheetUrl: setSheetUrl,
    call: call,
    getCached: getCached,
    setCached: setCached,
    clearCached: clearCached,
    getState: function () { return state; }
  };
})();
