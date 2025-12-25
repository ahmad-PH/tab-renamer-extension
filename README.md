<p align="center">
  <img src="src/assets/icon128.png" alt="Tab Renamer Logo" width="128" height="128">
</p>

<h1 align="center">Tab Renamer</h1>

<p align="center">
  <strong>Customize your tab titles and favicons for a more organized browsing experience.</strong>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/tab-renamer/mncaahedchkhclokjmfjbennhbeceecl">
    <img src="https://img.shields.io/chrome-web-store/v/mncaahedchkhclokjmfjbennhbeceecl?style=flat-square" alt="Chrome Web Store">
  </a>
  <img src="https://img.shields.io/badge/manifest-v3-blue?style=flat-square" alt="Manifest V3">
  <img src="https://img.shields.io/badge/license-ISC-green?style=flat-square" alt="License">
</p>

---

## Features

- **Tab Renaming** — Open a dialog to rename any tab with a simple keyboard shortcut.
- **Favicon Customization with Emojis** — Choose from a wide range of emojis using the built-in emoji picker to replace each tab's favicon, making tabs more distinguishable at a glance.
- **Persistent Names** — Your custom tab names and favicons are stored and preserved even when you close and reopen tabs, or restart your browser entirely.
- **Cross-Platform Emoji Support** — Toggle between native system emojis and Twemoji for consistent emoji rendering across all platforms.

---

## How to Use

There are three ways to activate the extension on any page:

### Keyboard Shortcut

The default shortcut is **Ctrl+Shift+Y** (or **Cmd+Shift+Y** on Mac).

> **Note:** This shortcut may not be set automatically if it conflicts with existing shortcuts. You can configure it at `chrome://extensions/shortcuts` under "Tab Renamer".

### Context Menu

Right-click anywhere on a webpage and select **"Rename Tab"** from the context menu.

### Extension Icon

Click the Tab Renamer icon in your browser toolbar. If the extension isn't pinned, click the puzzle piece icon to find it.

---

## Reverting to Original Values

To restore a tab's original title or favicon, simply leave the corresponding input field empty when saving.

---

## Technical Overview

### Tech Stack

| Technology | Purpose |
|------------|---------|
| TypeScript | Type-safe development |
| React 18 | UI components |
| Manifest V3 | Chrome Extension API |
| Webpack | Module bundling |
| Material UI | Component styling |
| Twemoji | Cross-platform emoji rendering |

### Architecture

```
src/
├── background/          # Service worker - core operations, storage, favicon caching
├── contentScript/       # React-based UI overlay (iframe-isolated)
├── settings/            # Extension options page
├── repositories/        # Data persistence layer
└── log/                 # Logging infrastructure
```

- **Service Worker** (`background/`) — Handles tab events, storage management, favicon caching, and communication with content scripts.
- **Content Scripts** (`contentScript/`) — Injects the rename dialog UI into pages. Uses iframe isolation to prevent interference from page scripts.
- **Settings Page** (`settings/`) — Configuration UI for emoji style preferences.
- **Repositories** (`repositories/`) — Abstraction layer for Chrome storage APIs.

### Development

See [docs/development.md](docs/development.md) for setup instructions and development workflows.

---

## Support

If you enjoy using Tab Renamer, consider supporting the project:

<a href="https://buymeacoffee.com/ahmadph" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50">
</a>

### Get in Touch

- **Email:** [tabrenamer@gmail.com](mailto:tabrenamer@gmail.com)
- **BlueSky:** [@ahmad-ph.bsky.social](https://bsky.app/profile/ahmad-ph.bsky.social)
- **GitHub Issues:** [Report a bug or request a feature](https://github.com/ahmad-PH/tab-renamer-extension/issues)

---

## License

ISC License — See [LICENSE](LICENSE) for details.

