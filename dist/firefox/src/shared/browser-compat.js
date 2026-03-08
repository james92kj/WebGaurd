/* global WebGuard, chrome, browser */
var WebGuard = WebGuard || {};

WebGuard.BrowserCompat = {
    /**
     * Returns true if running in Chrome (has declarativeNetRequest API).
     */
    isChrome: function() {
        return typeof chrome !== 'undefined' &&
               typeof chrome.declarativeNetRequest !== 'undefined';
    },

    /**
     * Returns true if running in Firefox (has browser.webRequest with blocking support).
     */
    isFirefox: function() {
        return !WebGuard.BrowserCompat.isChrome();
    },

    /**
     * Get the browser API object. Uses polyfilled `browser` if available,
     * falls back to `chrome`.
     */
    getAPI: function() {
        if (typeof browser !== 'undefined') {
            return browser;
        }
        return chrome;
    }
};
