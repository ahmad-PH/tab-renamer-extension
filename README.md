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
</p>

---

## Features

- **✏️ Tab Renaming:** Open a dialog to rename any tab with a simple keyboard shortcut.
- **🎨 Favicon Customization with Emojis:** Choose from a wide range of emojis using the built-in emoji picker to replace each tab's favicon, adding a custom visual element to each tab to make them more distinguishable.
- **🔄 Persistent Names:** Your custom tab names and favicons are stored and will be preserved even when you close and reopen the tabs or even the entire window.
---

## Technical Overview

### Tech Stack

| Technology | Purpose |
|------------|---------|
| TypeScript | Type Safety! |
| React | UI components |
| Material UI | Component styling |
| Webpack | Module bundling |
| Datadog | Centralized Logging (active only in development mode)
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
- **Twitter/X:** [@_ahmad_ph_](https://x.com/_ahmad_ph_)
- **BlueSky:** [@ahmad-ph.bsky.social](https://bsky.app/profile/ahmad-ph.bsky.social)
- **GitHub Issues:** [Report a bug or request a feature](https://github.com/ahmad-PH/tab-renamer-extension/issues)

---

## License

ISC License — See [LICENSE](LICENSE) for details.

