/* Project S - application logic. */
(function () {
  var App = {
    state: {
      tasks: [],
      columns: [],
      options: { purpose: [], pic: [], status: [] },
      organizations: [],
      currentView: 'dashboard',
      filter: 'All',
      search: '',
      editingRow: null
    },

    els: {},

    STATUS_COLORS: {
      'new':          { bg: '#eff6ff', fg: '#1d4ed8', bar: '#3b82f6', card: '#3b82f6' },
      'not started':  { bg: '#f1f5f9', fg: '#475569', bar: '#94a3b8', card: '#64748b' },
      'in-progress':  { bg: '#fffbeb', fg: '#b45309', bar: '#f59e0b', card: '#f59e0b' },
      'in progress':  { bg: '#fffbeb', fg: '#b45309', bar: '#f59e0b', card: '#f59e0b' },
      'on hold':      { bg: '#f5f3ff', fg: '#6d28d9', bar: '#8b5cf6', card: '#8b5cf6' },
      'done':         { bg: '#ecfdf5', fg: '#047857', bar: '#10b981', card: '#10b981' },
      'completed':    { bg: '#ecfdf5', fg: '#047857', bar: '#10b981', card: '#10b981' },
      'cancelled':    { bg: '#fef2f2', fg: '#b91c1c', bar: '#ef4444', card: '#ef4444' },
      'in review':    { bg: '#fdf2f8', fg: '#be185d', bar: '#ec4899', card: '#ec4899' }
    },
    FALLBACK_COLORS: [
      { bg: '#f1f5f9', fg: '#334155', bar: '#64748b', card: '#64748b' },
      { bg: '#eff6ff', fg: '#1d4ed8', bar: '#3b82f6', card: '#3b82f6' },
      { bg: '#ecfdf5', fg: '#047857', bar: '#10b981', card: '#10b981' },
      { bg: '#fffbeb', fg: '#b45309', bar: '#f59e0b', card: '#f59e0b' }
    ],

    MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    /* ---------------- init ---------------- */

    init: function () {
      var self = this;
      this.els = {
        connDot: document.getElementById('connDot'),
        dashTotal: document.getElementById('dashTotal'),
        statusCards: document.getElementById('statusCards'),
        statusBars: document.getElementById('statusBars'),
        searchInput: document.getElementById('searchInput'),
        filterToggle: document.getElementById('filterToggle'),
        filterChips: document.getElementById('filterChips'),
        taskList: document.getElementById('taskList'),
        emptyState: document.getElementById('emptyState'),
        demoBanner: document.getElementById('demoBanner'),
        orgSearch: document.getElementById('orgSearch'),
        addOrgBtn: document.getElementById('addOrgBtn'),
        orgList: document.getElementById('orgList'),
        orgEmpty: document.getElementById('orgEmpty'),
        sheetUrl: document.getElementById('sheetUrl'),
        apiUrl: document.getElementById('apiUrl'),
        testBtn: document.getElementById('testBtn'),
        saveBtn: document.getElementById('saveBtn'),
        connStatus: document.getElementById('connStatus'),
        aboutText: document.getElementById('aboutText'),
        fab: document.getElementById('fab'),
        taskModal: document.getElementById('taskModal'),
        confirmModal: document.getElementById('confirmModal'),
        formTitle: document.getElementById('formTitle'),
        formSubmit: document.getElementById('formSubmit'),
        confirmDelete: document.getElementById('confirmDelete'),
        confirmText: document.getElementById('confirmText'),
        fNo: document.getElementById('fNo'),
        fTaskID: document.getElementById('fTaskID'),
        fDate: document.getElementById('fDate'),
        fDue: document.getElementById('fDue'),
        fDateHint: document.getElementById('fDateHint'),
        fDueHint: document.getElementById('fDueHint'),
        fPurpose: document.getElementById('fPurpose'),
        fPIC: document.getElementById('fPIC'),
        fOrg: document.getElementById('fOrg'),
        orgDatalist: document.getElementById('orgDatalist'),
        fValue: document.getElementById('fValue'),
        fStatus: document.getElementById('fStatus'),
        fDuration: document.getElementById('fDuration'),
        fTask: document.getElementById('fTask'),
        fNote: document.getElementById('fNote'),
        fInternal: document.getElementById('fInternal'),
        orgModal: document.getElementById('orgModal'),
        orgFormTitle: document.getElementById('orgFormTitle'),
        fOrgName: document.getElementById('fOrgName'),
        orgFormSubmit: document.getElementById('orgFormSubmit'),
        confirmTitle: document.getElementById('confirmTitle'),
        toast: document.getElementById('toast')
      };

      ProjectS.loadConfig();
      this.els.sheetUrl.value = ProjectS.getSheetUrl();
      this.els.apiUrl.value = ProjectS.getBaseUrl();
      this.bindEvents();

      this.refresh();
    },

    /* ---------------- events ---------------- */

    bindEvents: function () {
      var self = this;

      document.querySelectorAll('.nav-item').forEach(function (btn) {
        btn.addEventListener('click', function () { self.switchView(btn.getAttribute('data-view')); });
      });

      this.els.fab.addEventListener('click', function () { self.openForm(); });

      this.els.searchInput.addEventListener('input', function () {
        self.state.search = self.els.searchInput.value.trim().toLowerCase();
        self.renderTasks();
      });

      this.els.filterToggle.addEventListener('click', function () {
        self.els.filterChips.classList.toggle('hidden');
      });

      this.els.saveBtn.addEventListener('click', function () { self.saveConfig(); });
      this.els.testBtn.addEventListener('click', function () { self.testConnection(); });

      this.els.orgSearch.addEventListener('input', function () { self.renderOrganizations(); });
      this.els.addOrgBtn.addEventListener('click', function () { self.openOrgForm(); });
      this.els.orgFormSubmit.addEventListener('click', function () { self.saveOrg(); });
      this.els.fOrgName.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') self.saveOrg();
      });
      this.els.orgModal.addEventListener('click', function (e) {
        if (e.target === self.els.orgModal) self.closeModal('orgModal');
      });

      document.querySelectorAll('[data-close]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          self.closeModal(btn.getAttribute('data-close'));
        });
      });

      this.els.taskModal.addEventListener('click', function (e) {
        if (e.target === self.els.taskModal) self.closeModal('taskModal');
      });
      this.els.confirmModal.addEventListener('click', function (e) {
        if (e.target === self.els.confirmModal) self.closeModal('confirmModal');
      });

      this.els.formSubmit.addEventListener('click', function () { self.saveTask(); });
      this.els.confirmDelete.addEventListener('click', function () { self.confirmDeleteAction(); });

      this.els.fDate.addEventListener('input', function () { self.syncDateHint('fDate', 'fDateHint'); });
      this.els.fDue.addEventListener('input', function () { self.syncDateHint('fDue', 'fDueHint'); });

      this.els.fValue.addEventListener('input', function () { self.formatValueOnInput(); });
      this.els.fValue.addEventListener('blur', function () { self.formatValueOnBlur(); });

      this.els.fStatus.addEventListener('change', function () { self.styleStatusField(); });

      this.els.apiUrl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') self.saveConfig();
      });
      this.els.sheetUrl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') self.saveConfig();
      });
    },

    switchView: function (name) {
      this.state.currentView = name;
      document.querySelectorAll('.view').forEach(function (v) {
        v.classList.remove('active');
        if (v.id === 'view-' + name) v.classList.add('active');
      });
      document.querySelectorAll('.nav-item').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-view') === name);
      });
      if (name === 'dashboard') this.renderDashboard();
      if (name === 'tasks') this.renderTasks();
      if (name === 'organizations') this.renderOrganizations();
    },

    applyStatusFilter: function (status) {
      this.state.filter = status;
      this.els.filterChips.classList.remove('hidden');
      this.switchView('tasks');
    },

    /* ---------------- data ---------------- */

    refresh: function () {
      var self = this;
      this.setConnDot();
      this.renderBanner();
      ProjectS.call('init').then(function (res) {
        if (!res.ok) {
          self.toast(res.error || 'Failed to load data', true);
          self.setConnDot('offline');
          return;
        }
        self.state.columns = res.columns || [];
        self.state.tasks = res.tasks || [];
        self.state.options = {
          purpose: res.options && res.options.purpose ? res.options.purpose : [],
          pic: res.options && res.options.pic ? res.options.pic : [],
          status: res.options && res.options.status ? res.options.status : []
        };
        self.state.organizations = res.organizations || [];
        self.populateFormOptions();
        self.renderAll();
      });
    },

    organizationNames: function () {
      return this.state.organizations.map(function (o) { return o.Name; }).filter(Boolean);
    },

    populateFormOptions: function () {
      this.fillSelect(this.els.fPurpose, this.state.options.purpose, '-- Select Purpose --');
      this.fillSelect(this.els.fPIC, this.state.options.pic, '-- Select PIC --');
      this.fillSelect(this.els.fStatus, this.state.options.status, '-- Select Status --');
      var self = this;
      this.els.orgDatalist.innerHTML = this.organizationNames()
        .map(function (o) { return '<option value="' + escapeHtml(o) + '"></option>'; })
        .join('');
    },

    fillSelect: function (select, items, placeholder) {
      var self = this;
      var html = placeholder ? '<option value="">' + placeholder + '</option>' : '';
      items.forEach(function (it) {
        if (select === self.els.fStatus) {
          var c = self.statusColor(it);
          html += '<option value="' + escapeHtml(it) + '" style="color:' + c.fg + ';font-weight:600;">' + escapeHtml(it) + '</option>';
        } else {
          html += '<option value="' + escapeHtml(it) + '">' + escapeHtml(it) + '</option>';
        }
      });
      select.innerHTML = html;
    },

    /* ---------------- rendering ---------------- */

    renderAll: function () {
      this.renderBanner();
      this.renderDashboard();
      this.renderTasks();
      this.renderOrganizations();
      this.styleStatusField();
    },

    renderBanner: function () {
      var mode = ProjectS.getMode();
      var msg = '';
      if (mode === 'demo') {
        msg = 'Demo mode - showing sample data. Connect your Google Sheet URL in Settings for live data.';
        this.els.demoBanner.classList.remove('hidden');
      } else if (mode === 'read') {
        msg = 'Connected to the live Google Sheet (view-only). To add / edit / delete, connect the Apps Script backend in Settings.';
        this.els.demoBanner.classList.remove('hidden');
      } else {
        this.els.demoBanner.classList.add('hidden');
      }
      this.els.demoBanner.textContent = msg;
      this.els.aboutText.innerHTML = 'Project S is a task data entry app backed by a Google Sheet.' +
        ' <b>' + this.modeLabel() + '</b>' +
        (ProjectS.canWrite() ? '' : ' (editing needs the Apps Script backend).');
    },

    modeLabel: function () {
      switch (ProjectS.getMode()) {
        case 'api': return 'Connected: live read / write.';
        case 'read': return 'Connected: live sheet (view-only).';
        default: return 'Running in demo mode with sample data.';
      }
    },

    setConnDot: function () {
      this.els.connDot.classList.remove('online', 'offline');
      var mode = ProjectS.getMode();
      if (mode === 'api' || mode === 'read') this.els.connDot.classList.add('online');
      else if (mode === 'offline') this.els.connDot.classList.add('offline');
      else this.els.connDot.style.background = '#f59e0b';
    },

    statusColor: function (status) {
      var key = String(status || '').trim().toLowerCase();
      if (this.STATUS_COLORS[key]) return this.STATUS_COLORS[key];
      var hash = 0;
      for (var i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
      return this.FALLBACK_COLORS[hash % this.FALLBACK_COLORS.length];
    },

    statusCounts: function () {
      var counts = {};
      this.state.tasks.forEach(function (t) {
        var s = String(t.Status || '').trim() || 'Unassigned';
        counts[s] = (counts[s] || 0) + 1;
      });
      return counts;
    },

    renderDashboard: function () {
      var self = this;
      var counts = this.statusCounts();
      var total = this.state.tasks.length;
      this.els.dashTotal.textContent = total.toLocaleString();

      var statusNames = this.state.options.status.length ? this.state.options.status.slice() : Object.keys(counts);
      var all = statusNames.concat(Object.keys(counts).filter(function (s) { return statusNames.indexOf(s) === -1; }));

      var cardsHtml = '';
      all.forEach(function (s) {
        var c = self.statusColor(s);
        var n = counts[s] || 0;
        cardsHtml += '<div class="status-card" data-status="' + escapeHtml(s) + '" style="--sc:' + c.card + '">' +
          '<div class="sc-count">' + n.toLocaleString() + '</div>' +
          '<div class="sc-label">' + escapeHtml(s) + '</div>' +
          '<div class="sc-go">Tap to view</div>' +
          '</div>';
      });
      this.els.statusCards.innerHTML = cardsHtml;

      this.els.statusCards.querySelectorAll('.status-card').forEach(function (card) {
        card.addEventListener('click', function () {
          self.applyStatusFilter(card.getAttribute('data-status'));
        });
      });

      var barsHtml = '';
      var max = Math.max(1, Math.max.apply(null, all.map(function (s) { return counts[s] || 0; })));
      all.forEach(function (s) {
        var c = self.statusColor(s);
        var n = counts[s] || 0;
        var pct = Math.round((n / max) * 100);
        barsHtml += '<div class="sb-row" data-status="' + escapeHtml(s) + '">' +
          '<div class="sb-label">' + escapeHtml(s) + '</div>' +
          '<div class="sb-track"><div class="sb-fill" style="--sc:' + c.bar + ';width:' + pct + '%"></div></div>' +
          '<div class="sb-count">' + n.toLocaleString() + '</div></div>';
      });
      this.els.statusBars.innerHTML = barsHtml;

      this.els.statusBars.querySelectorAll('.sb-row').forEach(function (row) {
        row.addEventListener('click', function () {
          self.applyStatusFilter(row.getAttribute('data-status'));
        });
      });
    },

    renderChips: function () {
      var self = this;
      var counts = this.statusCounts();
      var statusNames = this.state.options.status.length ? this.state.options.status.slice() : Object.keys(counts);
      var all = ['All'].concat(statusNames).concat(
        Object.keys(counts).filter(function (s) { return statusNames.indexOf(s) === -1 && s !== 'All'; })
      );

      this.els.filterChips.innerHTML = all.map(function (s) {
        var c = self.statusColor(s);
        var isActive = self.state.filter === s;
        var style = isActive
          ? 'style="--chip-bg:' + c.bg + ';--chip-fg:' + c.fg + '"'
          : '';
        var count = s === 'All' ? self.state.tasks.length : (counts[s] || 0);
        return '<button class="chip' + (isActive ? ' active' : '') + '" data-status="' + escapeHtml(s) + '" ' + style + '>' +
          escapeHtml(s) + ' (' + count.toLocaleString() + ')</button>';
      }).join('');

      this.els.filterChips.querySelectorAll('.chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          self.state.filter = chip.getAttribute('data-status');
          self.renderChips();
          self.renderTasks();
        });
      });
    },

    renderTasks: function () {
      this.renderChips();

      var self = this;
      var filtered = this.state.tasks.filter(function (t) {
        if (self.state.filter !== 'All' && String(t.Status || '').trim() !== self.state.filter) return false;
        if (!self.state.search) return true;
        var hay = [t['Task name'], t['Task-ID'], t.Date, t['Due Date'], t.Purpose, t.PIC, t.Organization, t.Status, t.Note]
          .join(' ').toLowerCase();
        return hay.indexOf(self.state.search) !== -1;
      });

      this.els.emptyState.classList.toggle('hidden', filtered.length > 0);
      this.els.taskList.innerHTML = filtered.map(function (t) {
        return self.taskCard(t);
      }).join('');

      this.els.taskList.querySelectorAll('.row-btn.edit').forEach(function (b) {
        b.addEventListener('click', function () {
          self.openForm(Number(b.getAttribute('data-row')));
        });
      });
      this.els.taskList.querySelectorAll('.row-btn.del').forEach(function (b) {
        b.addEventListener('click', function () {
          self.openDelete(Number(b.getAttribute('data-row')));
        });
      });
    },

    taskCard: function (t) {
      var self = this;
      var c = this.statusColor(t.Status);
      var value = this.formatValue(t.Value);
      var overdue = this.isOverdue(t);
      var dueDate = t['Due Date'] ? '<span class="due-date' + (overdue ? ' overdue' : '') + '">' + (overdue ? 'Overdue ' : '') + this.fmtDate(t['Due Date']) + '</span>' : '';
      var note = t.Note ? metaTag('note', t.Note) : '';
      var internal = t.Internal ? metaTag('internal', 'Internal') : '';

      return '<div class="task-card" style="--sc:' + c.card + '">' +
        '<div class="task-main">' +
          '<div class="task-left">' +
            '<div class="task-date">' + (t['Task-ID'] ? escapeHtml(t['Task-ID']) + '  /  ' : '') + this.fmtDate(t.Date) + (t['Due Date'] ? '  /  Due ' + this.fmtDate(t['Due Date']) : '') + '</div>' +
            '<div class="task-title">' + escapeHtml(t['Task name'] || '-') + '</div>' +
          '</div>' +
          '<div class="task-right">' +
            (value ? '<span class="task-value">' + value + '</span>' : '') +
            '<span class="badge" style="--sc:' + c.card + ';--badge-fg:#fff">' + escapeHtml(t.Status || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="task-meta">' +
          metaTag('user', t.PIC) +
          metaTag('org', t.Organization) +
          metaTag('tag', t.Purpose) +
          note + internal +
        '</div>' +
        '<div class="task-actions">' +
          '<button class="row-btn edit" data-row="' + t.row + '">' + svgIcon('pencil') + 'Edit</button>' +
          '<button class="row-btn del" data-row="' + t.row + '">' + svgIcon('trash') + 'Delete</button>' +
        '</div>' +
      '</div>';
    },

    isOverdue: function (t) {
      if (!t['Due Date']) return false;
      var s = String(t.Status || '').toLowerCase();
      if (s === 'done' || s === 'completed' || s === 'cancelled') return false;
      var d = new Date(t['Due Date'] + 'T23:59:59');
      if (isNaN(d)) return false;
      return d.getTime() < Date.now();
    },

    /* ---------------- organisations ---------------- */

    renderOrganizations: function () {
      var self = this;
      var q = (this.els.orgSearch.value || '').trim().toLowerCase();
      var list = this.state.organizations.filter(function (o) {
        return !q || String(o.Name).toLowerCase().indexOf(q) !== -1;
      });

      this.els.orgEmpty.classList.toggle('hidden', list.length > 0);

      var html = list.map(function (o) {
        var initial = (o.Name || '?').trim().charAt(0).toUpperCase();
        return '<div class="org-item">' +
          '<div class="org-info">' +
            '<div class="org-badge">' + escapeHtml(initial) + '</div>' +
            '<div>' +
              '<div class="org-name">' + escapeHtml(o.Name) + '</div>' +
              '<div class="org-meta">No ' + escapeHtml(String(o.No !== '' && o.No !== undefined ? o.No : '-')) + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="org-actions">' +
            '<button class="row-btn edit" data-row="' + o.row + '" data-name="' + escapeHtml(o.Name) + '">' + svgIcon('pencil') + 'Edit</button>' +
            '<button class="row-btn del" data-row="' + o.row + '" data-name="' + escapeHtml(o.Name) + '">' + svgIcon('trash') + 'Delete</button>' +
          '</div>' +
        '</div>';
      }).join('');
      this.els.orgList.innerHTML = html;

      this.els.orgList.querySelectorAll('.row-btn.edit').forEach(function (b) {
        b.addEventListener('click', function () {
          self.openOrgForm(Number(b.getAttribute('data-row')), b.getAttribute('data-name'));
        });
      });
      this.els.orgList.querySelectorAll('.row-btn.del').forEach(function (b) {
        b.addEventListener('click', function () {
          self.openOrgDelete(Number(b.getAttribute('data-row')), b.getAttribute('data-name'));
        });
      });
    },

    openOrgForm: function (row, name) {
      var self = this;
      if (!this.guardWrite()) return;
      this.state.editingOrgRow = row || null;
      this.els.orgFormTitle.textContent = row ? 'Edit Organization' : 'Add Organization';
      this.els.fOrgName.value = name || '';
      this.openModal('orgModal');
      setTimeout(function () { self.els.fOrgName.focus(); }, 250);
    },

    saveOrg: function () {
      var self = this;
      if (!this.guardWrite()) return;
      var name = this.els.fOrgName.value.trim();
      if (!name) {
        this.toast('Organization name is required.', true);
        return;
      }
      this.setBusy(true);
      var action = this.state.editingOrgRow ? 'updateOrg' : 'addOrg';
      var params = this.state.editingOrgRow
        ? { action: action, row: this.state.editingOrgRow, name: name }
        : { action: action, name: name };
      ProjectS.call(action, params, 'POST').then(function (res) {
        self.setBusy(false);
        if (!res.ok) {
          self.toast(res.error || 'Save failed', true);
          return;
        }
        self.closeModal('orgModal');
        self.state.editingOrgRow = null;
        self.toast('Organization saved', false, true);
        self.refresh();
      });
    },

    openOrgDelete: function (row, name) {
      if (!this.guardWrite()) return;
      this.state.editingOrgRow = row;
      this.state.deleteKind = 'org';
      this.els.confirmTitle.textContent = 'Delete Organization';
      this.els.confirmText.textContent = 'Delete "' + name + '"? This cannot be undone.';
      this.openModal('confirmModal');
    },

    doDeleteOrg: function () {
      var self = this;
      this.setBusy(true);
      ProjectS.call('deleteOrg', { action: 'deleteOrg', row: this.state.editingOrgRow }, 'POST').then(function (res) {
        self.setBusy(false);
        if (!res.ok) {
          self.toast(res.error || 'Delete failed', true);
          return;
        }
        self.closeModal('confirmModal');
        self.state.editingOrgRow = null;
        self.toast('Organization deleted', false, true);
        self.refresh();
      });
    },

    /* ---------------- formatting ---------------- */

    fmtDate: function (iso) {
      if (!iso) return '';
      var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
      if (m) return m[3] + '-' + this.MONTHS[Number(m[2]) - 1] + '-' + String(Number(m[1]) % 100);
      var d = new Date(iso);
      if (isNaN(d)) return String(iso);
      return ('0' + d.getDate()).slice(-2) + '-' + this.MONTHS[d.getMonth()] + '-' + String(d.getFullYear() % 100);
    },

    formatValue: function (v) {
      var n = Number(v);
      if (v === '' || v === null || v === undefined || isNaN(n)) return '';
      var dec = Number.isInteger(n) ? 0 : 2;
      return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    },

    parseValue: function (str) {
      var cleaned = String(str || '').replace(/[^\d.-]/g, '');
      if (cleaned === '') return '';
      var n = Number(cleaned);
      return isNaN(n) ? '' : n;
    },

    syncDateHint: function (inputId, hintId) {
      var iso = document.getElementById(inputId).value;
      document.getElementById(hintId).textContent = iso ? 'Selected: ' + this.fmtDate(iso) : '';
    },

    formatValueOnInput: function () {
      var raw = this.els.fValue.value.replace(/[^\d.]/g, '');
      this.els.fValue.value = raw;
    },

    formatValueOnBlur: function () {
      var n = this.parseValue(this.els.fValue.value);
      this.els.fValue.value = n === '' ? '' : n.toLocaleString('en-US');
    },

    styleStatusField: function () {
      var s = this.els.fStatus.value;
      if (s) {
        var c = this.statusColor(s);
        this.els.fStatus.style.borderLeft = '4px solid ' + c.card;
        this.els.fStatus.style.color = c.fg;
      } else {
        this.els.fStatus.style.borderLeft = '';
        this.els.fStatus.style.color = '';
      }
    },

    /* ---------------- write guard ---------------- */

    guardWrite: function () {
      if (ProjectS.canWrite()) return true;
      if (ProjectS.getMode() === 'read') {
        this.toast('View-only mode - deploy and connect the Apps Script backend to edit.', true);
        return false;
      }
      return true;
    },

    /* ---------------- form ---------------- */

    openForm: function (row) {
      var self = this;
      if (!this.guardWrite()) return;
      this.state.editingRow = row || null;
      this.els.formTitle.textContent = row ? 'Edit Task' : 'Add Task';
      this.els.formSubmit.textContent = row ? 'Update Task' : 'Save Task';

      var task = row ? this.state.tasks.find(function (t) { return t.row === row; }) : null;

      if (task) {
        this.els.fNo.value = task['No'] !== '' ? String(task['No']) : '';
        this.els.fTaskID.value = task['Task-ID'] || '';
        this.els.fDate.value = task.Date || '';
        this.els.fDue.value = task['Due Date'] || '';
        this.els.fTask.value = task['Task name'] || '';
        this.els.fNote.value = task.Note || '';
        this.els.fDuration.value = task.Duration || '';
        this.els.fValue.value = task.Value !== '' ? Number(task.Value).toLocaleString('en-US') : '';
        this.els.fOrg.value = task.Organization || '';
        this.els.fPurpose.value = task.Purpose || '';
        this.els.fPIC.value = task.PIC || '';
        this.els.fStatus.value = task.Status || '';
        this.els.fInternal.checked = !!task.Internal;
      } else {
        this.autoId();
        this.els.fDate.value = new Date().toISOString().slice(0, 10);
        this.els.fDue.value = '';
        this.els.fTask.value = '';
        this.els.fNote.value = '';
        this.els.fDuration.value = '';
        this.els.fValue.value = '';
        this.els.fOrg.value = '';
        this.els.fPurpose.value = '';
        this.els.fPIC.value = '';
        this.els.fStatus.value = '';
        this.els.fInternal.checked = false;
      }

      this.syncDateHint('fDate', 'fDateHint');
      this.syncDateHint('fDue', 'fDueHint');
      this.styleStatusField();
      this.openModal('taskModal');

      setTimeout(function () {
        if (!task) self.els.fPurpose.focus();
      }, 250);
    },

    autoId: function () {
      var maxNo = 0;
      this.state.tasks.forEach(function (t) {
        var n = Number(t['No']);
        if (!isNaN(n) && n > maxNo) maxNo = n;
      });
      this.els.fNo.value = String(maxNo + 1);
      this.els.fTaskID.value = '';
    },

    saveTask: function () {
      var self = this;
      if (!this.guardWrite()) return;

      var taskName = String(this.els.fTask.value || '').trim();
      var purpose = this.els.fPurpose.value;
      var pic = this.els.fPIC.value;
      var status = this.els.fStatus.value;
      var date = this.els.fDate.value;

      if (!taskName || !purpose || !pic || !status || !date) {
        this.toast('Please fill Date, Purpose, PIC, Status and Task name.', true);
        return;
      }

      var fields = {
        'No': this.parseValue(this.els.fNo.value),
        'Date': date,
        'Due Date': this.els.fDue.value,
        'Purpose': purpose,
        'PIC': pic,
        'Organization': this.els.fOrg.value.trim(),
        'Task name': taskName,
        'Value': this.parseValue(this.els.fValue.value),
        'Note': this.els.fNote.value.trim(),
        'Internal': this.els.fInternal.checked,
        'Status': status
      };

      var duration = this.els.fDuration.value.trim();
      if (this.state.editingRow) {
        var original = this.state.tasks.find(function (t) { return t.row === self.state.editingRow; });
        if (duration !== String((original && original.Duration) || '')) {
          fields['Duration'] = duration;
        }
      } else if (duration) {
        fields['Duration'] = duration;
      }

      var params = this.state.editingRow
        ? { action: 'update', row: this.state.editingRow, fields: fields }
        : { action: 'add', fields: fields };

      this.setBusy(true);
      ProjectS.call(this.state.editingRow ? 'update' : 'add', params, 'POST').then(function (res) {
        self.setBusy(false);
        if (!res.ok) {
          self.toast(res.error || 'Save failed', true);
          return;
        }
        self.closeModal('taskModal');
        self.toast(self.state.editingRow ? 'Task updated' : 'Task added', false, true);
        self.state.editingRow = null;
        self.refresh();
      });
    },

    /* ---------------- delete ---------------- */

    openDelete: function (row) {
      var self = this;
      if (!this.guardWrite()) return;
      var task = this.state.tasks.find(function (t) { return t.row === row; });
      this.state.editingRow = row;
      this.state.deleteKind = 'task';
      this.els.confirmTitle.textContent = 'Delete Task';
      this.els.confirmText.textContent = task
        ? 'Delete "' + task['Task name'] + '"? This cannot be undone.'
        : 'Are you sure you want to delete this task? This cannot be undone.';
      this.openModal('confirmModal');
    },

    confirmDeleteAction: function () {
      if (this.state.deleteKind === 'org') return this.doDeleteOrg();
      return this.doDelete();
    },

    doDelete: function () {
      var self = this;
      var row = this.state.editingRow;
      this.setBusy(true);
      ProjectS.call('delete', { action: 'delete', row: row }, 'POST').then(function (res) {
        self.setBusy(false);
        if (!res.ok) {
          self.toast(res.error || 'Delete failed', true);
          return;
        }
        self.closeModal('confirmModal');
        self.state.editingRow = null;
        self.toast('Task deleted', false, true);
        self.refresh();
      });
    },

    /* ---------------- settings ---------------- */

    saveConfig: function () {
      ProjectS.setSheetUrl(this.els.sheetUrl.value);
      ProjectS.setApiUrl(this.els.apiUrl.value);
      this.els.connStatus.textContent = 'Saving...';
      this.els.connStatus.className = 'conn-status';
      this.testConnection();
    },

    testConnection: function () {
      var self = this;
      ProjectS.setSheetUrl(this.els.sheetUrl.value);
      ProjectS.setApiUrl(this.els.apiUrl.value);

      this.els.connStatus.textContent = 'Testing...';
      this.els.connStatus.className = 'conn-status';
      this.setConnDot();

      ProjectS.call('ping', {}, 'GET').then(function (res) {
        var mode = ProjectS.getMode();
        if (mode === 'api' && res.ok) {
          self.els.connStatus.textContent = 'Connected (read / write). Sheet: ' + (res.sheet || 'Task') + '.';
          self.els.connStatus.className = 'conn-status ok';
        } else if (mode === 'read') {
          self.els.connStatus.textContent = 'Connected to the live Google Sheet (view-only). Add the Apps Script URL for editing.';
          self.els.connStatus.className = 'conn-status ok';
        } else if (mode === 'demo') {
          self.els.connStatus.textContent = 'No connection configured - running in demo mode.';
          self.els.connStatus.className = 'conn-status';
        } else {
          self.els.connStatus.textContent = (res.error || 'Connection failed') + '. Check the URL and that the sheet is shared (Anyone with the link can view).';
          self.els.connStatus.className = 'conn-status err';
        }
        self.setConnDot();
        self.refresh();
      });
    },

    /* ---------------- ui helpers ---------------- */

    openModal: function (id) { document.getElementById(id).classList.add('open'); },
    closeModal: function (id) { document.getElementById(id).classList.remove('open'); },

    setBusy: function (busy) {
      this.els.formSubmit.disabled = busy;
      this.els.confirmDelete.disabled = busy;
      this.els.formSubmit.textContent = busy ? 'Saving...' : (this.state.editingRow ? 'Update Task' : 'Save Task');
      this.els.confirmDelete.textContent = busy ? 'Deleting...' : 'Delete';
    },

    toast: function (msg, isError, isOk) {
      var self = this;
      this.els.toast.textContent = msg;
      this.els.toast.className = 'toast show' + (isError ? ' error' : '') + (isOk ? ' ok' : '');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(function () {
        self.els.toast.classList.remove('show');
      }, 3000);
    }
  };

  function escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function metaTag(kind, value) {
    if (!value) return '';
    var icons = {
      user: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      org: '<path d="M4 21V4h10v3h6v14h-9m0 0h9M8 8h2m-2 4h2m-2 4h2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      tag: '<path d="M20 12l-8 8-9-9V4h7l10 10zM7.5 7.5h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      note: '<path d="M4 5a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zM14 3v6h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      internal: '<path d="M12 2l2.6 2.6 3.7.5.5 3.7L21 11l-2.2 2.2-.5 3.7-3.7.5L12 20l-2.6-2.6-3.7-.5-.5-3.7L3 11l2.2-2.2.5-3.7 3.7-.5L12 2zM9 11.5l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    return '<span class="meta-tag"><svg class="icon" viewBox="0 0 24 24">' +
      (icons[kind] || '') + '</svg>' + escapeHtml(value) + '</span>';
  }

  function svgIcon(name) {
    var paths = {
      pencil: '<path d="M16.9 4.1l3 3L8 19H5v-3L16.9 4.1zM14 6l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    return '<svg class="icon" viewBox="0 0 24 24">' + (paths[name] || '') + '</svg>';
  }

  document.addEventListener('DOMContentLoaded', function () { App.init(); });
})();
