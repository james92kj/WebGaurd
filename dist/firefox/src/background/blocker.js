/* global WebGuard, chrome, browser */
var WebGuard = WebGuard || {};

WebGuard.Blocker = {
    // In-memory cache of schedule for synchronous access (Firefox webRequest)
    _cachedSchedule: null,
    _cachedSettings: null,
    _activeListener: null,

    /**
     * Initialize the cache from storage.
     */
    initCache: async function() {
        WebGuard.Blocker._cachedSchedule = await WebGuard.Storage.getSchedule();
        WebGuard.Blocker._cachedSettings = await WebGuard.Storage.getSettings();
    },

    /**
     * Update cache when storage changes. Call from storage.onChanged listener.
     */
    updateCache: function(changes) {
        var KEYS = WebGuard.Constants.STORAGE_KEYS;
        if (changes[KEYS.SCHEDULE]) {
            WebGuard.Blocker._cachedSchedule = changes[KEYS.SCHEDULE].newValue;
        }
        if (changes[KEYS.SETTINGS]) {
            WebGuard.Blocker._cachedSettings = changes[KEYS.SETTINGS].newValue;
        }
    },

    /**
     * Check if a URL should be blocked based on current time and blocked sites.
     */
    shouldBlock: async function(url) {
        var settings = WebGuard.Blocker._cachedSettings || await WebGuard.Storage.getSettings();
        if (!settings.enabled) return false;

        var schedule = WebGuard.Blocker._cachedSchedule || await WebGuard.Storage.getSchedule();
        if (WebGuard.TimeUtils.isWithinAllowedWindow(schedule)) return false;

        var sites = await WebGuard.Storage.getBlockedSites();
        return WebGuard.Blocker._urlMatchesSites(url, sites);
    },

    /**
     * Check if a URL matches any of the blocked sites.
     */
    _urlMatchesSites: function(url, sites) {
        var hostname;
        try {
            hostname = new URL(url).hostname.toLowerCase();
        } catch (e) {
            return false;
        }

        return sites.some(function(site) {
            if (!site.enabled) return false;
            var domain = site.domain.toLowerCase();

            if (hostname === domain || hostname === 'www.' + domain) {
                return true;
            }
            if (site.includeSubdomains && hostname.endsWith('.' + domain)) {
                return true;
            }
            return false;
        });
    },

    /**
     * Rebuild all blocking rules from storage. Dispatches to Chrome or Firefox impl.
     */
    rebuildRules: async function() {
        await WebGuard.Blocker.initCache();
        var sites = await WebGuard.Storage.getBlockedSites();
        var settings = WebGuard.Blocker._cachedSettings;

        if (WebGuard.BrowserCompat.isChrome()) {
            await WebGuard.Blocker._rebuildChrome(sites, settings);
        } else {
            WebGuard.Blocker._rebuildFirefox(sites, settings);
        }
    },

    /**
     * Clear all blocking rules.
     */
    clearAllRules: async function() {
        if (WebGuard.BrowserCompat.isChrome()) {
            await WebGuard.Blocker._clearChrome();
        } else {
            WebGuard.Blocker._clearFirefox();
        }
    },

    // ===================== Chrome (declarativeNetRequest) =====================

    _rebuildChrome: async function(sites, settings) {
        // Remove existing dynamic rules
        var existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        var removeRuleIds = existingRules.map(function(r) { return r.id; });

        if (!settings.enabled) {
            if (removeRuleIds.length > 0) {
                await chrome.declarativeNetRequest.updateDynamicRules({
                    removeRuleIds: removeRuleIds,
                    addRules: []
                });
            }
            return;
        }

        // Build new rules — one per enabled blocked site
        var enabledSites = sites.filter(function(s) { return s.enabled; });
        var addRules = enabledSites.map(function(site, index) {
            var urlFilter = site.includeSubdomains
                ? '||' + site.domain + '/'
                : '||' + site.domain + '/';

            return {
                id: index + 1,
                priority: 1,
                action: {
                    type: 'redirect',
                    redirect: {
                        extensionPath: '/src/blocked/blocked.html'
                    }
                },
                condition: {
                    urlFilter: urlFilter,
                    resourceTypes: ['main_frame']
                }
            };
        });

        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: removeRuleIds,
            addRules: addRules
        });
    },

    _clearChrome: async function() {
        var existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        var removeRuleIds = existingRules.map(function(r) { return r.id; });
        if (removeRuleIds.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: removeRuleIds,
                addRules: []
            });
        }
    },

    // ===================== Firefox (webRequest) =====================

    _rebuildFirefox: function(sites, settings) {
        // Remove previous listener
        WebGuard.Blocker._clearFirefox();

        if (!settings.enabled) return;

        var enabledSites = sites.filter(function(s) { return s.enabled; });
        if (enabledSites.length === 0) return;

        // Build URL patterns
        var patterns = [];
        enabledSites.forEach(function(site) {
            patterns.push('*://' + site.domain + '/*');
            if (site.includeSubdomains) {
                patterns.push('*://*.' + site.domain + '/*');
            }
        });

        WebGuard.Blocker._activeListener = function(details) {
            var schedule = WebGuard.Blocker._cachedSchedule;
            var cachedSettings = WebGuard.Blocker._cachedSettings;

            if (!cachedSettings || !cachedSettings.enabled) return {};
            if (schedule && WebGuard.TimeUtils.isWithinAllowedWindow(schedule)) return {};

            var blockedPageUrl = browser.runtime.getURL(
                'src/blocked/blocked.html?url=' + encodeURIComponent(details.url)
            );
            return { redirectUrl: blockedPageUrl };
        };

        browser.webRequest.onBeforeRequest.addListener(
            WebGuard.Blocker._activeListener,
            { urls: patterns, types: ['main_frame'] },
            ['blocking']
        );
    },

    _clearFirefox: function() {
        if (WebGuard.Blocker._activeListener) {
            browser.webRequest.onBeforeRequest.removeListener(WebGuard.Blocker._activeListener);
            WebGuard.Blocker._activeListener = null;
        }
    }
};
