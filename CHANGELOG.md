# Changelog

## [1.1.0] - 2024-12-29

### Added

- 🌟 **Twemoji style for emojis**: You can now select between the native (system) style and the twemoji
style for your emojis. Mac users will have native as their default settings and users on other
platforms will have Twemoji as the default. This, together with some other fixes, (see below) should hopefully improve the emoji-selection exeprience for non-mac users. To change this style yourself
you can go to the setting page, available through the extension "options" page. This is also
accessible through a gear icon in the rename overlay.

### Fixed

- An issue with the rendering of the native style emojis on Windows causing them not to be appropriately centered in their places in the emoji picker.

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