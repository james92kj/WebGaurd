/* global WebGuard, browser */
var WebGuard = WebGuard || {};

WebGuard.Storage = {
    /**
     * Initialize default values on first install.
     */
    initDefaults: async function() {
        var api = WebGuard.BrowserCompat.getAPI();
        var data = await api.storage.local.get(null);

        var defaults = {};
        var KEYS = WebGuard.Constants.STORAGE_KEYS;

        if (!data[KEYS.BLOCKED_SITES]) {
            defaults[KEYS.BLOCKED_SITES] = [];
        }
        if (!data[KEYS.SCHEDULE]) {
            defaults[KEYS.SCHEDULE] = WebGuard.Constants.DEFAULT_SCHEDULE;
        }
        if (!data[KEYS.SAVED_URLS]) {
            defaults[KEYS.SAVED_URLS] = [];
        }
        if (!data[KEYS.SETTINGS]) {
            defaults[KEYS.SETTINGS] = WebGuard.Constants.DEFAULT_SETTINGS;
        }

        if (Object.keys(defaults).length > 0) {
            await api.storage.local.set(defaults);
        }
    },

    // --- Blocked Sites ---

    getBlockedSites: async function() {
        var api = WebGuard.BrowserCompat.getAPI();
        var data = await api.storage.local.get(WebGuard.Constants.STORAGE_KEYS.BLOCKED_SITES);
        return data[WebGuard.Constants.STORAGE_KEYS.BLOCKED_SITES] || [];
    },

    addBlockedSite: async function(domain, includeSubdomains) {
        var sites = await WebGuard.Storage.getBlockedSites();

        // Normalize domain: strip protocol, trailing slashes, www
        domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '').toLowerCase();

        // Check for duplicate
        var exists = sites.some(function(s) { return s.domain === domain; });
        if (exists) return null;

        var site = {
            id: 'bs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            domain: domain,
            includeSubdomains: includeSubdomains !== false,
            enabled: true,
            addedAt: Date.now()
        };

        sites.push(site);
        var update = {};
        update[WebGuard.Constants.STORAGE_KEYS.BLOCKED_SITES] = sites;
        await WebGuard.BrowserCompat.getAPI().storage.local.set(update);
        return site;
    },

    removeBlockedSite: async function(siteId) {
        var sites = await WebGuard.Storage.getBlockedSites();
        sites = sites.filter(function(s) { return s.id !== siteId; });
        var update = {};
        update[WebGuard.Constants.STORAGE_KEYS.BLOCKED_SITES] = sites;
        await WebGuard.BrowserCompat.getAPI().storage.local.set(update);
    },

    toggleBlockedSite: async function(siteId) {
        var sites = await WebGuard.Storage.getBlockedSites();
        sites = sites.map(function(s) {
            if (s.id === siteId) {
                s.enabled = !s.enabled;
            }
            return s;
        });
        var update = {};
        update[WebGuard.Constants.STORAGE_KEYS.BLOCKED_SITES] = sites;
        await WebGuard.BrowserCompat.getAPI().storage.local.set(update);
    },

    // --- Schedule ---

    getSchedule: async function() {
        var api = WebGuard.BrowserCompat.getAPI();
        var data = await api.storage.local.get(WebGuard.Constants.STORAGE_KEYS.SCHEDULE);
        return data[WebGuard.Constants.STORAGE_KEYS.SCHEDULE] || WebGuard.Constants.DEFAULT_SCHEDULE;
    },

    setSchedule: async function(schedule) {
        var update = {};
        update[WebGuard.Constants.STORAGE_KEYS.SCHEDULE] = schedule;
        await WebGuard.BrowserCompat.getAPI().storage.local.set(update);
    },

    // --- Saved URLs ---

    getSavedUrls: async function() {
        var api = WebGuard.BrowserCompat.getAPI();
        var data = await api.storage.local.get(WebGuard.Constants.STORAGE_KEYS.SAVED_URLS);
        return data[WebGuard.Constants.STORAGE_KEYS.SAVED_URLS] || [];
    },

    addSavedUrl: async function(url) {
        var savedUrls = await WebGuard.Storage.getSavedUrls();

        // Check for duplicate
        var exists = savedUrls.some(function(s) { return s.url === url; });
        if (exists) return null;

        var domain;
        try {
            domain = new URL(url).hostname.replace(/^www\./, '');
        } catch (e) {
            domain = url;
        }

        var entry = {
            id: 'su_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            url: url,
            domain: domain,
            savedAt: Date.now()
        };

        savedUrls.push(entry);
        var update = {};
        update[WebGuard.Constants.STORAGE_KEYS.SAVED_URLS] = savedUrls;
        await WebGuard.BrowserCompat.getAPI().storage.local.set(update);
        return entry;
    },

    removeSavedUrl: async function(urlId) {
        var savedUrls = await WebGuard.Storage.getSavedUrls();
        savedUrls = savedUrls.filter(function(s) { return s.id !== urlId; });
        var update = {};
        update[WebGuard.Constants.STORAGE_KEYS.SAVED_URLS] = savedUrls;
        await WebGuard.BrowserCompat.getAPI().storage.local.set(update);
    },

    clearSavedUrls: async function() {
        var update = {};
        update[WebGuard.Constants.STORAGE_KEYS.SAVED_URLS] = [];
        await WebGuard.BrowserCompat.getAPI().storage.local.set(update);
    },

    // --- Settings ---

    getSettings: async function() {
        var api = WebGuard.BrowserCompat.getAPI();
        var data = await api.storage.local.get(WebGuard.Constants.STORAGE_KEYS.SETTINGS);
        return data[WebGuard.Constants.STORAGE_KEYS.SETTINGS] || WebGuard.Constants.DEFAULT_SETTINGS;
    },

    updateSettings: async function(partial) {
        var settings = await WebGuard.Storage.getSettings();
        Object.keys(partial).forEach(function(key) {
            settings[key] = partial[key];
        });
        var update = {};
        update[WebGuard.Constants.STORAGE_KEYS.SETTINGS] = settings;
        await WebGuard.BrowserCompat.getAPI().storage.local.set(update);
    }
};
