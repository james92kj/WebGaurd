/* global WebGuard */
var WebGuard = WebGuard || {};

WebGuard.Notifications = {
    /**
     * Called when an allowed window opens. Shows a notification
     * if there are saved URLs.
     */
    onWindowOpen: async function() {
        var settings = await WebGuard.Storage.getSettings();
        if (!settings.showNotifications) return;

        var savedUrls = await WebGuard.Storage.getSavedUrls();
        var api = WebGuard.BrowserCompat.getAPI();

        var message = 'Your allowed browsing window is now open!';
        if (savedUrls.length > 0) {
            message += ' You have ' + savedUrls.length + ' saved URL' +
                       (savedUrls.length > 1 ? 's' : '') + ' waiting.';
        }

        api.notifications.create('webguard-window-open', {
            type: 'basic',
            iconUrl: api.runtime.getURL('src/icons/icon-128.png'),
            title: 'WebGuard',
            message: message
        });
    }
};
