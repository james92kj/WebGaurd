/* global WebGuard */
var WebGuard = WebGuard || {};

WebGuard.TimeUtils = {
    /**
     * Parse "HH:MM" string to total minutes since midnight.
     */
    parseTimeToMinutes: function(timeStr) {
        var parts = timeStr.split(':');
        return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    },

    /**
     * Returns true if the current time falls within an allowed window
     * for today's day of the week.
     */
    isWithinAllowedWindow: function(schedule) {
        var now = new Date();
        var dayName = WebGuard.Constants.DAY_NAMES[now.getDay()];
        var windows = schedule[dayName];

        if (!windows || windows.length === 0) {
            return false;
        }

        var currentMinutes = now.getHours() * 60 + now.getMinutes();

        return windows.some(function(w) {
            var startMinutes = WebGuard.TimeUtils.parseTimeToMinutes(w.start);
            var endMinutes = WebGuard.TimeUtils.parseTimeToMinutes(w.end);

            if (endMinutes > startMinutes) {
                // Normal window (e.g., 19:00-20:00)
                return currentMinutes >= startMinutes && currentMinutes < endMinutes;
            } else {
                // Overnight window (e.g., 23:00-01:00)
                return currentMinutes >= startMinutes || currentMinutes < endMinutes;
            }
        });
    },

    /**
     * Returns the Date of the next allowed window start,
     * scanning up to 7 days ahead. Returns null if none found.
     */
    getNextWindowStart: function(schedule) {
        var now = new Date();
        var currentMinutes = now.getHours() * 60 + now.getMinutes();

        for (var dayOffset = 0; dayOffset < 7; dayOffset++) {
            var checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() + dayOffset);
            var dayName = WebGuard.Constants.DAY_NAMES[checkDate.getDay()];
            var windows = schedule[dayName];

            if (!windows || windows.length === 0) continue;

            // Sort windows by start time
            var sorted = windows.slice().sort(function(a, b) {
                return WebGuard.TimeUtils.parseTimeToMinutes(a.start) -
                       WebGuard.TimeUtils.parseTimeToMinutes(b.start);
            });

            for (var i = 0; i < sorted.length; i++) {
                var startMinutes = WebGuard.TimeUtils.parseTimeToMinutes(sorted[i].start);
                var windowDate = new Date(checkDate);
                windowDate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

                if (windowDate > now) {
                    return windowDate;
                }
            }
        }

        return null;
    },

    /**
     * Format a millisecond duration as "HH:MM:SS".
     */
    formatCountdown: function(ms) {
        if (ms <= 0) return '00:00:00';

        var totalSeconds = Math.floor(ms / 1000);
        var hours = Math.floor(totalSeconds / 3600);
        var minutes = Math.floor((totalSeconds % 3600) / 60);
        var seconds = totalSeconds % 60;

        return (hours < 10 ? '0' : '') + hours + ':' +
               (minutes < 10 ? '0' : '') + minutes + ':' +
               (seconds < 10 ? '0' : '') + seconds;
    },

    /**
     * Format a Date as a friendly time string like "Today at 7:00 PM"
     * or "Wednesday at 12:00 PM".
     */
    formatWindowTime: function(date) {
        var now = new Date();
        var tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        var prefix;
        if (date.toDateString() === now.toDateString()) {
            prefix = 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            prefix = 'Tomorrow';
        } else {
            var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            prefix = days[date.getDay()];
        }

        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        var timeStr = hours + ':' + (minutes < 10 ? '0' : '') + minutes + ' ' + ampm;

        return prefix + ' at ' + timeStr;
    }
};
