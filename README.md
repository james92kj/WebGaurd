# WebGuard

A browser extension for Chrome and Firefox that blocks distracting websites outside of user-defined allowed time windows. Stay focused during work hours, and access your favorite sites only when you choose to.

## Features

- **Website Blocking** — Add domains to your block list and they become inaccessible outside your allowed windows
- **Per-Day Scheduling** — Set different allowed time windows for each day of the week (e.g., weekdays 7–8 PM, weekends 12–4 PM). Supports multiple windows per day
- **Motivational Block Page** — When you try to visit a blocked site, you're greeted with a motivational quote and a live countdown to your next allowed window
- **Save URLs for Later** — See something interesting but it's not your allowed time? Save the URL and come back to it later
- **Quick Popup** — Add/remove blocked sites, view saved URLs, and toggle protection on/off from the toolbar popup
- **Full Settings Page** — Manage your block list, edit your weekly schedule with time pickers, and configure preferences
- **Notifications** — Get notified when your allowed browsing window opens, especially if you have saved URLs waiting
- **Cross-Browser** — Works on both Chrome (Manifest V3) and Firefox (Manifest V2)

## How It Works

```
Outside allowed window:  You visit reddit.com → Block page with quote + countdown + Save/Ignore
Inside allowed window:   You visit reddit.com → Site loads normally
```

## Installation

### Chrome

1. Clone or download this repository
2. Run the build script:
   ```bash
   ./build.sh
   ```
3. Open `chrome://extensions` in Chrome
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** and select the `dist/chrome/` folder

### Firefox

1. Clone or download this repository
2. Run the build script:
   ```bash
   ./build.sh
   ```
3. Open `about:debugging#/runtime/this-firefox` in Firefox
4. Click **Load Temporary Add-on**
5. Select `dist/firefox/manifest.json`

## Project Structure

```
WebGuard/
├── manifest.chrome.json          # Chrome Manifest V3
├── manifest.firefox.json         # Firefox Manifest V2
├── build.sh                      # Builds into dist/chrome and dist/firefox
├── vendor/
│   └── browser-polyfill.min.js   # WebExtension API polyfill
├── src/
│   ├── background/
│   │   ├── background.js         # Entry point — initialization, message routing, alarms
│   │   ├── blocker.js            # Blocking engine (declarativeNetRequest / webRequest)
│   │   ├── scheduler.js          # Alarm-based scheduling for window transitions
│   │   ├── storage.js            # CRUD operations for all stored data
│   │   └── notifications.js     # Browser notifications when windows open
│   ├── popup/
│   │   ├── popup.html/css/js     # Toolbar popup UI
│   ├── options/
│   │   ├── options.html/css/js   # Full settings page
│   ├── blocked/
│   │   ├── blocked.html/css/js   # Block page shown when a site is blocked
│   │   └── quotes.js            # Motivational quotes collection
│   ├── shared/
│   │   ├── constants.js          # Storage keys, defaults, day names
│   │   ├── time-utils.js         # Time window evaluation and formatting
│   │   └── browser-compat.js     # Chrome/Firefox detection
│   └── icons/
│       └── icon-{16,32,48,128}.png
└── dist/                         # Generated builds
    ├── chrome/
    └── firefox/
```

## Technical Details

### Cross-Browser Blocking Strategy

| Browser | API Used | How It Works |
|---------|----------|--------------|
| Chrome  | `declarativeNetRequest` | Dynamic redirect rules + `webNavigation` to capture the blocked URL |
| Firefox | `webRequest.onBeforeRequest` | Blocking listener that redirects with the URL as a query parameter |

### Data Storage

All data lives in `browser.storage.local`:

- **blockedSites** — Array of domains with enable/disable toggles
- **schedule** — Per-day allowed time windows (supports multiple windows per day and overnight spans)
- **savedUrls** — URLs saved from the block page for later viewing
- **settings** — Master toggle, notification preferences

### Built With

- Vanilla JavaScript, HTML, and CSS — no frameworks, no build tools beyond a shell script
- [webextension-polyfill](https://github.com/nicolo-ribaudo/webextension-polyfill) for cross-browser API compatibility

## Development

Make changes in the `src/` directory, then rebuild:

```bash
./build.sh
```

Reload the extension in your browser:
- **Chrome**: Click the refresh icon on `chrome://extensions`
- **Firefox**: Click "Reload" on `about:debugging`

## License

MIT
