# Changelog

## [1.1.5] - 2025-12-25

### Fixed

- Fixed a bug that would result in tabs losing their titles if you renamed a tab and switched URLs before closing and re-opening it.
- Fixed a bug with Arxiv PDFs using Chrome's built-in PDF viewer having titles overridden by Chrome. ([Issue #5 on GitHub](https://github.com/ahmad-PH/tab-renamer-extension/issues/5))
- Fixed a dark-theme issue that would sometimes make the entire background of the extension be fully black (instead of transparent) when Chrome itself was put in Dark Mode.

## [1.1.4] - 2025-05-05

### Fixed

- Fixed a regression where the extension would not corretly load stored names and favicons after a Chrome update, or abrupt restart. Added robust testing to prevent future regressions.

## [1.1.3] - 2025-04-13

### Fixed

- 🔑 **Complete Fix for Keystroke Registration**: Fully resolved the issue with keystrokes sometimes not being captured while typing in the tab rename box. This builds on the partial fix from v1.1.2 and should now work reliably across all websites.
  > Technical side-note: The issue was caused by certain websites implementing aggressive global event listeners that interfered with input handling. The fix completely isolates the extension's UI within an iframe, preventing external event manipulation.

## [1.1.2] - 2025-02-23

### Added

- 🌟 **Twemoji style for emojis**: You can now select between the native (system) style and the twemoji
style for your emojis. Mac users will have native as their default settings and users on other
platforms will have Twemoji as the default. This, together with some other fixes, (see below) should hopefully improve the emoji-selection exeprience for non-mac users. To change this style yourself
you can go to the setting page, available through the extension "options" page. This is also
accessible through a gear icon in the rename overlay.

### Fixed

- An issue with the rendering of the native style emojis on Windows causing them not to be appropriately centered in their places in the emoji picker.

- Partially fixed keystores not being captured appropriately while typing the tab name in some webpages. More fixes to come.

## [1.0.1] - 2024-06-09

### Fixed 
- Resolved an issue where the extension would not corretly load stored names and favicons after a Chrome update.

## [1.0.0] - 2024-05-13

### Initial Release
- First public release of the extension.
- **Core functionality**:
  - ✏️ Tab Renaming: Open a dialog to rename any tab with a simple keyboard shortcut.
  - 🎨 Favicon Customization with Emojis: Choose from an emojis using the built-in emoji picker to replace each tab's favicon, adding a custom visual element to each tab to make them more distinguishable.
  - 🔄 Persistent Names: Custom tab names and favicons are stored and will be preserved even when you close and reopen the tabs or even the entire window.
