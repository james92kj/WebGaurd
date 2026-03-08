/* global WebGuard */
var WebGuard = WebGuard || {};

WebGuard.Scheduler = {
    ALARM_NAME: 'webguard-window-open',

    /**
     * Set up the next alarm for when an allowed window opens.
     */
    setupAlarms: async function() {
        var api = WebGuard.BrowserCompat.getAPI();

        // Clear existing alarm
        await api.alarms.clear(WebGuard.Scheduler.ALARM_NAME);

        var schedule = await WebGuard.Storage.getSchedule();
        var nextStart = WebGuard.TimeUtils.getNextWindowStart(schedule);

        if (nextStart) {
            api.alarms.create(WebGuard.Scheduler.ALARM_NAME, {
                when: nextStart.getTime()
            });
        }
    },

    /**
     * Handle alarm event. Called from background.js alarms listener.
     */
    handleAlarm: async function(alarm) {
        if (alarm.name !== WebGuard.Scheduler.ALARM_NAME) return;

        // Notify user that window is open
        await WebGuard.Notifications.onWindowOpen();

        // Rebuild blocking rules (the window is now open, so rules should allow traffic)
        await WebGuard.Blocker.rebuildRules();

        // Schedule the next alarm
        await WebGuard.Scheduler.setupAlarms();
    }
};
