/* global WebGuard */

(async function() {
    'use strict';

    var api = WebGuard.BrowserCompat.getAPI();

    // --- DOM References ---
    var masterToggle = document.getElementById('masterToggle');
    var domainInput = document.getElementById('domainInput');
    var addSiteBtn = document.getElementById('addSiteBtn');
    var sitesBody = document.getElementById('sitesBody');
    var sitesCount = document.getElementById('sitesCount');
    var sitesEmpty = document.getElementById('sitesEmpty');
    var sitesTable = document.getElementById('sitesTable');
    var scheduleGrid = document.getElementById('scheduleGrid');
    var savedBody = document.getElementById('savedBody');
    var savedCount = document.getElementById('savedCount');
    var savedEmpty = document.getElementById('savedEmpty');
    var savedTable = document.getElementById('savedTable');
    var savedFooter = document.getElementById('savedFooter');
    var clearSavedBtn = document.getElementById('clearSavedBtn');
    var notificationsToggle = document.getElementById('notificationsToggle');

    // --- Load initial data ---
    await loadAll();

    // --- Event Listeners ---

    masterToggle.addEventListener('change', async function() {
        await WebGuard.Storage.updateSettings({ enabled: masterToggle.checked });
        await api.runtime.sendMessage({ type: WebGuard.Constants.MESSAGE_TYPES.RULES_CHANGED });
    });

    addSiteBtn.addEventListener('click', addSite);
    domainInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') addSite();
    });

    clearSavedBtn.addEventListener('click', async function() {
        await WebGuard.Storage.clearSavedUrls();
        await renderSavedUrls();
    });

    notificationsToggle.addEventListener('change', async function() {
        await WebGuard.Storage.updateSettings({ showNotifications: notificationsToggle.checked });
    });

    // Listen for storage changes
    api.storage.onChanged.addListener(function(changes, areaName) {
        if (areaName !== 'local') return;
        var KEYS = WebGuard.Constants.STORAGE_KEYS;
        if (changes[KEYS.BLOCKED_SITES]) renderBlockedSites();
        if (changes[KEYS.SAVED_URLS]) renderSavedUrls();
        if (changes[KEYS.SETTINGS]) loadSettings();
    });

    // --- Functions ---

    async function loadAll() {
        await loadSettings();
        await renderBlockedSites();
        await renderSchedule();
        await renderSavedUrls();
    }

    async function loadSettings() {
        var settings = await WebGuard.Storage.getSettings();
        masterToggle.checked = settings.enabled;
        notificationsToggle.checked = settings.showNotifications;
    }

    async function addSite() {
        var domain = domainInput.value.trim();
        if (!domain) return;

        var result = await WebGuard.Storage.addBlockedSite(domain);
        if (result === null) {
            domainInput.value = '';
            domainInput.placeholder = 'This domain is already blocked!';
            setTimeout(function() {
                domainInput.placeholder = 'Enter domain to block (e.g. reddit.com)';
            }, 2000);
            return;
        }

        domainInput.value = '';
        await api.runtime.sendMessage({ type: WebGuard.Constants.MESSAGE_TYPES.RULES_CHANGED });
        await renderBlockedSites();
    }

    // --- Blocked Sites ---

    async function renderBlockedSites() {
        var sites = await WebGuard.Storage.getBlockedSites();
        sitesCount.textContent = sites.length;
        sitesBody.innerHTML = '';

        if (sites.length === 0) {
            sitesEmpty.style.display = 'block';
            sitesTable.style.display = 'none';
            return;
        }

        sitesEmpty.style.display = 'none';
        sitesTable.style.display = 'table';

        sites.forEach(function(site) {
            var tr = document.createElement('tr');

            // Domain
            var tdDomain = document.createElement('td');
            tdDomain.className = 'domain-cell';
            tdDomain.textContent = site.domain;
            tr.appendChild(tdDomain);

            // Subdomains
            var tdSub = document.createElement('td');
            tdSub.textContent = site.includeSubdomains ? 'Yes' : 'No';
            tr.appendChild(tdSub);

            // Status
            var tdStatus = document.createElement('td');
            var badge = document.createElement('span');
            badge.className = 'status-badge ' + (site.enabled ? 'enabled' : 'disabled');
            badge.textContent = site.enabled ? 'Active' : 'Paused';
            tdStatus.appendChild(badge);
            tr.appendChild(tdStatus);

            // Added date
            var tdAdded = document.createElement('td');
            tdAdded.textContent = new Date(site.addedAt).toLocaleDateString();
            tr.appendChild(tdAdded);

            // Actions
            var tdActions = document.createElement('td');
            tdActions.className = 'actions-cell';

            var toggleBtn = document.createElement('button');
            toggleBtn.className = 'btn-ghost';
            toggleBtn.textContent = site.enabled ? 'Pause' : 'Resume';
            toggleBtn.addEventListener('click', async function() {
                await WebGuard.Storage.toggleBlockedSite(site.id);
                await api.runtime.sendMessage({ type: WebGuard.Constants.MESSAGE_TYPES.RULES_CHANGED });
                await renderBlockedSites();
            });
            tdActions.appendChild(toggleBtn);

            var removeBtn = document.createElement('button');
            removeBtn.className = 'btn-ghost danger';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', async function() {
                await WebGuard.Storage.removeBlockedSite(site.id);
                await api.runtime.sendMessage({ type: WebGuard.Constants.MESSAGE_TYPES.RULES_CHANGED });
                await renderBlockedSites();
            });
            tdActions.appendChild(removeBtn);

            tr.appendChild(tdActions);
            sitesBody.appendChild(tr);
        });
    }

    // --- Schedule ---

    async function renderSchedule() {
        var schedule = await WebGuard.Storage.getSchedule();
        scheduleGrid.innerHTML = '';

        var dayLabels = {
            sunday: 'Sunday',
            monday: 'Monday',
            tuesday: 'Tuesday',
            wednesday: 'Wednesday',
            thursday: 'Thursday',
            friday: 'Friday',
            saturday: 'Saturday'
        };

        // Render starting from Monday
        var dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

        dayOrder.forEach(function(dayKey) {
            var dayEl = document.createElement('div');
            dayEl.className = 'schedule-day';

            var nameEl = document.createElement('div');
            nameEl.className = 'schedule-day-name';
            nameEl.textContent = dayLabels[dayKey];
            dayEl.appendChild(nameEl);

            var windowsEl = document.createElement('div');
            windowsEl.className = 'schedule-windows';

            var windows = schedule[dayKey] || [];

            windows.forEach(function(w, idx) {
                var windowEl = createWindowElement(dayKey, idx, w.start, w.end);
                windowsEl.appendChild(windowEl);
            });

            // Add window button
            var addBtn = document.createElement('button');
            addBtn.className = 'schedule-add-btn';
            addBtn.textContent = '+ Add';
            addBtn.addEventListener('click', async function() {
                var currentSchedule = await WebGuard.Storage.getSchedule();
                if (!currentSchedule[dayKey]) currentSchedule[dayKey] = [];
                currentSchedule[dayKey].push({ start: '18:00', end: '19:00' });
                await WebGuard.Storage.setSchedule(currentSchedule);
                await api.runtime.sendMessage({ type: WebGuard.Constants.MESSAGE_TYPES.SCHEDULE_CHANGED });
                await renderSchedule();
            });
            windowsEl.appendChild(addBtn);

            dayEl.appendChild(windowsEl);
            scheduleGrid.appendChild(dayEl);
        });
    }

    function createWindowElement(dayKey, windowIndex, startTime, endTime) {
        var windowEl = document.createElement('div');
        windowEl.className = 'schedule-window';

        var startInput = document.createElement('input');
        startInput.type = 'time';
        startInput.value = startTime;
        startInput.addEventListener('change', function() {
            updateWindowTime(dayKey, windowIndex, 'start', startInput.value);
        });
        windowEl.appendChild(startInput);

        var sep = document.createElement('span');
        sep.className = 'time-sep';
        sep.textContent = 'to';
        windowEl.appendChild(sep);

        var endInput = document.createElement('input');
        endInput.type = 'time';
        endInput.value = endTime;
        endInput.addEventListener('change', function() {
            updateWindowTime(dayKey, windowIndex, 'end', endInput.value);
        });
        windowEl.appendChild(endInput);

        var removeBtn = document.createElement('button');
        removeBtn.className = 'btn-ghost danger';
        removeBtn.innerHTML = '&times;';
        removeBtn.title = 'Remove window';
        removeBtn.addEventListener('click', async function() {
            var currentSchedule = await WebGuard.Storage.getSchedule();
            if (currentSchedule[dayKey]) {
                currentSchedule[dayKey].splice(windowIndex, 1);
                await WebGuard.Storage.setSchedule(currentSchedule);
                await api.runtime.sendMessage({ type: WebGuard.Constants.MESSAGE_TYPES.SCHEDULE_CHANGED });
                await renderSchedule();
            }
        });
        windowEl.appendChild(removeBtn);

        return windowEl;
    }

    async function updateWindowTime(dayKey, windowIndex, field, value) {
        var currentSchedule = await WebGuard.Storage.getSchedule();
        if (currentSchedule[dayKey] && currentSchedule[dayKey][windowIndex]) {
            currentSchedule[dayKey][windowIndex][field] = value;
            await WebGuard.Storage.setSchedule(currentSchedule);
            await api.runtime.sendMessage({ type: WebGuard.Constants.MESSAGE_TYPES.SCHEDULE_CHANGED });
        }
    }

    // --- Saved URLs ---

    async function renderSavedUrls() {
        var savedUrls = await WebGuard.Storage.getSavedUrls();
        savedCount.textContent = savedUrls.length;
        savedBody.innerHTML = '';

        if (savedUrls.length === 0) {
            savedEmpty.style.display = 'block';
            savedTable.style.display = 'none';
            savedFooter.style.display = 'none';
            return;
        }

        savedEmpty.style.display = 'none';
        savedTable.style.display = 'table';
        savedFooter.style.display = 'block';

        savedUrls.forEach(function(entry) {
            var tr = document.createElement('tr');

            // URL
            var tdUrl = document.createElement('td');
            tdUrl.className = 'url-cell';
            var link = document.createElement('a');
            link.href = entry.url;
            link.target = '_blank';
            link.textContent = entry.url;
            link.title = entry.url;
            tdUrl.appendChild(link);
            tr.appendChild(tdUrl);

            // Domain
            var tdDomain = document.createElement('td');
            tdDomain.textContent = entry.domain;
            tr.appendChild(tdDomain);

            // Saved date
            var tdSaved = document.createElement('td');
            tdSaved.textContent = new Date(entry.savedAt).toLocaleDateString();
            tr.appendChild(tdSaved);

            // Actions
            var tdActions = document.createElement('td');
            tdActions.className = 'actions-cell';
            var removeBtn = document.createElement('button');
            removeBtn.className = 'btn-ghost danger';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', async function() {
                await WebGuard.Storage.removeSavedUrl(entry.id);
                await renderSavedUrls();
            });
            tdActions.appendChild(removeBtn);
            tr.appendChild(tdActions);

            savedBody.appendChild(tr);
        });
    }
})();
