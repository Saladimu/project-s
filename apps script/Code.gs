/**
 * PROJECT S - Google Sheets Backend (Google Apps Script)
 * ======================================================
 *
 * DEPLOYMENT (once):
 *   1. Open your Google Sheet:  Extensions > Apps Script
 *   2. Delete the placeholder code, paste this file, then Save.
 *   3. Deploy > New deployment > Web app
 *        - Description : Project S API
 *        - Execute as  : Me (this is what authorises access to the private sheet)
 *        - Who has access : Anyone
 *   4. Copy the "exec" URL and paste it into the app's Settings page.
 *
 * The script reads the CURRENT dropdown (data validation) settings of the
 * Task sheet for the Purpose / PIC / Status columns, looks up the
 * "Organization" sheet column "Name", and performs add / update / delete.
 */

var CONFIG = {
  TASK_SHEET : '',                 // '' = auto-detect (first sheet with Purpose+PIC headers)
  ORG_SHEET  : 'Organization',     // sheet holding the organisation list
  ORG_COLUMN : 'Name',             // column used for the organisation lookup
  HEADER_ROW : 1,                  // row where column headers live
  FORMULA_COLUMNS : ['Task-ID', 'Duration'],    // columns auto-filled by sheet formulas - never written by the app
  ARRAY_FORMULA_COLUMNS : ['Task-ID']          // array formulas: only ever live in the first data row (e.g. B2) and auto-fill the column
};

/** Date-like header names (stored as real dates in the sheet). */
var DATE_HEADERS = ['date', 'due', 'due date', 'duedate', 'deadline'];

/* ------------------------------------------------------------------ */
/*  HTTP entry points                                                  */
/* ------------------------------------------------------------------ */

function doGet(e) {
  return respond_(handle_(e, false));
}

function doPost(e) {
  return respond_(handle_(e, true));
}

function handle_(e, isPost) {
  var params = {};
  try {
    if (isPost && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (!isPost && e.parameter) {
      params = e.parameter;
    }
  } catch (err) {
    params = {};
  }
  try {
    return route_(params.action || 'init', params);
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

function respond_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/*  Routing                                                            */
/* ------------------------------------------------------------------ */

function route_(action, params) {
  switch (action) {
    case 'init':
    case 'options':
      return initPayload_();

    case 'tasks':
      return { ok: true, tasks: readTasks_() };

    case 'add':
      return addTask_(params);

    case 'update':
      return updateTask_(params);

    case 'delete':
      return deleteTask_(params);

    case 'orgs':
      return { ok: true, organizations: getOrganizations_() };

    case 'addOrg':
      return addOrg_(params);

    case 'updateOrg':
      return updateOrg_(params);

    case 'deleteOrg':
      return deleteOrg_(params);

    case 'backup':
      return backupTaskList_(params);

    case 'listBackups':
      return listBackups_();

    case 'restore':
      return restoreTaskList_(params);

    case 'wipe':
      return wipeTaskList_(params);

    case 'ping':
      return { ok: true, message: 'Project S backend is online.', sheet: getTaskSheet_().getName() };

    default:
      throw new Error('Unknown action: ' + action);
  }
}

function initPayload_() {
  var sheet = getTaskSheet_();
  var headers = getHeaders_(sheet);
  return {
    ok: true,
    sheet: sheet.getName(),
    columns: headers,
    tasks: readTasks_(sheet, headers),
    options: {
      purpose: getDropdown_(sheet, 'Purpose'),
      pic: getDropdown_(sheet, 'PIC'),
      status: getDropdown_(sheet, 'Status')
    },
    organizations: getOrganizations_()
  };
}

/* ------------------------------------------------------------------ */
/*  Task sheet helpers                                                 */
/* ------------------------------------------------------------------ */

function getTaskSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (CONFIG.TASK_SHEET) {
    var named = ss.getSheetByName(CONFIG.TASK_SHEET);
    if (named) return named;
  }
  // Prefer the sheet literally named "TaskList".
  var taskList = ss.getSheetByName('TaskList');
  if (taskList) return taskList;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (isBackupSheetName_(sheets[i].getName())) continue; // never pick a backup copy
    var headerLine = sheets[i].getRange(1, 1, 1, sheets[i].getLastColumn()).getValues()[0].join('|').toLowerCase();
    if (headerLine.indexOf('purpose') !== -1 && headerLine.indexOf('pic') !== -1) {
      return sheets[i];
    }
  }
  throw new Error('TaskList sheet not found. Make sure a sheet named "TaskList" (or CONFIG.TASK_SHEET) exists.');
}

function getHeaders_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  return sheet.getRange(CONFIG.HEADER_ROW, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h || '').trim(); });
}

function readTasks_(sheet, headers) {
  if (!sheet) sheet = getTaskSheet_();
  if (!headers) headers = getHeaders_(sheet);
  var lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.HEADER_ROW) return [];
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  var data = sheet.getRange(CONFIG.HEADER_ROW + 1, 1, lastRow - CONFIG.HEADER_ROW, lastCol).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var obj = { row: CONFIG.HEADER_ROW + 1 + i };
    var hasValue = false;
    for (var c = 0; c < headers.length; c++) {
      var v = normalizeCell_(headers[c], data[i][c]);
      obj[headers[c]] = v;
      if (v !== '' && v !== null && v !== undefined) hasValue = true;
    }
    if (hasValue) out.push(obj);
  }
  return out;
}

function normalizeCell_(header, value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string') {
    var s = value.trim();
    if (s === '') return '';
    if (isDateHeader_(header) && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      var d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return s;
  }
  return value;
}

function isDateHeader_(header) {
  var h = String(header || '').toLowerCase();
  return DATE_HEADERS.indexOf(h) !== -1 || /date/.test(h) || /due/.test(h);
}

function toCellValue_(header, value) {
  if (isDateHeader_(header) && typeof value === 'string' && value) {
    var d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

/* ------------------------------------------------------------------ */
/*  Dropdown (data validation) reading                                 */
/* ------------------------------------------------------------------ */

function getDropdown_(sheet, headerName) {
  var headers = getHeaders_(sheet);
  var idx = headers.indexOf(headerName);
  if (idx === -1) return [];
  var lastRow = Math.max(sheet.getLastRow(), CONFIG.HEADER_ROW + 1);
  lastRow = Math.min(lastRow, CONFIG.HEADER_ROW + 500);
  for (var r = CONFIG.HEADER_ROW + 1; r <= lastRow; r++) {
    var dv = sheet.getRange(r, idx + 1).getDataValidation();
    if (dv) {
      var values = dv.getCriteriaValues();
      if (values && values[0] && values[0].length) {
        return values[0].map(String).filter(function (v) { return v.trim() !== ''; });
      }
    }
  }
  // Fallback: unique cell values already used in the column.
  var seen = {};
  var colVals = sheet.getRange(CONFIG.HEADER_ROW + 1, idx + 1, Math.max(lastRow - CONFIG.HEADER_ROW, 1), 1).getValues();
  for (var i = 0; i < colVals.length; i++) {
    var val = String(colVals[i][0] || '').trim();
    if (val && !seen[val]) seen[val] = true;
  }
  return Object.keys(seen);
}

/* ------------------------------------------------------------------ */
/*  Organisation lookup and maintenance                                */
/* ------------------------------------------------------------------ */

function getOrgSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.ORG_SHEET);
  if (!sheet) {
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) {
      if (/org/i.test(sheets[i].getName())) { sheet = sheets[i]; break; }
    }
  }
  return sheet;
}

function orgLayout_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h || '').trim().toLowerCase(); });
  var nameIdx = headers.indexOf(CONFIG.ORG_COLUMN.toLowerCase());
  var noIdx = headers.indexOf('no');
  return { nameIdx: nameIdx, noIdx: noIdx, size: lastCol };
}

function getOrganizations_() {
  var sheet = getOrgSheet_();
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];
  var layout = orgLayout_(sheet);
  if (layout.nameIdx === -1) return [];
  var out = [];
  for (var r = 2; r <= lastRow; r++) {
    var name = String(sheet.getRange(r, layout.nameIdx + 1).getValue() || '').trim();
    if (!name) continue;
    out.push({
      row: r,
      No: layout.noIdx >= 0 ? sheet.getRange(r, layout.noIdx + 1).getValue() : '',
      Name: name
    });
  }
  return out;
}

function addOrg_(params) {
  var sheet = getOrgSheet_();
  if (!sheet) throw new Error('Organization sheet not found');
  var name = String(params.name || '').trim();
  if (!name) throw new Error('Name is required');
  var layout = orgLayout_(sheet);
  if (layout.nameIdx === -1) throw new Error('Organization sheet needs a "' + CONFIG.ORG_COLUMN + '" column');

  var nextNo = 1;
  if (layout.noIdx >= 0) {
    var lastRow = sheet.getLastRow();
    var maxNo = 0;
    for (var r = 2; r <= lastRow; r++) {
      var n = Number(sheet.getRange(r, layout.noIdx + 1).getValue());
      if (!isNaN(n) && n > maxNo) maxNo = n;
    }
    nextNo = maxNo + 1;
  }

  var row = new Array(layout.size).fill('');
  if (layout.noIdx >= 0) row[layout.noIdx] = nextNo;
  row[layout.nameIdx] = name;
  sheet.appendRow(row);
  return { ok: true, row: sheet.getLastRow(), No: layout.noIdx >= 0 ? nextNo : '', Name: name };
}

function updateOrg_(params) {
  var sheet = getOrgSheet_();
  var rowNum = Number(params.row);
  if (!sheet) throw new Error('Organization sheet not found');
  if (!rowNum || rowNum <= 1) throw new Error('Invalid row');
  var name = String(params.name || '').trim();
  if (!name) throw new Error('Name is required');
  var layout = orgLayout_(sheet);
  if (layout.nameIdx === -1) throw new Error('Organization sheet needs a "' + CONFIG.ORG_COLUMN + '" column');
  sheet.getRange(rowNum, layout.nameIdx + 1).setValue(name);
  return { ok: true };
}

function deleteOrg_(params) {
  var sheet = getOrgSheet_();
  var rowNum = Number(params.row);
  if (!sheet) throw new Error('Organization sheet not found');
  if (!rowNum || rowNum <= 1) throw new Error('Invalid row');
  sheet.deleteRow(rowNum);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  CRUD operations                                                    */
/* ------------------------------------------------------------------ */

function addTask_(params) {
  var sheet = getTaskSheet_();
  var headers = getHeaders_(sheet);
  var fields = params.fields || {};
  var newRow = firstEmptyDataRow_(sheet, headers);
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    if (CONFIG.FORMULA_COLUMNS.indexOf(h) !== -1) continue; // never overwrite formulas
    var val;
    if (h === 'No' && (fields[h] === undefined || fields[h] === '' || fields[h] === null)) {
      val = nextNo_(sheet, headers);
    } else {
      val = toCellValue_(h, fields[h] !== undefined ? fields[h] : '');
    }
    sheet.getRange(newRow, c + 1).setValue(val);
  }
  // Ensure formula columns have formulas on the new row (copied from the row
  // above when available; after a wipe row 2 already carries them).
  copyFormulaColumns_(sheet, headers, newRow);
  return { ok: true, row: newRow };
}

/** Returns the first data row (>= HEADER_ROW + 1) that has no user-entered
 *  values. Rows holding only formula results (Task-ID / Duration) still count
 *  as empty, so after a wipe the first record lands on row 2. */
function firstEmptyDataRow_(sheet, headers) {
  var lastRow = sheet.getLastRow();
  var start = CONFIG.HEADER_ROW + 1;
  for (var r = start; r <= lastRow + 1; r++) {
    var hasData = false;
    for (var c = 0; c < headers.length; c++) {
      if (CONFIG.FORMULA_COLUMNS.indexOf(headers[c]) !== -1) continue;
      var v = sheet.getRange(r, c + 1).getValue();
      if (v !== '' && v !== null && v !== undefined) { hasData = true; break; }
    }
    if (!hasData) return r;
  }
  return lastRow + 1;
}

function nextNo_(sheet, headers) {
  var idx = headers.indexOf('No');
  if (idx === -1) return '';
  var lastRow = sheet.getLastRow();
  var maxNo = 0;
  for (var r = CONFIG.HEADER_ROW + 1; r <= lastRow; r++) {
    var n = Number(sheet.getRange(r, idx + 1).getValue());
    if (!isNaN(n) && n > maxNo) maxNo = n;
  }
  return maxNo + 1;
}

function copyFormulaColumns_(sheet, headers, newRow) {
  if (newRow <= CONFIG.HEADER_ROW + 1) return;
  for (var c = 0; c < headers.length; c++) {
    if (CONFIG.FORMULA_COLUMNS.indexOf(headers[c]) === -1) continue;
    if (CONFIG.ARRAY_FORMULA_COLUMNS.indexOf(headers[c]) !== -1) continue; // array formula lives only in the first data row
    var src = sheet.getRange(newRow - 1, c + 1);
    if (!src.getFormula()) continue;
    // PASTE_FORMULA shifts relative cell references to the destination row,
    // so the copied formula stays dynamic (points at the new row, not the old one).
    src.copyTo(sheet.getRange(newRow, c + 1), SpreadsheetApp.CopyPasteType.PASTE_FORMULA, false);
  }
}

function updateTask_(params) {
  var sheet = getTaskSheet_();
  var rowNum = Number(params.row);
  if (!rowNum || rowNum <= CONFIG.HEADER_ROW) throw new Error('Invalid row number');
  var headers = getHeaders_(sheet);
  var fields = params.fields || {};
  for (var c = 0; c < headers.length; c++) {
    if (CONFIG.FORMULA_COLUMNS.indexOf(headers[c]) !== -1) continue;
    if (fields.hasOwnProperty(headers[c])) {
      sheet.getRange(rowNum, c + 1).setValue(toCellValue_(headers[c], fields[headers[c]]));
    }
  }
  return { ok: true };
}

function deleteTask_(params) {
  var sheet = getTaskSheet_();
  var rowNum = Number(params.row);
  if (!rowNum || rowNum <= CONFIG.HEADER_ROW) throw new Error('Invalid row number');
  sheet.deleteRow(rowNum);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Backup / Restore / Wipe                                            */
/* ------------------------------------------------------------------ */

var BACKUP_PREFIX = 'TaskBAK-';
var BACKUP_RE = /^TaskBAK-\d{2}-\d{2}-\d{2}$/;

function backupSheetName_() {
  var now = new Date();
  var dd = ('0' + now.getDate()).slice(-2);
  var mm = ('0' + (now.getMonth() + 1)).slice(-2);
  var yy = String(now.getFullYear()).slice(-2);
  return BACKUP_PREFIX + dd + '-' + mm + '-' + yy;
}

function isBackupSheetName_(name) {
  return BACKUP_RE.test(String(name || '').trim());
}

/** Returns the exact name of the sheet the app treats as TaskList. */
function getTaskSheetName_() {
  return getTaskListSheetName_();
}

function backupTaskList_(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var src = ss.getSheetByName(getTaskListSheetName_());
  if (!src) throw new Error('TaskList sheet not found');
  var name = backupSheetName_();
  var exists = ss.getSheetByName(name) !== null;
  if (exists && !params.force) {
    return { ok: true, needConfirm: true, backup: name, sheet: src.getName() };
  }
  if (exists) {
    ss.deleteSheet(ss.getSheetByName(name));
  }
  src.copyTo(ss).setName(name);
  return { ok: true, backup: name, sheet: src.getName() };
}

function listBackups_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = [];
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (isBackupSheetName_(sheets[i].getName())) names.push(sheets[i].getName());
  }
  names.sort();
  names.reverse();
  return { ok: true, backups: names };
}

function restoreTaskList_(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var chosen = String(params.name || '').trim();
  if (!chosen) throw new Error('Backup name is required');
  var backupSheet = ss.getSheetByName(chosen);
  if (!backupSheet) throw new Error('Backup not found: ' + chosen);
  if (!isBackupSheetName_(chosen)) throw new Error('Invalid backup name: ' + chosen);

  var targetName = getTaskListSheetName_();
  var current = ss.getSheetByName(targetName);
  if (!current) throw new Error('TaskList sheet not found');

  var headers = getHeaders_(current);

  // Capture the Task-ID (B2) and Duration (L2) formulas that live in the first
  // data row, so they can be brought back after the restore overwrites values.
  var formulaCols = [];
  ['Task-ID', 'Duration'].forEach(function (h) {
    var i = headers.indexOf(h);
    if (i !== -1) formulaCols.push({ col: i, formula: current.getRange(CONFIG.HEADER_ROW + 1, i + 1).getFormula() });
  });

  // Clear the current TaskList data rows first.
  var curLastRow = current.getLastRow();
  var curLastCol = current.getLastColumn();
  if (curLastRow > CONFIG.HEADER_ROW && curLastCol >= 1) {
    current.getRange(CONFIG.HEADER_ROW + 1, 1, curLastRow - CONFIG.HEADER_ROW, curLastCol).clearContent();
  }

  // Copy every cell from the backup sheet into the TaskList sheet.
  var bakLastRow = backupSheet.getLastRow();
  var bakLastCol = backupSheet.getLastColumn();
  if (bakLastRow >= CONFIG.HEADER_ROW && bakLastCol >= 1) {
    var srcRange = backupSheet.getRange(1, 1, bakLastRow, bakLastCol);
    var destRange = current.getRange(1, 1, bakLastRow, bakLastCol);
    srcRange.copyTo(destRange, SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);
  }

  // Re-apply the Task-ID and Duration formulas to the first data row.
  formulaCols.forEach(function (fc) {
    if (fc.formula) current.getRange(CONFIG.HEADER_ROW + 1, fc.col + 1).setFormula(fc.formula);
  });

  // Clear the array-formula column (Task-ID) from row 3 down, so stale values
  // pasted from the backup don't collide with the B2 array formula (#REF!).
  var headers2 = getHeaders_(current);
  var arrCol = -1;
  for (var c = 0; c < headers2.length; c++) {
    if (CONFIG.ARRAY_FORMULA_COLUMNS.indexOf(headers2[c]) !== -1) { arrCol = c; break; }
  }
  var lastRowAfter = current.getLastRow();
  if (arrCol !== -1 && lastRowAfter > CONFIG.HEADER_ROW + 1) {
    current.getRange(CONFIG.HEADER_ROW + 2, arrCol + 1, lastRowAfter - CONFIG.HEADER_ROW - 1).clearContent();
  }

  // Restore the dropdowns so Purpose / PIC / Status stay populated.
  var purposeVals = getDropdown_(backupSheet, 'Purpose');
  var picVals = getDropdown_(backupSheet, 'PIC');
  var statusVals = getDropdown_(backupSheet, 'Status');
  setDropdown_(current, 'Purpose', purposeVals);
  setDropdown_(current, 'PIC', picVals);
  setDropdown_(current, 'Status', statusVals);

  return { ok: true, restored: chosen, sheet: targetName };
}

function wipeTaskList_(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(getTaskListSheetName_());
  if (!sheet) throw new Error('TaskList sheet not found');

  var headers = getHeaders_(sheet);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  // Capture the current dropdown values so they survive the wipe.
  var purposeVals = getDropdown_(sheet, 'Purpose');
  var picVals = getDropdown_(sheet, 'PIC');
  var statusVals = getDropdown_(sheet, 'Status');

  // Capture the Task-ID (B2) and Duration (L2) formulas that live in the first
  // data row of a fresh TaskList, so they can be restored after the content wipe.
  var formulaCols = [];
  ['Task-ID', 'Duration'].forEach(function (h) {
    var i = headers.indexOf(h);
    if (i !== -1) formulaCols.push({ col: i, formula: sheet.getRange(CONFIG.HEADER_ROW + 1, i + 1).getFormula() });
  });

  // Capture the background colours of Task-ID / Purpose / PIC / Duration /
  // Status so the formatting survives the wipe.
  var colorCols = [];
  ['Task-ID', 'Purpose', 'PIC', 'Duration', 'Status'].forEach(function (h) {
    var i = headers.indexOf(h);
    if (i !== -1) colorCols.push(i);
  });
  var colColors = [];
  if (lastRow > CONFIG.HEADER_ROW) {
    colorCols.forEach(function (i) {
      colColors.push({ col: i, colors: sheet.getRange(CONFIG.HEADER_ROW + 1, i + 1, lastRow - CONFIG.HEADER_ROW).getBackgrounds() });
    });
  }

  // Wipe the TaskList sheet: cells from A2 to the end of the data range.
  if (lastRow > CONFIG.HEADER_ROW && lastCol >= 1) {
    sheet.getRange(CONFIG.HEADER_ROW + 1, 1, lastRow - CONFIG.HEADER_ROW, lastCol).clearContent();
  }

  // Re-apply the Task-ID and Duration formulas to the first data row.
  formulaCols.forEach(function (fc) {
    if (fc.formula) sheet.getRange(CONFIG.HEADER_ROW + 1, fc.col + 1).setFormula(fc.formula);
  });

  // Re-apply the captured background colours for the five formatted columns.
  colColors.forEach(function (cc) {
    sheet.getRange(CONFIG.HEADER_ROW + 1, cc.col + 1, cc.colors.length).setBackgrounds(cc.colors);
  });

  // Re-apply the dropdowns so Purpose / PIC / Status stay populated after the wipe.
  setDropdown_(sheet, 'Purpose', purposeVals);
  setDropdown_(sheet, 'PIC', picVals);
  setDropdown_(sheet, 'Status', statusVals);

  return { ok: true, sheet: sheet.getName() };
}

/** Returns the exact name of the live TaskList sheet, or throws.
 *  For backup / restore / wipe we must ALWAYS operate on the sheet literally
 *  named "TaskList" - never header auto-detect, otherwise a backup copy could
 *  be picked and the wrong sheet gets cleared / overwritten. */
function getTaskListSheetName_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = CONFIG.TASK_SHEET ? String(CONFIG.TASK_SHEET).trim() : 'TaskList';
  var byName = ss.getSheetByName(name);
  if (byName) return name;
  throw new Error('TaskList sheet not found. Make sure a sheet named "' + name + '" exists.');
}

function setDropdown_(sheet, headerName, values) {
  if (!values || !values.length) return;
  var headers = getHeaders_(sheet);
  var idx = headers.indexOf(headerName);
  if (idx === -1) return;
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(CONFIG.HEADER_ROW + 1, idx + 1, 500).setDataValidation(rule);
}
