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
  FORMULA_COLUMNS : ['Task-ID', 'Duration']    // columns auto-filled by sheet formulas - never written by the app
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
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var headerLine = sheets[i].getRange(1, 1, 1, sheets[i].getLastColumn()).getValues()[0].join('|').toLowerCase();
    if (headerLine.indexOf('purpose') !== -1 && headerLine.indexOf('pic') !== -1) {
      return sheets[i];
    }
  }
  return sheets[0];
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
  var lastRow = Math.min(sheet.getLastRow(), CONFIG.HEADER_ROW + 500);
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
  var values = headers.map(function (h) {
    if (CONFIG.FORMULA_COLUMNS.indexOf(h) !== -1) return '';
    if (h === 'No' && (fields[h] === undefined || fields[h] === '' || fields[h] === null)) {
      return nextNo_(sheet, headers);
    }
    return toCellValue_(h, fields[h] !== undefined ? fields[h] : '');
  });
  sheet.appendRow(values);
  var newRow = sheet.getLastRow();
  copyFormulaColumns_(sheet, headers, newRow);
  return { ok: true, row: newRow };
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
