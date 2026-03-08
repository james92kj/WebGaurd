/* global WebGuard, chrome */

(async function() {
    'use strict';

    var blockedUrl = null;

    // --- Determine the blocked URL ---
    // Firefox: passed via query parameter
    // Chrome: stored in session storage by background.js

    var params = new URLSearchParams(window.location.search);
    if (params.get('url')) {
        blockedUrl = decodeURIComponent(params.get('url'));
    } else if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
        // Chrome: read from session storage
        try {
            var sessionData = await chrome.storage.session.get(['lastBlockedUrl']);
            if (sessionData.lastBlockedUrl) {
                blockedUrl = sessionData.lastBlockedUrl;
            }
        } catch (e) {
            // session storage may not be available in all contexts
        }
    }

    // --- Display blocked URL ---
    var blockedUrlEl = document.getElementById('blockedUrl');
    if (blockedUrl) {
        blockedUrlEl.textContent = 'Trying to visit: ' + blockedUrl;
    }

    // --- Display motivational quote ---
    var quote = WebGuard.Quotes[Math.floor(Math.random() * WebGuard.Quotes.length)];
    document.getElementById('quoteText').textContent = quote.text;
    document.getElementById('quoteAuthor').textContent = quote.author;

    // --- Countdown timer ---
    var countdownTimerEl = document.getElementById('countdownTimer');
    var countdownDetailEl = document.getElementById('countdownDetail');

    var schedule = await WebGuard.Storage.getSchedule();
    var nextWindow = WebGuard.TimeUtils.getNextWindowStart(schedule);

    function updateCountdown() {
        if (!nextWindow) {
            countdownTimerEl.textContent = '--:--:--';
            countdownDetailEl.textContent = 'No upcoming allowed window set';
            return;
        }

        var remaining = nextWindow.getTime() - Date.now();

        if (remaining <= 0) {
            countdownTimerEl.textContent = '00:00:00';
            countdownDetailEl.textContent = 'Your window is now open!';
            return;
        }

        countdownTimerEl.textContent = WebGuard.TimeUtils.formatCountdown(remaining);
        countdownDetailEl.textContent = WebGuard.TimeUtils.formatWindowTime(nextWindow);
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);

    // --- Save URL button ---
    var saveUrlBtn = document.getElementById('saveUrlBtn');
    var savedMessage = document.getElementById('savedMessage');

    if (!blockedUrl) {
        saveUrlBtn.disabled = true;
    }

    saveUrlBtn.addEventListener('click', async function() {
        if (!blockedUrl) return;

        var result = await WebGuard.Storage.addSavedUrl(blockedUrl);
        if (result === null) {
            savedMessage.textContent = 'This URL is already saved.';
        } else {
            savedMessage.textContent = 'URL saved! You can access it from the WebGuard popup.';
        }
        savedMessage.classList.add('visible');
        saveUrlBtn.disabled = true;
    });

    // --- Go Back button ---
    document.getElementById('goBackBtn').addEventListener('click', function() {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    });
})();
