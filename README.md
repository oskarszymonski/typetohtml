# Typeset — plain text to clean HTML

Typeset turns plain text (`.txt`) into clean, semantic HTML. You can paste text, type it, or drop a file onto the page. The HTML updates as you type, with a live preview and a syntax-coloured source view, and you can copy it or download it as a `.html` file.

## Features

- **Paste, type, or drop a `.txt` file** (up to 5 MB). Drag-and-drop works anywhere on the page.
- **Structure detection:** blank lines make paragraphs. `#` headings and underlined (`===`/`---`) headings, `-`/`1.` lists, `>` quotes, `---` rules, and fenced or indented code blocks are recognised.
- **Inline formatting:** `**bold**`, `*italic*`, `` `code` ``, `~~strike~~`.
- **Auto-linking** of URLs and email addresses.
- **Smart punctuation** (optional): curly quotes, en/em dashes, ellipses.
- **Fragment or full document:** output only the body markup, or a complete HTML page with a title and a small readable stylesheet.
- **Safe by default:** any HTML in the source text is escaped, and the preview runs in a sandboxed iframe.
- Your draft and settings are kept in `localStorage`. Press Ctrl/⌘+S to download.

Everything runs in the browser, so no text is ever uploaded.

## Tech

Plain HTML, CSS, and vanilla JavaScript with no build step, hosted on Netlify. Fonts are Fraunces and IBM Plex Mono from Google Fonts.

## Run locally

```bash
netlify dev            # or any static server, e.g.
npx serve public
```

Open the printed URL. To deploy, Netlify publishes the `public/` directory as-is.
