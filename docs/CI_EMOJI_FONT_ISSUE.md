# CI Emoji Font Rendering Issue

## Problem Summary

Two Playwright tests were consistently failing on GitHub Actions CI but passing locally:
- `Chrome restart handling: Tab titles are restored correctly when chrome is restarted`
- `Retains tab signature when tab is re-opened`

Both tests failed with the same error at `assertFaviconIsEmoji()`:
```
Error: expect(received).toBe(expected) // Object.is equality
Expected: true
Received: false
Timeout 5000ms exceeded while waiting on the predicate
```

## Root Cause

### The Technical Issue

The extension uses the `emojiToDataURL()` function in `src/utils.js` to convert emoji characters into data URLs for use as favicons:

```javascript
export function emojiToDataURL(emoji, sideLength = 64) {
    const canvas = document.createElement('canvas');
    canvas.width = sideLength;
    canvas.height = sideLength;
    
    const ctx = canvas.getContext('2d');
    ctx.font = `${sideLength}px serif`;
    const textX = platform === 'win' ? -12 : 0;
    ctx.fillText(emoji, textX, sideLength - 8);
    return canvas.toDataURL();
}
```

This function relies on the HTML canvas API to render emoji characters into PNG images. The canvas rendering requires appropriate **emoji fonts** to be installed on the system.

### Why It Failed on CI

GitHub Actions Ubuntu runners (`ubuntu-latest`) do not have emoji fonts installed by default. When the canvas attempts to render an emoji:
- The system cannot find the appropriate font glyphs for emoji characters
- The canvas either renders blank, renders fallback characters (like □), or fails silently
- The resulting data URL doesn't match what the test expects
- The test assertion `assertFaviconIsEmoji()` fails because it checks if the favicon href starts with `data:image/png;base64,`

### Why It Worked Locally

On macOS (the local development environment), the **Apple Color Emoji** font is installed by default, allowing the canvas to successfully render emojis and generate proper data URLs.

### Test Validation Logic

The `assertFaviconIsEmoji()` method in `tests/e2e/extensionUtils.ts` verifies:
1. The favicon link's `rel` attribute contains "icon"
2. The `href` starts with `data:image/png;base64,` (for native emoji style) or the Twemoji CDN URL
3. The `type` attribute equals `image/x-icon`

Without emoji fonts, step 2 fails because the canvas cannot generate a valid PNG data URL.

## Solution

Install emoji fonts on the CI runner before executing tests. We use **Noto Color Emoji**, which is:
- Available in Ubuntu's package repositories
- Well-supported and actively maintained by Google
- Compatible with modern browsers and canvas rendering

### Implementation

Added a step to `.github/workflows/ci.yml` after the "Install Playwright Browsers" step:

```yaml
- name: Install emoji fonts for canvas rendering
  run: |
    sudo apt-get update
    sudo apt-get install -y fonts-noto-color-emoji
    fc-cache -f -v
```

The `fc-cache -f -v` command ensures the font cache is refreshed, making the newly installed fonts immediately available to applications.

## Affected Tests

### 1. Chrome Restart Handling Test
**File:** `tests/e2e/chrome-restart-handling.spec.ts`

This test verifies that tab signatures (custom titles and emoji favicons) are correctly restored when Chrome is restarted:
- Sets a signature with title "Title1" and emoji "😀"
- Closes the browser context and restarts it
- Navigates to the same URL
- Asserts the favicon is rendered as an emoji

### 2. Signature Retention Test
**File:** `tests/e2e/signature-retention.spec.ts`

This test verifies that tab signatures persist when a tab is closed and reopened:
- Sets a custom title "New title" and emoji "🙃"
- Closes the tab and reopens it at the same URL
- Asserts the favicon is rendered as an emoji
- Verifies the signature is retained in the extension's UI

## Alternative Solutions Considered

1. **Use Twemoji exclusively for tests**: Would require test-specific configuration and wouldn't validate the native emoji rendering path
2. **Run Chrome in headed mode**: Requires xvfb setup and doesn't solve the underlying font issue
3. **Mock the favicon check**: Would bypass the actual functionality being tested
4. **Install multiple emoji fonts**: Overkill; Noto Color Emoji provides comprehensive coverage

## Verification

After implementing the fix, all 27 tests should pass on CI, including the two previously failing tests. The CI logs should show:
- Successful installation of `fonts-noto-color-emoji`
- Font cache refresh completion
- All Playwright tests passing

## References

- Extension's emoji-to-favicon conversion: `src/utils.js` (`emojiToDataURL` function)
- Favicon verification logic: `tests/e2e/extensionUtils.ts` (`assertFaviconIsEmoji` method)
- Favicon implementation: `src/favicon.js` (`SystemEmojiFavicon` class)
- CI workflow: `.github/workflows/ci.yml`

