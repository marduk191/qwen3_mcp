---
name: chrome-extension
description: "Use this skill when building, debugging, or modifying Google Chrome extensions. Triggers on: any mention of 'Chrome extension', 'browser extension', 'manifest.json', 'content script', 'background script', 'service worker' (in extension context), 'popup.html', 'chrome.tabs', 'chrome.runtime', 'chrome.storage', 'sidePanel', 'MV3', 'Manifest V3'. Covers full extension lifecycle from project setup to Chrome Web Store publishing."
license: MIT
metadata:
  author: marduk191
  version: "1.0.0"
---

# Chrome Extension Development Guide (Manifest V3)

Build production-ready Chrome extensions using Manifest V3. Covers project structure, all major APIs, messaging, storage, content scripts, service workers, side panels, and publishing.

## When to Use This Skill

- Creating a new Chrome extension from scratch
- Migrating an extension from MV2 to MV3
- Adding features like content scripts, popups, side panels, context menus, or devtools panels
- Debugging extension issues
- Preparing an extension for Chrome Web Store submission

---

## Project Structure

```
my-extension/
├── manifest.json          # Required: extension configuration
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── background.js          # Service worker (event-driven)
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/
│   ├── content.js         # Injected into web pages
│   └── content.css
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
├── sidepanel/
│   ├── sidepanel.html
│   └── sidepanel.js
└── _locales/              # Optional: internationalization
    └── en/
        └── messages.json
```

---

## Manifest V3 Reference

### Minimal Manifest

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "description": "A brief description of the extension.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Full Manifest with All Common Fields

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "description": "What it does in one sentence.",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    },
    "default_title": "Click me"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content/content.js"],
      "css": ["content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "permissions": [
    "storage",
    "activeTab",
    "contextMenus",
    "alarms",
    "notifications"
  ],
  "optional_permissions": [
    "tabs",
    "history",
    "bookmarks"
  ],
  "host_permissions": [
    "https://api.example.com/*"
  ],
  "optional_host_permissions": [
    "https://*/*"
  ],
  "options_page": "options/options.html",
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  },
  "web_accessible_resources": [
    {
      "resources": ["images/*", "styles/*"],
      "matches": ["https://*.example.com/*"]
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "externally_connectable": {
    "matches": ["https://*.example.com/*"]
  },
  "commands": {
    "_execute_action": {
      "suggested_key": { "default": "Ctrl+Shift+Y" },
      "description": "Open the popup"
    },
    "toggle-feature": {
      "suggested_key": { "default": "Ctrl+Shift+U" },
      "description": "Toggle the feature"
    }
  },
  "minimum_chrome_version": "116"
}
```

### Manifest Key Reference

| Key | Required | Description |
|-----|----------|-------------|
| `manifest_version` | Yes | Must be `3` |
| `name` | Yes | Extension name (max 45 chars) |
| `version` | Yes | Semver string like `"1.0.0"` |
| `description` | Recommended | Max 132 characters |
| `icons` | Recommended | 16, 48, 128px PNG icons |
| `action` | No | Toolbar button: popup, icon, title, badge |
| `background` | No | Service worker file and optional `"type": "module"` |
| `content_scripts` | No | Declarative content script injection |
| `permissions` | No | API access (shown at install) |
| `optional_permissions` | No | API access requested at runtime |
| `host_permissions` | No | URL access (shown at install) |
| `optional_host_permissions` | No | URL access requested at runtime |
| `options_page` | No | Settings page |
| `side_panel` | No | Side panel HTML (Chrome 114+) |
| `devtools_page` | No | DevTools panel HTML |
| `web_accessible_resources` | No | Resources content scripts can access |
| `commands` | No | Keyboard shortcuts |
| `externally_connectable` | No | Allow messages from web pages |
| `content_security_policy` | No | CSP overrides |

### Content Script `run_at` Values

| Value | When |
|-------|------|
| `document_idle` | Default. After DOM complete, before images/subresources |
| `document_end` | After DOM complete |
| `document_start` | Before any DOM is constructed |

---

## Permissions Reference

### Common Permissions

| Permission | Description |
|------------|-------------|
| `activeTab` | Temporary access to current tab on user gesture (preferred over broad host perms) |
| `storage` | `chrome.storage` API |
| `tabs` | Read tab URL/title (sensitive) |
| `contextMenus` | Right-click menu items |
| `alarms` | Scheduled events |
| `notifications` | Desktop notifications |
| `scripting` | Programmatic script injection |
| `sidePanel` | Side panel UI |
| `offscreen` | Offscreen document for DOM access |
| `declarativeNetRequest` | Request blocking/modifying |
| `downloads` | Download management |
| `history` | Browser history |
| `bookmarks` | Bookmark management |
| `cookies` | Cookie access (also needs host_permissions) |
| `identity` | OAuth2 authentication |
| `webNavigation` | Navigation event monitoring |
| `unlimitedStorage` | Remove storage.local 10MB limit |

### Best Practice: Minimize Permissions

- Prefer `activeTab` over broad `host_permissions` when possible
- Use `optional_permissions` for features that aren't always needed
- Request optional permissions at runtime when the user triggers the feature

```javascript
// Request optional permission when user clicks a button
document.getElementById('enable-feature').addEventListener('click', async () => {
  const granted = await chrome.permissions.request({
    permissions: ['history'],
    origins: ['https://api.example.com/*']
  });
  if (granted) {
    enableHistoryFeature();
  }
});
```

---

## Background Service Worker

The service worker is the extension's central event handler. It runs **only when needed** and is terminated when idle. Never rely on global state — persist to `chrome.storage`.

### Basic Service Worker

```javascript
// background.js

// Runs once on install or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // First install: set defaults
    chrome.storage.local.set({
      settings: { enabled: true, theme: 'light' },
      stats: { totalUses: 0 }
    });

    // Create context menu
    chrome.contextMenus.create({
      id: 'myContextMenu',
      title: 'Do something with "%s"',
      contexts: ['selection']
    });
  }

  if (details.reason === 'update') {
    console.log(`Updated from ${details.previousVersion}`);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'myContextMenu') {
    const selectedText = info.selectionText;
    // Process the selected text
    chrome.tabs.sendMessage(tab.id, {
      action: 'processSelection',
      text: selectedText
    });
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getData') {
    fetchData(message.query).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.action === 'getTabInfo') {
    sendResponse({ tabId: sender.tab?.id, url: sender.tab?.url });
  }
});

// Alarms for periodic tasks
chrome.alarms.create('periodicSync', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicSync') {
    syncData();
  }
});

async function fetchData(query) {
  const response = await fetch(`https://api.example.com/search?q=${query}`);
  return response.json();
}

async function syncData() {
  const { settings } = await chrome.storage.local.get('settings');
  if (settings.enabled) {
    // Perform sync
  }
}
```

### Service Worker Lifecycle Rules

1. **No global state** — service worker can be terminated at any time. Use `chrome.storage.session` for temporary state.
2. **No DOM access** — use offscreen documents if you need DOM parsing.
3. **Event-driven** — register all listeners at the top level, not inside callbacks.
4. **No `setTimeout`/`setInterval`** for long delays — use `chrome.alarms` instead.
5. **Module support** — set `"type": "module"` in manifest to use ES imports.

```javascript
// WRONG: listener registered inside async callback (may be lost)
chrome.storage.local.get('config').then(({ config }) => {
  chrome.runtime.onMessage.addListener(handler); // May not register!
});

// CORRECT: register listener at top level
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Access storage inside the handler
  chrome.storage.local.get('config').then(({ config }) => {
    // Use config
    sendResponse({ result: config });
  });
  return true;
});
```

---

## Content Scripts

Content scripts run in the context of web pages. They can read and modify the DOM but live in an **isolated world** (no access to page JS variables).

### Declarative Injection (manifest.json)

```json
"content_scripts": [
  {
    "matches": ["https://*.example.com/*", "https://other-site.com/page/*"],
    "exclude_matches": ["https://example.com/admin/*"],
    "js": ["content/content.js"],
    "css": ["content/content.css"],
    "run_at": "document_idle",
    "all_frames": false
  }
]
```

### Programmatic Injection

```javascript
// From background.js or popup.js — requires "scripting" permission
chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content/inject.js']
});

// Inject a function directly
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: (param) => {
    document.title = `Modified: ${param}`;
    return document.title;
  },
  args: ['hello']
});

// Inject CSS
chrome.scripting.insertCSS({
  target: { tabId: tabId },
  css: 'body { border: 2px solid red; }'
});
```

### Dynamic Registration (Chrome 96+)

```javascript
// Register at runtime — persists across restarts
chrome.scripting.registerContentScripts([
  {
    id: 'my-script',
    matches: ['https://*.example.com/*'],
    js: ['content/dynamic.js'],
    runAt: 'document_idle'
  }
]);

// Unregister
chrome.scripting.unregisterContentScripts({ ids: ['my-script'] });
```

### Content Script Example: DOM Modification

```javascript
// content/content.js

// Wait for DOM ready
function init() {
  // Add custom UI
  const panel = document.createElement('div');
  panel.id = 'my-extension-panel';
  panel.innerHTML = `
    <div style="position:fixed;bottom:10px;right:10px;z-index:99999;
                background:#fff;border:1px solid #ccc;padding:12px;
                border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);
                font-family:system-ui;">
      <h3 style="margin:0 0 8px">My Extension</h3>
      <button id="my-ext-btn">Click Me</button>
      <div id="my-ext-output"></div>
    </div>
  `;
  document.body.appendChild(panel);

  document.getElementById('my-ext-btn').addEventListener('click', async () => {
    // Send message to background
    const response = await chrome.runtime.sendMessage({
      action: 'getData',
      query: document.title
    });
    document.getElementById('my-ext-output').textContent = JSON.stringify(response);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

### Content Script API Access

Content scripts can directly use:
- `chrome.runtime` (sendMessage, connect, getURL, getManifest, onMessage, onConnect)
- `chrome.storage` (all methods)
- `chrome.i18n` (getMessage)
- `chrome.dom` (openOrClosedShadowRoot)

All other APIs require message passing through the service worker.

---

## Popup Extension

### popup/popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 320px;
      min-height: 200px;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
    }
    h1 { font-size: 18px; margin: 0 0 12px; }
    button {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: #4285f4;
      color: white;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover { background: #3367d6; }
    #output {
      margin-top: 12px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 13px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <h1>My Extension</h1>
  <button id="action-btn">Do Something</button>
  <div id="output"></div>
  <script src="popup.js"></script>
</body>
</html>
```

### popup/popup.js

```javascript
document.getElementById('action-btn').addEventListener('click', async () => {
  const output = document.getElementById('output');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Send message to content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getPageData'
    });
    output.textContent = JSON.stringify(response, null, 2);
  } catch (err) {
    output.textContent = `Error: ${err.message}`;
  }
});

// Load saved state on popup open
document.addEventListener('DOMContentLoaded', async () => {
  const { settings } = await chrome.storage.local.get('settings');
  if (settings) {
    // Apply saved settings to UI
  }
});
```

---

## Side Panel (Chrome 114+)

### Manifest Configuration

```json
{
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  }
}
```

### Open Side Panel on Action Click

```javascript
// background.js — open side panel instead of popup
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
```

### Tab-Specific Side Panels

```javascript
// background.js — enable side panel only on certain sites
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);
  await chrome.sidePanel.setOptions({
    tabId,
    path: 'sidepanel/sidepanel.html',
    enabled: url.hostname === 'github.com'
  });
});
```

---

## Options Page

### options/options.html

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui; padding: 20px; max-width: 500px; }
    label { display: block; margin: 12px 0 4px; font-weight: 600; }
    input[type="text"], select {
      width: 100%; padding: 8px; border: 1px solid #ccc;
      border-radius: 4px; box-sizing: border-box;
    }
    .saved { color: green; display: none; margin-top: 8px; }
    button { margin-top: 16px; padding: 8px 24px; }
  </style>
</head>
<body>
  <h1>Extension Settings</h1>
  <label for="apiKey">API Key</label>
  <input type="text" id="apiKey" placeholder="Enter your API key">

  <label for="theme">Theme</label>
  <select id="theme">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
    <option value="auto">Auto</option>
  </select>

  <label>
    <input type="checkbox" id="notifications"> Enable notifications
  </label>

  <button id="save">Save Settings</button>
  <div class="saved" id="saved-msg">Settings saved!</div>

  <script src="options.js"></script>
</body>
</html>
```

### options/options.js

```javascript
// Load saved settings
document.addEventListener('DOMContentLoaded', async () => {
  const { settings } = await chrome.storage.sync.get('settings');
  if (settings) {
    document.getElementById('apiKey').value = settings.apiKey || '';
    document.getElementById('theme').value = settings.theme || 'light';
    document.getElementById('notifications').checked = settings.notifications ?? true;
  }
});

// Save settings
document.getElementById('save').addEventListener('click', async () => {
  const settings = {
    apiKey: document.getElementById('apiKey').value,
    theme: document.getElementById('theme').value,
    notifications: document.getElementById('notifications').checked
  };

  await chrome.storage.sync.set({ settings });

  const msg = document.getElementById('saved-msg');
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 2000);
});
```

---

## Storage API

### Storage Areas

| Area | Quota | Syncs | Persists | Best For |
|------|-------|-------|----------|----------|
| `storage.local` | 10 MB (or unlimited) | No | Until uninstall | Large data, local settings |
| `storage.sync` | 100 KB total, 8 KB/item | Yes, across devices | Until uninstall | User preferences |
| `storage.session` | 10 MB | No | Until browser restart | Temporary state, auth tokens |

### Usage Patterns

```javascript
// Write
await chrome.storage.local.set({ key: 'value', complex: { nested: true } });

// Read
const { key, complex } = await chrome.storage.local.get(['key', 'complex']);

// Read all
const allData = await chrome.storage.local.get(null);

// Remove
await chrome.storage.local.remove('key');
await chrome.storage.local.remove(['key1', 'key2']);

// Clear everything
await chrome.storage.local.clear();

// Watch for changes (works in all contexts)
chrome.storage.onChanged.addListener((changes, areaName) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`[${areaName}] ${key}: ${oldValue} -> ${newValue}`);
  }
});
```

### Service Worker State Pattern

```javascript
// background.js — use storage.session for temporary state
// since service workers can be terminated at any time

async function incrementCounter() {
  const { count = 0 } = await chrome.storage.session.get('count');
  await chrome.storage.session.set({ count: count + 1 });
  return count + 1;
}
```

---

## Messaging Patterns

### One-Time Messages

```javascript
// Content script or popup -> Service worker
const response = await chrome.runtime.sendMessage({
  action: 'fetchData',
  url: 'https://api.example.com/data'
});

// Service worker -> Content script (specific tab)
const response = await chrome.tabs.sendMessage(tabId, {
  action: 'highlight',
  selector: '.target'
});

// Service worker listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchData') {
    fetch(message.url)
      .then(r => r.json())
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // REQUIRED for async sendResponse
  }
});
```

### Long-Lived Connections (Ports)

```javascript
// Content script
const port = chrome.runtime.connect({ name: 'stream' });
port.postMessage({ subscribe: 'updates' });
port.onMessage.addListener((msg) => {
  console.log('Received:', msg);
});
port.onDisconnect.addListener(() => {
  console.log('Port closed');
});

// Service worker
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'stream') return;
  port.onMessage.addListener((msg) => {
    if (msg.subscribe === 'updates') {
      // Send periodic updates
      port.postMessage({ update: 'new data' });
    }
  });
});
```

### Web Page to Extension

```json
// manifest.json
"externally_connectable": {
  "matches": ["https://yoursite.com/*"]
}
```

```javascript
// On your website
chrome.runtime.sendMessage('YOUR_EXTENSION_ID', { action: 'login', token: 'abc' },
  (response) => { console.log(response); }
);

// In service worker
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (sender.origin !== 'https://yoursite.com') return;
  sendResponse({ success: true });
});
```

---

## Context Menus

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  // Parent menu
  chrome.contextMenus.create({
    id: 'parent',
    title: 'My Extension',
    contexts: ['all']
  });

  // Child items
  chrome.contextMenus.create({
    id: 'search-selection',
    parentId: 'parent',
    title: 'Search "%s"',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'save-image',
    parentId: 'parent',
    title: 'Save this image',
    contexts: ['image']
  });

  chrome.contextMenus.create({
    id: 'open-link',
    parentId: 'parent',
    title: 'Open in new tab',
    contexts: ['link']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'search-selection':
      chrome.tabs.create({
        url: `https://google.com/search?q=${encodeURIComponent(info.selectionText)}`
      });
      break;
    case 'save-image':
      chrome.downloads.download({ url: info.srcUrl });
      break;
    case 'open-link':
      chrome.tabs.create({ url: info.linkUrl });
      break;
  }
});
```

### Context Types

| Context | Where it shows |
|---------|---------------|
| `all` | Everywhere |
| `page` | Page background |
| `selection` | Selected text |
| `link` | Over a link |
| `image` | Over an image |
| `video` | Over a video |
| `audio` | Over audio |
| `editable` | In text fields |
| `action` | Extension toolbar icon |
| `browser_action` | Deprecated, use `action` |

---

## DeclarativeNetRequest (Replaces webRequest Blocking)

```json
// manifest.json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "my_rules",
        "enabled": true,
        "path": "rules.json"
      }
    ]
  }
}
```

```json
// rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "tracker.example.com",
      "resourceTypes": ["script", "image", "xmlhttprequest"]
    }
  },
  {
    "id": 2,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": { "url": "https://new-api.example.com/v2" }
    },
    "condition": {
      "urlFilter": "old-api.example.com/v1",
      "resourceTypes": ["xmlhttprequest"]
    }
  },
  {
    "id": 3,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "X-Custom", "operation": "set", "value": "my-value" }
      ]
    },
    "condition": {
      "urlFilter": "api.example.com",
      "resourceTypes": ["xmlhttprequest"]
    }
  }
]
```

### Dynamic Rules (Runtime)

```javascript
// Add rules at runtime
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 100,
      priority: 1,
      action: { type: 'block' },
      condition: { urlFilter: 'ads.example.com', resourceTypes: ['script'] }
    }
  ],
  removeRuleIds: [100] // Remove existing rule with this ID first
});
```

---

## DevTools Panel

### manifest.json

```json
{
  "devtools_page": "devtools/devtools.html"
}
```

### devtools/devtools.html

```html
<!DOCTYPE html>
<html>
<body>
  <script src="devtools.js"></script>
</body>
</html>
```

### devtools/devtools.js

```javascript
chrome.devtools.panels.create(
  'My Panel',
  'icons/icon16.png',
  'devtools/panel.html',
  (panel) => {
    panel.onShown.addListener((window) => {
      // Panel is visible
    });
  }
);

// Access inspected page
chrome.devtools.inspectedWindow.eval(
  'document.querySelectorAll("a").length',
  (result, error) => {
    if (!error) console.log(`Found ${result} links`);
  }
);
```

---

## Action API (Toolbar Button)

```javascript
// Set badge
chrome.action.setBadgeText({ text: '42' });
chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });

// Change icon dynamically
chrome.action.setIcon({
  path: { "16": "icons/active16.png", "48": "icons/active48.png" }
});

// Disable for specific tab
chrome.action.disable(tabId);
chrome.action.enable(tabId);

// Handle click (when no popup is set)
chrome.action.onClicked.addListener((tab) => {
  // Toggle something on click
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content/toggle.js']
  });
});
```

---

## Keyboard Shortcuts

```json
// manifest.json
"commands": {
  "_execute_action": {
    "suggested_key": {
      "default": "Ctrl+Shift+Y",
      "mac": "Command+Shift+Y"
    },
    "description": "Open the extension"
  },
  "toggle-feature": {
    "suggested_key": {
      "default": "Alt+T"
    },
    "description": "Toggle the feature"
  }
}
```

```javascript
// background.js
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-feature') {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
  }
});
```

---

## Common Extension Patterns

### Pattern: Tab Manager

```json
{
  "permissions": ["tabs"],
  "action": { "default_popup": "popup/popup.html" }
}
```

```javascript
// popup.js
const tabs = await chrome.tabs.query({ currentWindow: true });
tabs.forEach(tab => {
  // Render tab list
});

// Close duplicate tabs
const seen = new Map();
for (const tab of tabs) {
  if (seen.has(tab.url)) {
    chrome.tabs.remove(tab.id);
  } else {
    seen.set(tab.url, tab.id);
  }
}
```

### Pattern: Page Modifier with Toggle

```javascript
// background.js
const enabledTabs = new Set();

chrome.action.onClicked.addListener(async (tab) => {
  if (enabledTabs.has(tab.id)) {
    enabledTabs.delete(tab.id);
    chrome.action.setBadgeText({ text: '', tabId: tab.id });
    chrome.scripting.removeCSS({ target: { tabId: tab.id }, files: ['content/styles.css'] });
  } else {
    enabledTabs.add(tab.id);
    chrome.action.setBadgeText({ text: 'ON', tabId: tab.id });
    chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content/styles.css'] });
    chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/modifier.js'] });
  }
});
```

### Pattern: Alarm-Based Periodic Worker

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('check-updates', { periodInMinutes: 15 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'check-updates') {
    const data = await fetch('https://api.example.com/updates').then(r => r.json());
    if (data.hasUpdates) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'New Updates Available',
        message: data.summary
      });
    }
  }
});
```

---

## MV3 Gotchas and Pitfalls

### No Remote Code Execution
You cannot load or execute JavaScript from external URLs. All code must be bundled in the extension package. Use `fetch()` for data only.

### Service Worker Termination
Service workers terminate after ~30 seconds of inactivity. Never rely on in-memory state. Use `chrome.storage.session` for temporary state.

### Register All Listeners at Top Level
Event listeners must be registered synchronously at the top level of the service worker, not inside async callbacks or conditionals.

### No eval() or new Function()
MV3 CSP blocks `eval()`, `new Function()`, and inline scripts. Use message passing or structured data instead.

### Content Script Isolation
Content scripts cannot access page JavaScript variables. Use `window.postMessage()` to communicate with page scripts if needed.

### Web Accessible Resources Must Be Declared
Resources used by content scripts (images, CSS, HTML) must be listed in `web_accessible_resources` with specific match patterns.

---

## Debugging

### Loading Unpacked Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select your extension directory
4. Click the reload button after making changes

### Debugging Service Worker
1. On `chrome://extensions/`, find your extension
2. Click "Inspect views: service worker" link
3. Use DevTools console and debugger

### Debugging Content Scripts
1. Open DevTools on the target page (F12)
2. Go to Sources > Content scripts > your extension
3. Set breakpoints and debug

### Debugging Popup
1. Right-click the extension icon
2. Select "Inspect popup"
3. DevTools opens for the popup context

### Common Error: "Could not establish connection"
The target tab doesn't have a content script loaded. Either the page doesn't match your content_scripts patterns, or the page was loaded before the extension. Reload the tab.

### Common Error: "Cannot access a chrome:// URL"
Extensions cannot inject content scripts into `chrome://` pages, `chrome-extension://` pages, or the Chrome Web Store.

---

## Publishing to Chrome Web Store

### Requirements
1. **Developer account** — one-time $5 registration at [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. **Package** — ZIP file of your extension directory (without `node_modules`, `.git`, etc.)
3. **Store listing assets**:
   - At least one screenshot (1280x800 or 640x400)
   - Detailed description
   - Category selection
   - Optional: promotional images (440x280 small, 920x680 large)
4. **Privacy policy** — required if extension handles user data
5. **Permissions justification** — explain why each permission is needed

### Creating the ZIP

```bash
# From the extension directory
zip -r extension.zip . -x "*.git*" "node_modules/*" "*.map" "*.ts" "src/*"
```

### Review Process
- First submissions: typically 1-3 business days
- Updates: usually faster, often same day
- Extensions requesting broad host permissions or sensitive APIs take longer
- Rejections include specific reasons and guidance

### Version Updates
Increment the `version` in manifest.json, upload new ZIP to the developer dashboard, and submit for review.

---

## Build Tooling (Optional)

For TypeScript or larger extensions, use a bundler:

### Vite Config for Chrome Extension

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/popup.html'),
        options: resolve(__dirname, 'options/options.html'),
        background: resolve(__dirname, 'background.js'),
        content: resolve(__dirname, 'content/content.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  }
});
```

### TypeScript Setup

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "types": ["chrome"]
  },
  "include": ["src/**/*.ts"]
}
```

```bash
npm install -D typescript @types/chrome
```

---

## Quick Start Checklist

1. Create project directory with the structure above
2. Write `manifest.json` with required fields
3. Create icons (16, 48, 128px PNG)
4. Implement core feature (popup, content script, or background)
5. Load unpacked at `chrome://extensions/`
6. Test and debug using DevTools
7. Add permissions as needed (minimal set)
8. Test on multiple sites and edge cases
9. ZIP and upload to Chrome Web Store
