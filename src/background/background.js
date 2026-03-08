/* global WebGuard, chrome, browser, importScripts */

// For Chrome service worker: load all dependencies via importScripts
if (typeof importScripts === 'function') {
    importScripts(
        '/vendor/browser-polyfill.min.js',
        '/src/shared/constants.js',
        '/src/shared/time-utils.js',
        '/src/shared/browser-compat.js',
        '/src/background/storage.js',
        '/src/background/blocker.js',
        '/src/background/scheduler.js',
        '/src/background/notifications.js'
    );
}

// --- Initialization ---

var api = WebGuard.BrowserCompat.getAPI();

api.runtime.onInstalled.addListener(async function(details) {
    if (details.reason === 'install') {
        await WebGuard.Storage.initDefaults();
    }
    await WebGuard.Blocker.rebuildRules();
    await WebGuard.Scheduler.setupAlarms();
});

api.runtime.onStartup.addListener(async function() {
    await WebGuard.Blocker.initCache();
    await WebGuard.Blocker.rebuildRules();
    await WebGuard.Scheduler.setupAlarms();
});

// --- Message handling from popup/options ---

api.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    var result;

    switch (message.type) {
        case WebGuard.Constants.MESSAGE_TYPES.RULES_CHANGED:
            result = WebGuard.Blocker.rebuildRules();
            break;
        case WebGuard.Constants.MESSAGE_TYPES.SCHEDULE_CHANGED:
            result = Promise.all([
                WebGuard.Blocker.rebuildRules(),
                WebGuard.Scheduler.setupAlarms()
            ]);
            break;
        case WebGuard.Constants.MESSAGE_TYPES.GET_STATUS:
            result = (async function() {
                var settings = await WebGuard.Storage.getSettings();
                var schedule = await WebGuard.Storage.getSchedule();
                return {
                    enabled: settings.enabled,
                    inAllowedWindow: WebGuard.TimeUtils.isWithinAllowedWindow(schedule)
                };
            })();
            break;
        default:
            return false;
    }

    // Handle async responses
    if (result && typeof result.then === 'function') {
        result.then(function(res) {
            sendResponse(res || { success: true });
        }).catch(function(err) {
            sendResponse({ error: err.message });
        });
        return true; // Keep message channel open for async response
    }
});

// --- Storage change listener (keep in-memory cache in sync) ---

api.storage.onChanged.addListener(function(changes, areaName) {
    if (areaName !== 'local') return;
    WebGuard.Blocker.updateCache(changes);
});

// --- Alarm handler ---

api.alarms.onAlarm.addListener(function(alarm) {
    WebGuard.Scheduler.handleAlarm(alarm);
});

// --- Chrome-only: capture blocked URL via webNavigation ---

if (WebGuard.BrowserCompat.isChrome()) {
    api.webNavigation.onBeforeNavigate.addListener(async function(details) {
        if (details.frameId !== 0) return; // Only main frame

        var shouldBlock = await WebGuard.Blocker.shouldBlock(details.url);
        if (shouldBlock) {
            // Store the blocked URL in session storage for the block page to read
            await chrome.storage.session.set({
                lastBlockedUrl: details.url,
                lastBlockedTime: Date.now()
            });
        }
    });
}

// --- Periodic rule refresh to handle window transitions ---
// Re-evaluate rules every minute so that blocking starts/stops at window boundaries

api.alarms.create('webguard-rule-refresh', { periodInMinutes: 1 });

var originalAlarmHandler = api.alarms.onAlarm.hasListeners;
api.alarms.onAlarm.addListener(async function(alarm) {
    if (alarm.name === 'webguard-rule-refresh') {
        await WebGuard.Blocker.rebuildRules();
    }
});
