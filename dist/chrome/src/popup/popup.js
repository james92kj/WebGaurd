/* global WebGuard */

(async function() {
    'use strict';

    var api = WebGuard.BrowserCompat.getAPI();

    // --- DOM References ---
    var masterToggle = document.getElementById('masterToggle');
    var statusBar = document.getElementById('statusBar');
    var statusText = document.getElementById('statusText');
    var statusDot = statusBar.querySelector('.status-dot');
    var domainInput = document.getElementById('domainInput');
    var addSiteBtn = document.getElementById('addSiteBtn');
    var sitesList = document.getElementById('sitesList');
    var sitesCount = document.getElementById('sitesCount');
    var sitesEmpty = document.getElementById('sitesEmpty');
    var savedList = document.getElementById('savedList');
    var savedCount = document.getElementById('savedCount');
    var savedEmpty = document.getElementById('savedEmpty');
    var openOptions = document.getElementById('openOptions');

    // --- Load initial data ---
    await loadAll();

    // --- Event Listeners ---

    masterToggle.addEventListener('change', async function() {
        await WebGuard.Storage.updateSettings({ enabled: masterToggle.checked });
        await api.runtime.sendMessage({ type: WebGuard.Constants.MESSAGE_TYPES.RULES_CHANGED });
        updateStatus();
    });

    addSiteBtn.addEventListener('click', addSite);
    domainInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') addSite();
    });

    openOptions.addEventListener('click', function(e) {
        e.preventDefault();
        api.runtime.openOptionsPage();
    });

    // Listen for storage changes to keep UI in sync
    api.storage.onChanged.addListener(function(changes, areaName) {
        if (areaName !== 'local') return;
        loadAll();
    });

    // --- Functions ---

    async function loadAll() {
        var settings = await WebGuard.Storage.getSettings();
        masterToggle.checked = settings.enabled;
        updateStatus();

        await renderBlockedSites();
        await renderSavedUrls();
    }

    async function updateStatus() {
        var settings = await WebGuard.Storage.getSettings();
        var schedule = await WebGuard.Storage.getSchedule();
        var inWindow = WebGuard.TimeUtils.isWithinAllowedWindow(schedule);

        statusDot.className = 'status-dot';

        if (!settings.enabled) {
            statusDot.classList.add('disabled');
            statusText.textContent = 'Protection disabled';
        } else if (inWindow) {
            statusDot.classList.add('window-open');
            statusText.textContent = 'Allowed window — browsing freely';
        } else {
            statusDot.classList.add('active');
            statusText.textContent = 'Protection active';
        }
    }

    async function addSite() {
        var domain = domainInput.value.trim();
        if (!domain) return;

        var result = await WebGuard.Storage.addBlockedSite(domain);
        if (result === null) {
            domainInput.value = '';
            domainInput.placeholder = 'Already blocked!';
            setTimeout(function() {
                domainInput.placeholder = 'Enter domain (e.g. reddit.com)';
            }, 1500);
            return;
        }

        domainInput.value = '';
        await api.runtime.sendMessage({ type: WebGuard.Constants.MESSAGE_TYPES.RULES_CHANGED });
        await renderBlockedSites();
    }

    async function renderBlockedSites() {
        var sites = await WebGuard.Storage.getBlockedSites();
        sitesCount.textContent = sites.length;

        // Clear list (keep empty state element)
        var items = sitesList.querySelectorAll('.site-item');
        items.forEach(function(item) { item.remove(); });

        if (sites.length === 0) {
            sitesEmpty.style.display = 'block';
            return;
        }

        sitesEmpty.style.display = 'none';

        sites.forEach(function(site) {
            var item = document.createElement('div');
            item.className = 'site-item';

            var info = document.createElement('div');
            info.className = 'site-info';

            var domainEl = document.createElement('span');
            domainEl.className = 'site-domain' + (site.enabled ? '' : ' disabled');
            domainEl.textContent = site.domain;
            info.appendChild(domainEl);

            var actions = document.createElement('div');
            actions.className = 'site-actions';

            // Toggle button
            var toggleBtn = document.createElement('button');
            toggleBtn.className = 'btn-icon';
            toggleBtn.title = site.enabled ? 'Disable' : 'Enable';
            toggleBtn.innerHTML = site.enabled ? '&#x23F8;' : '&#x25B6;';
            toggleBtn.addEventListener('click', async function() {
                await WebGuard.Storage.toggleBlockedSite(site.id);
                await api.runtime.sendMessage({ type: WebGuard.Constants.MESSAGE_TYPES.RULES_CHANGED });
                await renderBlockedSites();
            });
            actions.appendChild(toggleBtn);

            // Remove button
            var removeBtn = document.createElement('button');
            removeBtn.className = 'btn-icon remove';
            removeBtn.title = 'Remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', async function() {
                await WebGuard.Storage.removeBlockedSite(site.id);
                await api.runtime.sendMessage({ type: WebGuard.Constants.MESSAGE_TYPES.RULES_CHANGED });
                await renderBlockedSites();
            });
            actions.appendChild(removeBtn);

            item.appendChild(info);
            item.appendChild(actions);
            sitesList.appendChild(item);
        });
    }

    async function renderSavedUrls() {
        var savedUrls = await WebGuard.Storage.getSavedUrls();
        savedCount.textContent = savedUrls.length;

        // Clear list (keep empty state element)
        var items = savedList.querySelectorAll('.saved-item');
        items.forEach(function(item) { item.remove(); });

        if (savedUrls.length === 0) {
            savedEmpty.style.display = 'block';
            return;
        }

        savedEmpty.style.display = 'none';

        savedUrls.forEach(function(entry) {
            var item = document.createElement('div');
            item.className = 'saved-item';

            var urlEl = document.createElement('div');
            urlEl.className = 'saved-url';

            var link = document.createElement('a');
            link.href = entry.url;
            link.target = '_blank';
            link.textContent = entry.domain + (entry.url.length > 40 ? '/...' : '');
            link.title = entry.url;
            urlEl.appendChild(link);

            var removeBtn = document.createElement('button');
            removeBtn.className = 'btn-icon remove';
            removeBtn.title = 'Remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', async function() {
                await WebGuard.Storage.removeSavedUrl(entry.id);
                await renderSavedUrls();
            });

            item.appendChild(urlEl);
            item.appendChild(removeBtn);
            savedList.appendChild(item);
        });
    }
})();
