/* Typeset — plain text → HTML converter. Pure functions, no DOM access. */
(function (global) {
  'use strict';

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }

  function smartPunct(s) {
    return s
      .replace(/\.\.\./g, '…')
      .replace(/(\s)--(\s)/g, '$1–$2')
      .replace(/---/g, '—')
      .replace(/(^|[\s(\[{—])"/g, '$1“')
      .replace(/"/g, '”')
      .replace(/(^|[\s(\[{—])'/g, '$1‘')
      .replace(/'/g, '’');
  }

  var URL_RE = /\b((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;"')\]!?])|\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g;

  /* Inline formatting. Input is raw text; output is safe HTML. */
  function inline(text, o) {
    // Protect `code` spans first so nothing inside them is transformed.
    var codes = [];
    var t = text;
    if (o.inline) {
      t = t.replace(/`([^`\n]+)`/g, function (_, c) {
        codes.push(c);
        return '\u0000' + (codes.length - 1) + '\u0000';
      });
    }

    // Pull out links before escaping so URL characters stay intact.
    var links = [];
    if (o.links) {
      t = t.replace(URL_RE, function (m, url, email) {
        links.push(url ? { href: /^www\./i.test(url) ? 'https://' + url : url, label: url }
                       : { href: 'mailto:' + email, label: email });
        return '\u0001' + (links.length - 1) + '\u0001';
      });
    }

    if (o.smart) t = smartPunct(t);
    t = escapeHtml(t);

    if (o.inline) {
      t = t
        .replace(/\*\*(?=\S)([^*]+?\S)\*\*/g, '<strong>$1</strong>')
        .replace(/__(?=\S)([^_]+?\S)__/g, '<strong>$1</strong>')
        .replace(/(^|[^*\w])\*(?=\S)([^*]+?\S|\S)\*(?!\w)/g, '$1<em>$2</em>')
        .replace(/(^|[^_\w])_(?=\S)([^_]+?\S|\S)_(?!\w)/g, '$1<em>$2</em>')
        .replace(/~~(?=\S)([^~]+?\S)~~/g, '<del>$1</del>');
    }

    t = t.replace(/\u0001(\d+)\u0001/g, function (_, i) {
      var l = links[+i];
      return '<a href="' + escapeHtml(l.href) + '">' + escapeHtml(l.label) + '</a>';
    });
    t = t.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return '<code>' + escapeHtml(codes[+i]) + '</code>';
    });
    return t;
  }

  function joinLines(lines, o) {
    return lines.map(function (l) { return inline(l.trim(), o); }).join(o.breaks ? '<br>\n' : '\n');
  }

  var RE = {
    atx: /^(#{1,6})\s+(.+?)\s*#*\s*$/,
    hr: /^\s*([-*_])(\s*\1){2,}\s*$/,
    ul: /^\s*[-*+•]\s+(.*)$/,
    ol: /^\s*(\d+)[.)]\s+(.*)$/,
    quote: /^\s*>\s?(.*)$/,
    fence: /^\s*(```|~~~)\s*([\w-]*)\s*$/,
    indent: /^(?: {4}|\t)/,
    setext1: /^\s*=+\s*$/,
    setext2: /^\s*-+\s*$/
  };

  /* Block-level conversion. */
  function blocks(text, o, depth) {
    var lines = text.replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var i = 0;
    var n = lines.length;
    var blank = function (l) { return !l || !l.trim(); };

    while (i < n) {
      var line = lines[i];
      if (blank(line)) { i++; continue; }

      if (o.structure) {
        var m;

        // Fenced code
        if ((m = line.match(RE.fence))) {
          var fence = m[1], lang = m[2], code = [];
          i++;
          while (i < n && lines[i].trim() !== fence) code.push(lines[i++]);
          i++;
          out.push('<pre><code' + (lang ? ' class="language-' + escapeHtml(lang) + '"' : '') + '>' +
            escapeHtml(code.join('\n')) + '</code></pre>');
          continue;
        }

        // Indented code (only when it starts a block)
        if (RE.indent.test(line) && !RE.ul.test(line) && !RE.ol.test(line)) {
          var ind = [];
          while (i < n && (RE.indent.test(lines[i]) || (blank(lines[i]) && i + 1 < n && RE.indent.test(lines[i + 1])))) {
            ind.push(lines[i].replace(RE.indent, ''));
            i++;
          }
          out.push('<pre><code>' + escapeHtml(ind.join('\n')) + '</code></pre>');
          continue;
        }

        // ATX heading
        if ((m = line.match(RE.atx))) {
          var lvl = m[1].length;
          out.push('<h' + lvl + '>' + inline(m[2], o) + '</h' + lvl + '>');
          i++;
          continue;
        }

        // Setext heading
        if (i + 1 < n && !blank(lines[i + 1]) && !RE.ul.test(line)) {
          if (RE.setext1.test(lines[i + 1])) { out.push('<h1>' + inline(line.trim(), o) + '</h1>'); i += 2; continue; }
          if (RE.setext2.test(lines[i + 1]) && lines[i + 1].trim().length >= 2) {
            out.push('<h2>' + inline(line.trim(), o) + '</h2>'); i += 2; continue;
          }
        }

        // Horizontal rule
        if (RE.hr.test(line)) { out.push('<hr>'); i++; continue; }

        // Blockquote
        if (RE.quote.test(line)) {
          var q = [];
          while (i < n && !blank(lines[i]) && RE.quote.test(lines[i])) q.push(lines[i++].match(RE.quote)[1]);
          // allow blank '>' lines to separate quoted paragraphs
          out.push('<blockquote>\n' + (depth < 4 ? blocks(q.join('\n'), o, depth + 1) : joinLines(q, o)) + '\n</blockquote>');
          continue;
        }

        // Lists
        var isUl = RE.ul.test(line), isOl = RE.ol.test(line);
        if (isUl || isOl) {
          var re = isUl ? RE.ul : RE.ol;
          var items = [];
          var start = isOl ? parseInt(line.match(RE.ol)[1], 10) : 1;
          while (i < n && !blank(lines[i])) {
            var lm = lines[i].match(re);
            if (lm) items.push([isUl ? lm[1] : lm[2]]);
            else if (items.length && /^\s+\S/.test(lines[i])) items[items.length - 1].push(lines[i]); // continuation
            else break;
            i++;
          }
          var tag = isUl ? 'ul' : 'ol';
          var open = '<' + tag + (isOl && start !== 1 ? ' start="' + start + '"' : '') + '>';
          out.push(open + '\n' + items.map(function (it) {
            return '  <li>' + joinLines(it, o) + '</li>';
          }).join('\n') + '\n</' + tag + '>');
          continue;
        }
      }

      // Paragraph
      var para = [];
      while (i < n && !blank(lines[i])) {
        if (o.structure && para.length && (
          RE.atx.test(lines[i]) || RE.fence.test(lines[i]) || RE.quote.test(lines[i]) ||
          RE.ul.test(lines[i]) || RE.ol.test(lines[i]) || RE.hr.test(lines[i]) ||
          (i + 1 < n && RE.setext1.test(lines[i + 1]))
        )) break;
        para.push(lines[i++]);
      }
      out.push('<p>' + joinLines(para, o) + '</p>');
    }
    return out.join('\n\n');
  }

  function firstHeading(html) {
    var m = html.match(/<h[1-6]>([\s\S]*?)<\/h[1-6]>/);
    if (!m) return '';
    return m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  }

  var DOC_CSS = [
    ':root{color-scheme:light}',
    'body{max-width:42rem;margin:3rem auto;padding:0 1.25rem;font:1.0625rem/1.7 Georgia,"Iowan Old Style","Times New Roman",serif;color:#1a1712;background:#fdfbf6}',
    'h1,h2,h3,h4,h5,h6{line-height:1.2;margin:2em 0 .6em;font-weight:700}',
    'h1{font-size:2.25rem;margin-top:0}h2{font-size:1.6rem}h3{font-size:1.25rem}',
    'p,ul,ol,blockquote,pre{margin:0 0 1.1em}',
    'a{color:#c2361d;text-underline-offset:.15em}',
    'blockquote{margin-left:0;padding-left:1.1em;border-left:3px solid #e5452b;color:#4a443a;font-style:italic}',
    'code{font:.9em ui-monospace,SFMono-Regular,Menlo,monospace;background:#f1ece1;padding:.1em .35em;border-radius:3px}',
    'pre{background:#1a1712;color:#f4efe4;padding:1rem 1.2rem;border-radius:6px;overflow:auto}',
    'pre code{background:none;padding:0;color:inherit}',
    'hr{border:0;border-top:1px solid #d9d1c0;margin:2.5em 0}',
    'img{max-width:100%}'
  ].join('\n    ');

  function convert(text, opts) {
    var o = Object.assign({ structure: true, inline: true, links: true, breaks: true, smart: false, document: true, title: '' }, opts || {});
    var body = blocks(text || '', o, 0);
    if (!o.document) return body ? body + '\n' : '';
    var title = (o.title && o.title.trim()) || firstHeading(body) || 'Untitled document';
    return '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '  <title>' + escapeHtml(title) + '</title>\n  <style>\n    ' + DOC_CSS + '\n  </style>\n</head>\n<body>\n' +
      body + '\n</body>\n</html>\n';
  }

  global.Typeset = { convert: convert, escapeHtml: escapeHtml, firstHeading: firstHeading, previewCss: DOC_CSS };
})(typeof window !== 'undefined' ? window : globalThis);
