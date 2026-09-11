/* Project S - application logic. */
(function () {
  var LS_PWD = 'projects_s_pwd';
  var DEFAULT_PWD = '00000';
  var SETTINGS_IDLE_MS = 5 * 60 * 1000;
  var GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;

  var App = {
    state: {
      tasks: [],
      columns: [],
      options: { purpose: [], pic: [], status: [] },
      organizations: [],
      currentView: 'dashboard',
      filter: 'All',
      internalFilter: 'all',
      search: '',
      valueFilter: { purpose: '', pic: '', organization: '' },
      editingRow: null,
      settingsLocked: false
    },

    els: {},

    STATUS_COLORS: {
      'new':          { bg: '#eff6ff', fg: '#1d4ed8', bar: '#3b82f6', card: '#3b82f6' },
      'not started':  { bg: '#f1f5f9', fg: '#475569', bar: '#94a3b8', card: '#64748b' },
      'in-progress':  { bg: '#fffbeb', fg: '#b45309', bar: '#f59e0b', card: '#f59e0b' },
      'in progress':  { bg: '#fffbeb', fg: '#b45309', bar: '#f59e0b', card: '#f59e0b' },
      'on hold':      { bg: '#f5f3ff', fg: '#6d28d9', bar: '#8b5cf6', card: '#8b5cf6' },
      'hold':         { bg: '#f9f3ee', fg: '#6b3a1f', bar: '#8b5e3c', card: '#8b5e3c' },
      'urgent':       { bg: '#fef2f2', fg: '#b91c1c', bar: '#dc2626', card: '#dc2626' },
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

    STATUS_ICONS: {
      'new': 'i-status-new',
      'not started': 'i-status-clock',
      'in-progress': 'i-status-clock',
      'in progress': 'i-status-clock',
      'on hold': 'i-status-pause',
      'hold': 'i-status-pause',
      'urgent': 'i-status-urgent',
      'done': 'i-status-done',
      'completed': 'i-status-done',
      'cancelled': 'i-status-cancel',
      'in review': 'i-status-clock',
      'unassigned': 'i-status-dot'
    },

    MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

    /* ---------------- init ---------------- */

    init: function () {
      var self = this;
      this.els = {
        connDot: document.getElementById('connDot'),
        refreshBtn: document.getElementById('refreshBtn'),
        themeToggle: document.getElementById('themeToggle'),
        dashTotal: document.getElementById('dashTotal'),
        dashAmount: document.getElementById('dashAmount'),
        statusCards: document.getElementById('statusCards'),
        statusBars: document.getElementById('statusBars'),
        valueFilterToggle: document.getElementById('valueFilterToggle'),
        valueFilterPanel: document.getElementById('valueFilterPanel'),
        valueSum: document.getElementById('valueSum'),
        searchInput: document.getElementById('searchInput'),
        filterToggle: document.getElementById('filterToggle'),
        filterChips: document.getElementById('filterChips'),
        internalFilter: document.getElementById('internalFilter'),
        taskList: document.getElementById('taskList'),
        emptyState: document.getElementById('emptyState'),
        demoBanner: document.getElementById('demoBanner'),
        orgSearch: document.getElementById('orgSearch'),
        addOrgBtn: document.getElementById('addOrgBtn'),
        orgList: document.getElementById('orgList'),
        orgEmpty: document.getElementById('orgEmpty'),
        sheetUrl: document.getElementById('sheetUrl'),
        apiUrl: document.getElementById('apiUrl'),
        connBlock: document.getElementById('connBlock'),
        testBtn: document.getElementById('testBtn'),
        saveBtn: document.getElementById('saveBtn'),
        connStatus: document.getElementById('connStatus'),
        backupBtn: document.getElementById('backupBtn'),
        restoreBtn: document.getElementById('restoreBtn'),
        wipeBtn: document.getElementById('wipeBtn'),
        dbBlock: document.getElementById('dbBlock'),
        dbStatus: document.getElementById('dbStatus'),
        restoreModal: document.getElementById('restoreModal'),
        restoreHint: document.getElementById('restoreHint'),
        backupList: document.getElementById('backupList'),
        backupEmpty: document.getElementById('backupEmpty'),
        secLocked: document.getElementById('secLocked'),
        secUnlocked: document.getElementById('secUnlocked'),
        unlockPwd: document.getElementById('unlockPwd'),
        unlockBtn: document.getElementById('unlockBtn'),
        lockBtn: document.getElementById('lockBtn'),
        oldPwd: document.getElementById('oldPwd'),
        newPwd2: document.getElementById('newPwd2'),
        confirmPwd2: document.getElementById('confirmPwd2'),
        changePwdBtn: document.getElementById('changePwdBtn'),
        pwdBlock: document.getElementById('pwdBlock'),
        aboutText: document.getElementById('aboutText'),
        fab: document.getElementById('fab'),
        taskModal: document.getElementById('taskModal'),
        confirmModal: document.getElementById('confirmModal'),
        formTitle: document.getElementById('formTitle'),
        formSubmit: document.getElementById('formSubmit'),
        confirmDelete: document.getElementById('confirmDelete'),
        confirmText: document.getElementById('confirmText'),
        fTaskID: document.getElementById('fTaskID'),
        fRelate: document.getElementById('fRelate'),
        fDate: document.getElementById('fDate'),
        fDue: document.getElementById('fDue'),
        fDateHint: document.getElementById('fDateHint'),
        fDueHint: document.getElementById('fDueHint'),
        fPurpose: document.getElementById('fPurpose'),
        fPIC: document.getElementById('fPIC'),
        fOrg: document.getElementById('fOrg'),
        fValue: document.getElementById('fValue'),
        fStatus: document.getElementById('fStatus'),
        fDuration: document.getElementById('fDuration'),
        fTask: document.getElementById('fTask'),
        fNote: document.getElementById('fNote'),
        fInternal: document.getElementById('fInternal'),
        orgModal: document.getElementById('orgModal'),
        orgFormTitle: document.getElementById('orgFormTitle'),
        fOrgName: document.getElementById('fOrgName'),
        fOrgNameHint: document.getElementById('fOrgNameHint'),
        fOrgDesc: document.getElementById('fOrgDesc'),
        orgFormSubmit: document.getElementById('orgFormSubmit'),
        confirmTitle: document.getElementById('confirmTitle'),
        toast: document.getElementById('toast')
      };

      ProjectS.loadConfig();
      this.state.settingsLocked = true;
      this.els.sheetUrl.value = '';
      this.els.apiUrl.value = '';
      this.bindEvents();
      this.initTheme();
      this.applySecurityState();
      this.renderInternalFilter();

      this.refresh();
    },

    /* ---------------- theme ---------------- */

    initTheme: function () {
      var self = this;
      var meta = document.querySelector('meta[name="theme-color"]');
      this.syncTheme(meta);
      this.els.themeToggle.addEventListener('click', function () {
        var root = document.documentElement;
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        self.syncTheme(meta);
      });
    },

    syncTheme: function (meta) {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (meta) meta.setAttribute('content', dark ? '#111827' : '#f2f4f9');
      this.els.themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    },

    /* ---------------- events ---------------- */

    bindEvents: function () {
      var self = this;

      document.querySelectorAll('.nav-item').forEach(function (btn) {
        btn.addEventListener('click', function () { self.switchView(btn.getAttribute('data-view')); });
      });

      this.els.fab.addEventListener('click', function () { self.openForm(); });

      var onTaskSearch = debounce(function () {
        self.state.search = self.els.searchInput.value.trim().toLowerCase();
        self.renderTasks();
      }, 150);
      this.els.searchInput.addEventListener('input', onTaskSearch);

      this.els.filterToggle.addEventListener('click', function () {
        self.els.filterChips.classList.toggle('hidden');
      });

      this.els.valueFilterToggle.addEventListener('click', function () {
        self.els.valueFilterPanel.classList.toggle('hidden');
      });

      this.els.saveBtn.addEventListener('click', function () { self.saveConfig(); });
      this.els.testBtn.addEventListener('click', function () { self.testConnection(); });

      this.els.backupBtn.addEventListener('click', function () { self.backupTaskList(); });
      this.els.restoreBtn.addEventListener('click', function () { self.openRestore(); });
      this.els.wipeBtn.addEventListener('click', function () { self.wipeTaskList(); });

      this.els.refreshBtn.addEventListener('click', function () {
        self.manualRefresh();
      });

      this.els.unlockBtn.addEventListener('click', function () { self.unlockSettings(); });
      this.els.lockBtn.addEventListener('click', function () { self.lockSettings(); });
      this.els.changePwdBtn.addEventListener('click', function () { self.changePassword(); });
      this.els.unlockPwd.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') self.unlockSettings();
      });

      this._onSettingsActivity = function () { self.bumpSettingsIdle(); };
      ['pointerdown', 'keydown', 'input', 'touchstart', 'scroll', 'click'].forEach(function (evt) {
        document.addEventListener(evt, self._onSettingsActivity, { passive: true });
      });

      this.els.internalFilter.querySelectorAll('.chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          self.state.internalFilter = chip.getAttribute('data-internal');
          self.renderInternalFilter();
          self.renderTasks();
        });
      });

      var onOrgSearch = debounce(function () { self.renderOrganizations(); }, 150);
      this.els.orgSearch.addEventListener('input', onOrgSearch);

      this.els.taskList.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.row-btn') : null;
        if (!btn || !self.els.taskList.contains(btn)) return;
        var row = Number(btn.getAttribute('data-row'));
        if (btn.classList.contains('edit')) self.openForm(row);
        else if (btn.classList.contains('del')) self.openDelete(row);
      });

      this.els.filterChips.addEventListener('click', function (e) {
        var chip = e.target.closest ? e.target.closest('.chip') : null;
        if (!chip || !self.els.filterChips.contains(chip)) return;
        self.state.filter = chip.getAttribute('data-status');
        self.renderTasks();
      });

      this.els.orgList.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('.row-btn') : null;
        if (!btn || !self.els.orgList.contains(btn)) return;
        var row = Number(btn.getAttribute('data-row'));
        if (btn.classList.contains('edit')) {
          self.openOrgForm(row, btn.getAttribute('data-name'), btn.getAttribute('data-desc'));
        } else if (btn.classList.contains('del')) {
          self.openOrgDelete(row, btn.getAttribute('data-name'));
        }
      });

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

      this.els.restoreModal.addEventListener('click', function (e) {
        if (e.target === self.els.restoreModal) self.closeModal('restoreModal');
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
      this.els.fab.classList.toggle('hidden', name === 'settings' || name === 'organizations');
      if (name === 'settings') this.startSettingsIdleWatch();
      else this.stopSettingsIdleWatch();
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

    refresh: function (force) {
      var self = this;
      this.setConnDot();
      this.renderBanner();

      if (!force) {
        var cached = ProjectS.getCached();
        if (cached && cached.ok) {
          self.applyData(cached);
          if (ProjectS.isCacheFresh()) return;
        }
      }

      ProjectS.call('init').then(function (res) {
        if (!res.ok) {
          if (!ProjectS.getCached()) {
            self.toast(res.error || 'Failed to load data', true);
          }
          self.setConnDot('offline');
          return;
        }
        ProjectS.setCached(res);
        self.applyData(res);
      });
    },

    manualRefresh: function () {
      var self = this;
      if (this._refreshing) return;
      this._refreshing = true;
      this.els.refreshBtn.classList.add('spinning');
      ProjectS.clearCached();
      ProjectS.call('init').then(function (res) {
        self._refreshing = false;
        if (!res.ok) {
          self.els.refreshBtn.classList.remove('spinning');
          self.toast(res.error || 'Failed to load data', true);
          self.setConnDot('offline');
          return;
        }
        ProjectS.setCached(res);
        self.applyData(res);
        window.location.reload();
      });
    },

    applyData: function (res) {
      this.state.columns = res.columns || [];
      this.state.tasks = res.tasks || [];
      this.state.options = {
        purpose: res.options && res.options.purpose ? res.options.purpose : [],
        pic: res.options && res.options.pic ? res.options.pic : [],
        status: res.options && res.options.status ? res.options.status : []
      };
      this.state.organizations = res.organizations || [];
      this.populateFormOptions();
      this.renderAll();
    },

    organizationNames: function () {
      return this.state.organizations.map(function (o) { return o.Name; }).filter(Boolean);
    },

    tasksUsingOrg: function (name) {
      var target = String(name || '').trim().toLowerCase();
      if (!target) return [];
      return this.state.tasks.filter(function (t) {
        return String(t.Organization || '').trim().toLowerCase() === target;
      });
    },

    orgNameExists: function (name, exceptRow) {
      var target = String(name || '').trim().toLowerCase();
      if (!target) return false;
      return this.state.organizations.some(function (o) {
        if (exceptRow && Number(o.row) === Number(exceptRow)) return false;
        return String(o.Name || '').trim().toLowerCase() === target;
      });
    },

    taskIdOptions: function () {
      var seen = {};
      var byId = {};
      this.state.tasks.forEach(function (t) {
        var id = String(t['Task-ID'] || '').trim();
        if (id && !seen[id]) {
          seen[id] = true;
          byId[id] = String(t['Task name'] || '').trim();
        }
      });
      var ids = Object.keys(seen).sort(function (a, b) {
        return a.localeCompare(b, undefined, { numeric: true });
      });
      return ids.map(function (id) {
        return { value: id, label: id + (byId[id] ? '  /  ' + byId[id] : '') };
      });
    },

    populateFormOptions: function () {
      this.fillSelect(this.els.fPurpose, this.state.options.purpose, '-- Select Purpose --');
      this.fillSelect(this.els.fPIC, this.state.options.pic, '-- Select PIC --');
      this.fillSelect(this.els.fStatus, this.state.options.status, '-- Select Status --');
      this.fillSelect(this.els.fOrg, this.organizationNames(), '-- Select Organization --');
      this.fillSelect(this.els.fRelate, this.taskIdOptions(), '-- None --');
    },

    fillSelect: function (select, items, placeholder) {
      var self = this;
      var html = placeholder ? '<option value="">' + placeholder + '</option>' : '';
      items.forEach(function (it) {
        var isObj = it !== null && typeof it === 'object';
        var val = isObj ? it.value : it;
        var label = isObj ? (it.label !== undefined ? it.label : it.value) : it;
        if (select === self.els.fStatus) {
          var c = self.statusColor(val);
          html += '<option value="' + escapeHtml(val) + '" style="color:' + c.fg + ';font-weight:600;">' + escapeHtml(label) + '</option>';
        } else {
          html += '<option value="' + escapeHtml(val) + '">' + escapeHtml(label) + '</option>';
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

    statusIcon: function (status) {
      var key = String(status || '').trim().toLowerCase();
      return this.STATUS_ICONS[key] || 'i-status-dot';
    },

    statusCounts: function () {
      var counts = {};
      this.state.tasks.forEach(function (t) {
        var s = String(t.Status || '').trim() || 'Unassigned';
        counts[s] = (counts[s] || 0) + 1;
      });
      return counts;
    },

    statusSums: function () {
      var sums = {};
      this.state.tasks.forEach(function (t) {
        var s = String(t.Status || '').trim() || 'Unassigned';
        var v = Number(t.Value);
        if (isNaN(v) || t.Value === '' || t.Value === null || t.Value === undefined) return;
        sums[s] = (sums[s] || 0) + v;
      });
      return sums;
    },

    renderDashboard: function () {
      var self = this;
      var counts = this.statusCounts();
      var sums = this.statusSums();
      var total = this.state.tasks.length;
      this.els.dashTotal.textContent = total.toLocaleString();
      var totalAmount = 0;
      this.state.tasks.forEach(function (t) {
        var v = Number(t.Value);
        if (!isNaN(v) && t.Value !== '' && t.Value !== null && t.Value !== undefined) totalAmount += v;
      });
      this.els.dashAmount.textContent = totalAmount.toLocaleString('en-US');

      var statusNames = this.state.options.status.length ? this.state.options.status.slice() : Object.keys(counts);
      var all = statusNames.concat(Object.keys(counts).filter(function (s) { return statusNames.indexOf(s) === -1; }));

      var cardsHtml = '';
      all.forEach(function (s) {
        var c = self.statusColor(s);
        var n = counts[s] || 0;
        var sv = sums[s] || 0;
        cardsHtml += '<div class="status-card" data-status="' + escapeHtml(s) + '" style="--sc:' + c.card + '">' +
          '<div class="sc-top"><div class="sc-count">' + n.toLocaleString() + '</div>' +
          '<div class="sc-value" style="background:' + c.card + ';color:#fff">' + self.formatValue(sv) + '</div></div>' +
          '<div class="sc-label"><svg class="icon sc-icon" aria-hidden="true"><use href="#' + self.statusIcon(s) + '"/></svg><span>' + escapeHtml(s) + '</span></div>' +
          '<div class="sc-go">' + svgIcon('view') + '<span>Tap to view</span></div>' +
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
        barsHtml += '<div class="sb-row" data-status="' + escapeHtml(s) + '" style="--sc:' + c.bar + '">' +
          '<div class="sb-label"><svg class="icon sb-icon" aria-hidden="true"><use href="#' + self.statusIcon(s) + '"/></svg><span>' + escapeHtml(s) + '</span></div>' +
          '<div class="sb-track"><div class="sb-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="sb-count">' + n.toLocaleString() + '</div></div>';
      });
      this.els.statusBars.innerHTML = barsHtml;

      this.els.statusBars.querySelectorAll('.sb-row').forEach(function (row) {
        row.addEventListener('click', function () {
          self.applyStatusFilter(row.getAttribute('data-status'));
        });
      });

      this.renderValueFilter();
    },

    renderValueFilter: function () {
      var self = this;
      var dims = [
        { key: 'purpose', label: 'Purpose', col: 'Purpose', opts: this.state.options.purpose.slice() },
        { key: 'pic', label: 'PIC', col: 'PIC', opts: this.state.options.pic.slice() },
        { key: 'organization', label: 'Organization', col: 'Organization', opts: this.organizationNames() }
      ];

      dims.forEach(function (d) {
        var fromTasks = self.state.tasks.map(function (t) { return t[d.col]; }).filter(Boolean);
        d.opts = unique(d.opts.concat(fromTasks));
      });

      this.els.valueFilterPanel.innerHTML = dims.map(function (d) {
        var chips = ['<button class="chip' + (self.state.valueFilter[d.key] === '' ? ' active' : '') + '" data-dim="' + d.key + '" data-val="">All</button>'];
        d.opts.forEach(function (o) {
          chips.push('<button class="chip' + (self.state.valueFilter[d.key] === o ? ' active' : '') + '" data-dim="' + d.key + '" data-val="' + escapeHtml(o) + '">' + escapeHtml(o) + '</button>');
        });
        return '<div class="vf-row"><span class="vf-label">' + d.label + '</span><div class="chips vf-chips">' + chips.join('') + '</div></div>';
      }).join('');

      this.els.valueFilterPanel.querySelectorAll('.chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
          self.state.valueFilter[chip.getAttribute('data-dim')] = chip.getAttribute('data-val');
          self.renderValueFilter();
          self.renderValueSum();
        });
      });

      this.renderValueSum();
    },

    renderValueSum: function () {
      var self = this;
      var sum = 0;
      this.state.tasks.forEach(function (t) {
        if (self.state.valueFilter.purpose && String(t.Purpose || '') !== self.state.valueFilter.purpose) return;
        if (self.state.valueFilter.pic && String(t.PIC || '') !== self.state.valueFilter.pic) return;
        if (self.state.valueFilter.organization && String(t.Organization || '') !== self.state.valueFilter.organization) return;
        var v = Number(t.Value);
        if (!isNaN(v) && t.Value !== '' && t.Value !== null && t.Value !== undefined) sum += v;
      });
      this.els.valueSum.textContent = sum.toLocaleString('en-US');
    },

    renderInternalFilter: function () {
      var self = this;
      this.els.internalFilter.querySelectorAll('.chip').forEach(function (chip) {
        chip.classList.toggle('active', chip.getAttribute('data-internal') === self.state.internalFilter);
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
    },

    relateColorMap: function () {
      var rowById = {};
      this.state.tasks.forEach(function (t) {
        var id = String(t['Task-ID'] || '').trim();
        if (id) rowById[id] = t.row;
      });

      var parent = {};
      this.state.tasks.forEach(function (t) { parent[t.row] = t.row; });
      function find(x) {
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
      }
      function union(a, b) {
        var ra = find(a), rb = find(b);
        if (ra !== rb) parent[ra] = rb;
      }

      this.state.tasks.forEach(function (t) {
        var rel = String(t['Task Relate'] || '').trim();
        if (rel && rowById[rel] && rowById[rel] !== t.row) union(t.row, rowById[rel]);
      });

      var compSize = {};
      this.state.tasks.forEach(function (t) {
        var r = find(t.row);
        compSize[r] = (compSize[r] || 0) + 1;
      });

      var colorIdx = 0;
      var rootColor = {};
      var map = {};
      this.state.tasks.forEach(function (t) {
        var r = find(t.row);
        if ((compSize[r] || 0) < 2) return;
        if (rootColor[r] === undefined) {
          rootColor[r] = 'rel-grp-' + (colorIdx % 8);
          colorIdx++;
        }
        map[t.row] = rootColor[r];
      });
      return map;
    },

    renderTasks: function () {
      this.renderChips();
      this.renderInternalFilter();

      var self = this;
      var relMap = this.relateColorMap();
      var filtered = this.state.tasks.filter(function (t) {
        if (self.state.filter !== 'All' && String(t.Status || '').trim() !== self.state.filter) return false;
        if (self.state.internalFilter === 'internal' && !t.Internal) return false;
        if (self.state.internalFilter === 'external' && t.Internal) return false;
        if (!self.state.search) return true;
        var hay = [t['Task name'], t['Task-ID'], t['Task Relate'], t.Date, t['Due Date'], t.Purpose, t.PIC, t.Organization, t.Status, t.Note]
          .join(' ').toLowerCase();
        return hay.indexOf(self.state.search) !== -1;
      });

      filtered.sort(function (a, b) {
        return (b.Date || '').localeCompare(a.Date || '');
      });

      this.els.emptyState.classList.toggle('hidden', filtered.length > 0);
      this.els.taskList.innerHTML = filtered.map(function (t) {
        return self.taskCard(t, relMap[t.row] || '');
      }).join('');
    },

    taskCard: function (t, relClass) {
      var self = this;
      var c = this.statusColor(t.Status);
      var value = this.formatValue(t.Value);
      var overdue = this.isOverdue(t);
      var dueDate = t['Due Date'] ? '<span class="due-date' + (overdue ? ' overdue' : '') + '">' + (overdue ? 'Overdue ' : '') + this.fmtDate(t['Due Date']) + '</span>' : '';
      var note = t.Note ? metaTag('note', t.Note) : '';
      var relate = t['Task Relate'] ? metaTag('relate', 'Relates ' + t['Task Relate']) : '';
      var internal = t.Internal ? '<span class="task-foot-internal">' + metaTag('internal', 'Internal') + '</span>' : '';
      var duration = t.Duration ? durationTag(t.Duration) : '';
      var relClassAttr = relClass ? ' ' + relClass : '';

      return '<div class="task-card' + relClassAttr + '" style="--sc:' + c.card + ';--sc-bg:' + c.bg + '">' +
        '<div class="task-main">' +
          '<div class="task-left">' +
            '<div class="task-date">' + (t['Task-ID'] ? escapeHtml(t['Task-ID']) + '  /  ' : '') + this.fmtDate(t.Date) + (t['Due Date'] ? '  /  Due ' + this.fmtDate(t['Due Date']) : '') + '</div>' +
            '<div class="task-title">' + escapeHtml(t['Task name'] || '-') + '</div>' +
          '</div>' +
          '<div class="task-right">' +
            (value ? '<span class="task-value">' + value + '</span>' : '') +
            '<span class="badge" style="--sc:' + c.card + ';--badge-fg:#fff"><span class="badge-dot"></span>' + escapeHtml(t.Status || '') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="task-meta">' +
          metaTag('user', t.PIC) +
          metaTag('org', t.Organization) +
          metaTag('tag', t.Purpose) +
          duration + relate + note +
        '</div>' +
        '<div class="task-actions">' +
          '<button class="row-btn edit" data-row="' + t.row + '">' + svgIcon('pencil') + 'Edit</button>' +
          '<button class="row-btn del" data-row="' + t.row + '">' + svgIcon('trash') + 'Delete</button>' +
          internal +
        '</div>' +
      '</div>';
    },

    isOverdue: function (t) {
      var due = this.isoDate(t['Due Date']);
      if (!due) return false;
      var s = String(t.Status || '').trim().toLowerCase();
      if (s === 'done' || s === 'completed' || s === 'cancelled') return false;
      return due < this.todayGMT7();
    },

    /* ---------------- organisations ---------------- */

    renderOrganizations: function () {
      var q = (this.els.orgSearch.value || '').trim().toLowerCase();
      var list = this.state.organizations.filter(function (o) {
        if (!q) return true;
        return String(o.Name).toLowerCase().indexOf(q) !== -1 ||
          String(o.Description || '').toLowerCase().indexOf(q) !== -1;
      });

      this.els.orgEmpty.classList.toggle('hidden', list.length > 0);

      var html = list.map(function (o) {
        var initial = (o.Name || '?').trim().charAt(0).toUpperCase();
        var desc = String(o.Description || '').trim();
        return '<div class="org-item">' +
          '<div class="org-info">' +
            '<div class="org-badge">' + escapeHtml(initial) + '</div>' +
            '<div>' +
              '<div class="org-name">' + escapeHtml(o.Name) + '</div>' +
              '<div class="org-meta">No ' + escapeHtml(String(o.No !== '' && o.No !== undefined ? o.No : '-')) + '</div>' +
              (desc ? '<div class="org-desc">' + escapeHtml(desc) + '</div>' : '') +
            '</div>' +
          '</div>' +
          '<div class="org-actions">' +
            '<button class="row-btn edit" data-row="' + o.row + '" data-name="' + escapeHtml(o.Name) + '" data-desc="' + escapeHtml(o.Description || '') + '">' + svgIcon('pencil') + 'Edit</button>' +
            '<button class="row-btn del" data-row="' + o.row + '" data-name="' + escapeHtml(o.Name) + '">' + svgIcon('trash') + 'Delete</button>' +
          '</div>' +
        '</div>';
      }).join('');
      this.els.orgList.innerHTML = html;
    },

    applyOrgNameLock: function (inUseCount) {
      var field = this.els.fOrgName;
      var hint = this.els.fOrgNameHint;
      if (inUseCount > 0) {
        field.readOnly = true;
        field.classList.add('locked-input');
        hint.textContent = 'Name is locked: ' + inUseCount + ' task' + (inUseCount > 1 ? 's' : '') +
          ' use this organization. You can still edit the description.';
        hint.classList.remove('hidden');
      } else {
        field.readOnly = false;
        field.classList.remove('locked-input');
        hint.textContent = '';
        hint.classList.add('hidden');
      }
    },

    openOrgForm: function (row, name, desc) {
      var self = this;
      if (!this.guardWrite()) return;
      this.state.editingOrgRow = row || null;
      this.state.editingOrgOriginalName = name || '';
      this.els.orgFormTitle.textContent = row ? 'Edit Organization' : 'Add Organization';
      this.els.fOrgName.value = name || '';
      this.els.fOrgDesc.value = desc || '';
      this.applyOrgNameLock(row ? this.tasksUsingOrg(name).length : 0);
      this.openModal('orgModal');
      setTimeout(function () { self.els.fOrgName.focus(); }, 250);
    },

    saveOrg: function () {
      var self = this;
      if (!this.guardWrite()) return;
      var name = this.els.fOrgName.value.trim();
      var desc = this.els.fOrgDesc.value.trim();
      if (!name) {
        this.toast('Organization name is required.', true);
        return;
      }
      if (this.orgNameExists(name, this.state.editingOrgRow)) {
        this.toast('Organization "' + name + '" already exists.', true);
        return;
      }
      if (this.state.editingOrgRow) {
        var original = this.state.editingOrgOriginalName || '';
        if (name.toLowerCase() !== original.toLowerCase()) {
          var inUse = this.tasksUsingOrg(original).length;
          if (inUse > 0) {
            this.toast('Cannot rename "' + original + '": it is used by ' + inUse + ' task' +
              (inUse > 1 ? 's' : '') + '. Reassign them first.', true);
            this.els.fOrgName.value = original;
            return;
          }
        }
      }
      this.setBusy(true);
      var action = this.state.editingOrgRow ? 'updateOrg' : 'addOrg';
      var params = this.state.editingOrgRow
        ? { action: action, row: this.state.editingOrgRow, name: name, description: desc }
        : { action: action, name: name, description: desc };
      ProjectS.call(action, params, 'POST').then(function (res) {
        self.setBusy(false);
        if (!res.ok) {
          self.toast(res.error || 'Save failed', true);
          return;
        }
        self.closeModal('orgModal');
        self.state.editingOrgRow = null;
        self.state.editingOrgOriginalName = null;
        self.toast('Organization saved', false, true);
        self.refresh();
      });
    },

    openOrgDelete: function (row, name) {
      if (!this.guardWrite()) return;
      var used = this.tasksUsingOrg(name);
      if (used.length) {
        this.toast('Cannot delete "' + name + '": it is used by ' + used.length + ' task' +
          (used.length > 1 ? 's' : '') + '. Reassign them first.', true);
        return;
      }
      this.state.editingOrgRow = row;
      this.state.editingOrgName = name;
      this.state.deleteKind = 'org';
      this.els.confirmTitle.textContent = 'Delete Organization';
      this.els.confirmText.textContent = 'Delete "' + name + '"? This cannot be undone.';
      this.openModal('confirmModal');
    },

    doDeleteOrg: function () {
      var self = this;
      var name = this.state.editingOrgName;
      var used = this.tasksUsingOrg(name);
      if (used.length) {
        this.toast('Cannot delete "' + name + '": it is used by ' + used.length + ' task' +
          (used.length > 1 ? 's' : '') + '. Reassign them first.', true);
        this.closeModal('confirmModal');
        return;
      }
      this.setBusy(true);
      ProjectS.call('deleteOrg', { action: 'deleteOrg', row: this.state.editingOrgRow }, 'POST').then(function (res) {
        self.setBusy(false);
        if (!res.ok) {
          self.toast(res.error || 'Delete failed', true);
          return;
        }
        self.closeModal('confirmModal');
        self.state.editingOrgRow = null;
        self.state.editingOrgName = null;
        self.toast('Organization deleted', false, true);
        self.refresh();
      });
    },

    /* ---------------- formatting ---------------- */

    /* Normalises any date-ish value to a calendar date key (YYYY-MM-DD) without
     * ever going through the device timezone. Returns '' when unrecognisable. */
    isoDate: function (value) {
      if (!value) return '';
      if (value instanceof Date && !isNaN(value.getTime())) {
        return new Date(value.getTime() + GMT7_OFFSET_MS).toISOString().slice(0, 10);
      }
      var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
      return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
    },

    fmtDate: function (iso) {
      var key = this.isoDate(iso);
      if (!key) return iso ? String(iso) : '';
      var parts = key.split('-');
      return parts[2] + '-' + this.MONTHS[Number(parts[1]) - 1] + '-' + String(Number(parts[0]) % 100);
    },

    /* Current calendar date in GMT+7, independent of the device timezone. */
    todayGMT7: function () {
      return new Date(Date.now() + GMT7_OFFSET_MS).toISOString().slice(0, 10);
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
        this.setRelateValue(task['Task Relate'] || '');
      } else {
        this.autoId();
        this.els.fDate.value = this.todayGMT7();
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
        this.els.fRelate.value = '';
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
      this.els.fTaskID.value = '';
    },

    setRelateValue: function (val) {
      var v = String(val || '').trim();
      var sel = this.els.fRelate;
      var found = false;
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === v) { found = true; break; }
      }
      if (v && !found) {
        var opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        sel.appendChild(opt);
      }
      sel.value = v;
    },

    saveTask: function () {
      var self = this;
      if (!this.guardWrite()) return;

      var taskName = String(this.els.fTask.value || '').trim();
      var purpose = this.els.fPurpose.value;
      var pic = this.els.fPIC.value;
      var status = this.els.fStatus.value;
      var date = this.els.fDate.value;
      var relate = this.els.fRelate.value;

      if (!taskName || !purpose || !pic || !status || !date) {
        this.toast('Please fill Date, Purpose, PIC, Status and Task name.', true);
        return;
      }

      if (relate && this.state.editingRow) {
        var editingTask = this.state.tasks.find(function (t) { return t.row === self.state.editingRow; });
        if (editingTask && relate === String(editingTask['Task-ID'] || '').trim()) {
          this.toast('A task cannot relate to itself.', true);
          return;
        }
      }

      var fields = {
        'Date': date,
        'Due Date': this.els.fDue.value,
        'Purpose': purpose,
        'PIC': pic,
        'Organization': this.els.fOrg.value.trim(),
        'Task name': taskName,
        'Value': this.parseValue(this.els.fValue.value),
        'Note': this.els.fNote.value.trim(),
        'Internal': this.els.fInternal.checked,
        'Status': status,
        'Task Relate': relate
      };

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
      if (this.state.confirmAction) {
        var action = this.state.confirmAction;
        this.state.confirmAction = null;
        this.els.confirmDelete.textContent = 'Delete';
        this.closeModal('confirmModal');
        action();
        return;
      }
      if (this.state.deleteKind === 'org') return this.doDeleteOrg();
      return this.doDelete();
    },

    askConfirm: function (title, text, action, btnLabel) {
      this.state.confirmAction = action;
      this.els.confirmTitle.textContent = title;
      this.els.confirmText.textContent = text;
      this.els.confirmDelete.textContent = btnLabel || 'Delete';
      this.openModal('confirmModal');
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

    /* ---------------- database (backup / restore / wipe) ---------------- */

    setDbStatus: function (msg, isErr) {
      this.els.dbStatus.textContent = msg || '';
      this.els.dbStatus.className = 'conn-status' + (isErr ? ' err' : (msg ? ' ok' : ''));
    },

    backupTaskList: function (force) {
      var self = this;
      this.setDbStatus('Backing up...');
      ProjectS.call('backup', { action: 'backup', force: !!force }, 'POST').then(function (res) {
        if (!res.ok) { self.setDbStatus(res.error || 'Backup failed', true); return; }
        if (res.needConfirm) {
          self.setDbStatus('');
          self.askConfirm(
            'Backup already exists',
            'A backup named "' + res.backup + '" already exists for today. Continue and overwrite it?',
            function () { self.backupTaskList(true); },
            'Overwrite'
          );
          return;
        }
        self.setDbStatus('Backup created: ' + res.backup + '.');
        self.toast('Backup created', false, true);
      });
    },

    openRestore: function () {
      var self = this;
      this.els.backupList.innerHTML = '';
      this.els.backupEmpty.classList.add('hidden');
      this.els.restoreHint.classList.remove('hidden');
      this.openModal('restoreModal');
      ProjectS.call('listBackups', { action: 'listBackups' }, 'GET').then(function (res) {
        if (!res.ok) {
          self.els.restoreHint.classList.add('hidden');
          self.els.backupList.innerHTML = '<p class="muted">' + escapeHtml(res.error || 'Failed to load backups.') + '</p>';
          return;
        }
        var backups = (res.backups || []).slice().sort(function (a, b) {
          return backupDateKey(b) - backupDateKey(a);
        });
        self.els.backupEmpty.classList.toggle('hidden', backups.length > 0);
        self.els.restoreHint.classList.toggle('hidden', backups.length === 0);
        self.els.backupList.innerHTML = backups.map(function (name) {
          return '<button class="backup-item" data-name="' + escapeHtml(name) + '">' +
            '<span class="backup-icon">' + svgIcon('backup') + '</span>' +
            '<span class="backup-name">' + escapeHtml(name) + '</span>' +
            '<span class="backup-go">' + svgIcon('arrow') + '</span>' +
            '</button>';
        }).join('');

        self.els.backupList.querySelectorAll('.backup-item').forEach(function (item) {
          item.addEventListener('click', function () {
            self.confirmRestore(item.getAttribute('data-name'));
          });
        });
      });
    },

    confirmRestore: function (name) {
      var self = this;
      this.closeModal('restoreModal');
      this.askConfirm(
        'Restore backup',
        'Restore "' + name + '"? The current TaskList data will be overwritten with this backup.',
        function () { self.restoreTaskList(name); },
        'Restore'
      );
    },

    restoreTaskList: function (name) {
      var self = this;
      this.setDbStatus('Restoring...');
      ProjectS.call('restore', { action: 'restore', name: name }, 'POST').then(function (res) {
        if (!res.ok) { self.setDbStatus(res.error || 'Restore failed', true); return; }
        self.setDbStatus('Restored "' + res.restored + '".');
        self.toast('Restore complete', false, true);
        self.refresh(true);
      });
    },

    wipeTaskList: function () {
      var self = this;
      this.askConfirm(
        'Wipe all data',
        'This will delete ALL task data from the TaskList sheet. Continue?',
        function () {
          self.setDbStatus('Wiping data...');
          ProjectS.call('wipe', { action: 'wipe' }, 'POST').then(function (res) {
            if (!res.ok) { self.setDbStatus(res.error || 'Wipe failed', true); return; }
            self.setDbStatus('All data wiped.');
            self.toast('All data wiped', false, true);
            self.refresh(true);
          });
        },
        'Wipe'
      );
    },

    /* ---------------- security ---------------- */

    hashPassword: function (pwd) {
      if (window.crypto && window.crypto.subtle) {
        return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode('ps_' + pwd))
          .then(function (buf) {
            return Array.prototype.map.call(new Uint8Array(buf), function (b) {
              return ('0' + b.toString(16)).slice(-2);
            }).join('');
          });
      }
      var h = 5381;
      var s = 'ps_' + pwd;
      for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
      return Promise.resolve('djb2_' + h.toString(16));
    },

    applySecurityState: function () {
      var locked = this.state.settingsLocked;
      this.els.secLocked.classList.toggle('hidden', !locked);
      this.els.secUnlocked.classList.toggle('hidden', locked);
      this.els.sheetUrl.disabled = locked;
      this.els.apiUrl.disabled = locked;
      this.els.testBtn.disabled = locked;
      this.els.saveBtn.disabled = locked;
      this.els.sheetUrl.placeholder = locked ? 'Locked - enter password to view' : 'https://docs.google.com/spreadsheets/d/...';
      this.els.apiUrl.placeholder = locked ? 'Locked - enter password to view' : 'https://script.google.com/macros/s/.../exec';
      if (this.els.connBlock) this.els.connBlock.classList.toggle('hidden', locked);
      if (this.els.dbBlock) this.els.dbBlock.classList.toggle('hidden', locked);
      if (this.els.pwdBlock) this.els.pwdBlock.classList.toggle('hidden', locked);
    },

    checkPassword: function (pwd) {
      var self = this;
      var stored = localStorage.getItem(LS_PWD);
      return this.hashPassword(pwd).then(function (hash) {
        return stored ? hash === stored : pwd === DEFAULT_PWD;
      });
    },

    unlockSettings: function () {
      var self = this;
      var p = this.els.unlockPwd.value;
      if (!p) { this.toast('Enter the password.', true); return; }
      var usingDefaultPwd = !localStorage.getItem(LS_PWD);
      this.checkPassword(p).then(function (ok) {
        if (!ok) { self.toast('Incorrect password.', true); return; }
        self.els.unlockPwd.value = '';
        self.state.settingsLocked = false;
        if (usingDefaultPwd) {
          // Default password only: keep the connection URLs masked.
          self.els.sheetUrl.value = '**** Masked *****';
          self.els.apiUrl.value = '**** Masked *****';
          self.els.sheetUrl.classList.add('masked-input');
          self.els.apiUrl.classList.add('masked-input');
          self.els.sheetUrl.placeholder = '';
          self.els.apiUrl.placeholder = '';
        } else {
          self.els.sheetUrl.value = ProjectS.getSheetUrl();
          self.els.apiUrl.value = ProjectS.getBaseUrl();
          self.els.sheetUrl.classList.remove('masked-input');
          self.els.apiUrl.classList.remove('masked-input');
          self.els.sheetUrl.placeholder = 'https://docs.google.com/spreadsheets/d/...';
          self.els.apiUrl.placeholder = 'https://script.google.com/macros/s/.../exec';
        }
        self.applySecurityState();
        self.startSettingsIdleWatch();
        self.toast('Unlocked.', false, true);
      });
    },

    startSettingsIdleWatch: function () {
      if (this.state.currentView !== 'settings' || this.state.settingsLocked) {
        this.stopSettingsIdleWatch();
        return;
      }
      this.bumpSettingsIdle();
    },

    stopSettingsIdleWatch: function () {
      if (this._settingsIdleTimer) {
        clearTimeout(this._settingsIdleTimer);
        this._settingsIdleTimer = null;
      }
    },

    bumpSettingsIdle: function () {
      if (this.state.currentView !== 'settings' || this.state.settingsLocked) return;
      var self = this;
      if (this._settingsIdleTimer) clearTimeout(this._settingsIdleTimer);
      this._settingsIdleTimer = setTimeout(function () {
        self._settingsIdleTimer = null;
        if (self.state.currentView === 'settings' && !self.state.settingsLocked) {
          self.lockSettings(true);
        }
      }, SETTINGS_IDLE_MS);
    },

    lockSettings: function (fromIdle) {
      this.stopSettingsIdleWatch();
      this.state.settingsLocked = true;
      this.els.sheetUrl.value = '';
      this.els.apiUrl.value = '';
      this.els.sheetUrl.classList.remove('masked-input');
      this.els.apiUrl.classList.remove('masked-input');
      this.els.connStatus.textContent = '';
      this.els.connStatus.className = 'conn-status';
      this.applySecurityState();
      this.toast(fromIdle ? 'Settings locked after 5 minutes of inactivity.' : 'Settings locked.', false, true);
    },

    changePassword: function () {
      var self = this;
      var old = this.els.oldPwd.value;
      var np = this.els.newPwd2.value;
      var cp = this.els.confirmPwd2.value;
      if (!old) { this.toast('Enter your current password.', true); return; }
      if (!np || np.length < 4) { this.toast('New password must be at least 4 characters.', true); return; }
      if (np !== cp) { this.toast('New passwords do not match.', true); return; }
      this.checkPassword(old).then(function (ok) {
        if (!ok) { self.toast('Current password is incorrect.', true); return; }
        self.hashPassword(np).then(function (newHash) {
          localStorage.setItem(LS_PWD, newHash);
          self.els.oldPwd.value = '';
          self.els.newPwd2.value = '';
          self.els.confirmPwd2.value = '';
          self.toast('Password changed.', false, true);
        });
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

  function backupDateKey(name) {
    var m = /^TaskBAK-(\d{2})-(\d{2})-(\d{2})$/.exec(String(name || '').trim());
    if (!m) return 0;
    var yy = Number(m[3]);
    var year = yy >= 70 ? 1900 + yy : 2000 + yy;
    return year * 10000 + Number(m[2]) * 100 + Number(m[1]);
  }

  function escapeHtml(str) {
    return String(str === null || str === undefined ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function unique(arr) {
    var seen = {};
    var out = [];
    arr.forEach(function (v) {
      var key = String(v || '');
      if (key && !seen[key]) { seen[key] = true; out.push(v); }
    });
    return out;
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var ctx = this;
      var args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(ctx, args);
      }, wait);
    };
  }

  function metaTag(kind, value) {
    if (!value) return '';
    var icons = {
      user: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      org: '<path d="M4 21V4h10v3h6v14h-9m0 0h9M8 8h2m-2 4h2m-2 4h2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      tag: '<path d="M20 12l-8 8-9-9V4h7l10 10zM7.5 7.5h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      note: '<path d="M4 5a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5zM14 3v6h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      relate: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
      internal: '<path d="M12 2l2.6 2.6 3.7.5.5 3.7L21 11l-2.2 2.2-.5 3.7-3.7.5L12 20l-2.6-2.6-3.7-.5-.5-3.7L3 11l2.2-2.2.5-3.7 3.7-.5L12 2zM9 11.5l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    return '<span class="meta-tag"><svg class="icon" viewBox="0 0 24 24">' +
      (icons[kind] || '') + '</svg>' + escapeHtml(value) + '</span>';
  }

  function durationTag(value) {
    var isOverdue = String(value).toLowerCase().indexOf('overdue') !== -1;
    var icon = '<path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>';
    return '<span class="meta-tag duration ' + (isOverdue ? 'overdue' : 'ok') + '">' +
      '<svg class="icon" viewBox="0 0 24 24">' + icon + '</svg>' +
      escapeHtml(value) + '</span>';
  }

  function svgIcon(name) {
    var paths = {
      pencil: '<path d="M16.9 4.1l3 3L8 19H5v-3L16.9 4.1zM14 6l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      backup: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      arrow: '<path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      view: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>'
    };
    return '<svg class="icon" viewBox="0 0 24 24">' + (paths[name] || '') + '</svg>';
  }

  document.addEventListener('DOMContentLoaded', function () { App.init(); });
})();
