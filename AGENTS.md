# AGENTS.md

## What this is
Typeset is a static, client-side converter from plain text to HTML. It has no backend, no build step, and no dependencies. Netlify publishes `public/` directly (see `netlify.toml`).

## Layout
- `public/index.html`: the single page (masthead, input sheet, options, output sheet, syntax guide).
- `public/convert.js`: the conversion engine. Its pure functions are exposed as `window.Typeset` (`convert`, `escapeHtml`, `firstHeading`, `previewCss`). It never touches the DOM, so you can test it in Node with `require('./public/convert.js'); globalThis.Typeset.convert(text, opts)`.
- `public/app.js`: UI wiring (rendering, options, file loading and drag-and-drop, copy/download, localStorage persistence under the `typeset:v1` key).
- `public/styles.css`: all styling. Design tokens are CSS variables in `:root` (paper/ink/vermilion palette, Fraunces display font, IBM Plex Mono for the UI).

## Conventions and decisions
- Vanilla ES5-style JS inside IIFEs. Keep it build-free.
- **Security:** all user text goes through `escapeHtml`. Links and code spans are first replaced with placeholder tokens (`\u0001n\u0001` and `\u0000n\u0000`) so that escaping and emphasis regexes don't corrupt them. Keep that ordering if you add inline rules. The preview iframe is sandboxed without `allow-scripts` or `allow-same-origin`.
- `convert` options: `structure`, `inline`, `links`, `breaks`, `smart`, `document`, `title`. To add a new option, add it to the defaults in `convert`, a checkbox in `index.html`, and an entry in `optIds` in `app.js`.
- When `document` is off, the preview still wraps the fragment in `previewCss` so it looks the same as the full-document output.
