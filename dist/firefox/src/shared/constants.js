/* global WebGuard */
var WebGuard = WebGuard || {};

WebGuard.Constants = {
    STORAGE_KEYS: {
        BLOCKED_SITES: 'blockedSites',
        SCHEDULE: 'schedule',
        SAVED_URLS: 'savedUrls',
        SETTINGS: 'settings',
        LAST_BLOCKED_URL: 'lastBlockedUrl'
    },

    DAY_NAMES: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],

    DEFAULT_SCHEDULE: {
        sunday:    [{ start: '12:00', end: '16:00' }],
        monday:    [{ start: '19:00', end: '20:00' }],
        tuesday:   [{ start: '19:00', end: '20:00' }],
        wednesday: [{ start: '19:00', end: '20:00' }],
        thursday:  [{ start: '19:00', end: '20:00' }],
        friday:    [{ start: '19:00', end: '21:00' }],
        saturday:  [{ start: '12:00', end: '16:00' }]
    },

    DEFAULT_SETTINGS: {
        enabled: true,
        showNotifications: true
    },

    MESSAGE_TYPES: {
        RULES_CHANGED: 'RULES_CHANGED',
        SCHEDULE_CHANGED: 'SCHEDULE_CHANGED',
        GET_STATUS: 'GET_STATUS'
    }
};
