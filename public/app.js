/* Typeset — UI wiring. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var input = $('input'), preview = $('preview'), source = $('source').firstChild;
  var copyBtn = $('copyBtn'), downloadBtn = $('downloadBtn'), empty = $('empty');
  var optIds = { structure: 'optStructure', inline: 'optInline', links: 'optLinks', breaks: 'optBreaks', smart: 'optSmart', document: 'optDoc' };
  var STORE = 'typeset:v1';
  var html = '';
  var fileBase = '';

  var SAMPLE = [
    'The Lighthouse Keeper\'s Log',
    '===========================',
    '',
    'Kept by *Mara Ellison*, North Point Station. Weather reports are filed daily at https://example.com/weather.',
    '',
    '## Monday',
    '',
    'Fog rolled in before dawn. The lamp ran **eleven hours** without fault.',
    'Wind from the north-east, steady.',
    '',
    'Supplies needed:',
    '- Lamp oil (two drums)',
    '- Wick trimmers',
    '- Tinned peaches, if they have them',
    '',
    '## Tuesday',
    '',
    '> "The sea is quiet tonight -- quieter than I have known it in years..."',
    '> -- from my father\'s old logbook',
    '',
    'Steps for the evening check:',
    '1. Clean the lens',
    '2. Wind the clockwork',
    '3. Record the barometer in `log.txt`',
    '',
    '---',
    '',
    'Questions or corrections: keeper@example.com'
  ].join('\n');

  function opts() {
    var o = {};
    Object.keys(optIds).forEach(function (k) { o[k] = $(optIds[k]).checked; });
    o.title = $('docTitle').value;
    return o;
  }

  /* Lightweight HTML syntax colouring for the Source view. */
  function highlight(code) {
    var e = Typeset.escapeHtml(code);
    return e
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tk-c">$1</span>')
      .replace(/(&lt;\/?)([a-zA-Z0-9!]+)([\s\S]*?)(\/?&gt;)/g, function (_, open, name, attrs, close) {
        attrs = attrs.replace(/([\w-]+)(=)(&quot;[\s\S]*?&quot;)/g, '<span class="tk-a">$1</span>$2<span class="tk-v">$3</span>');
        return '<span class="tk-t">' + open + name + '</span>' + attrs + '<span class="tk-t">' + close + '</span>';
      });
  }

  var raf = 0;
  function render() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      var text = input.value;
      var o = opts();
      html = text.trim() ? Typeset.convert(text, o) : '';

      var has = !!html;
      empty.hidden = has;
      copyBtn.disabled = downloadBtn.disabled = !has;
      $('titleField').classList.toggle('is-off', !o.document);
      $('docTitle').disabled = !o.document;

      var doc = o.document ? html
        : '<!doctype html><html><head><meta charset="utf-8"><style>' + Typeset.previewCss + '</style></head><body>' + html + '</body></html>';
      // Links in the preview open in a new tab rather than navigating the frame.
      preview.srcdoc = has ? doc.replace('<head>', '<head><base target="_blank">') : '';
      source.innerHTML = has ? highlight(html) : '';

      var words = (text.match(/\S+/g) || []).length;
      $('stats').textContent = words.toLocaleString() + ' word' + (words === 1 ? '' : 's') + ' · ' + text.length.toLocaleString() + ' characters';
      $('outStats').textContent = has ? (new Blob([html]).size / 1024).toFixed(1) + ' KB · ' + (html.match(/<(h[1-6]|p|li|pre|blockquote)\b/g) || []).length + ' blocks' : '—';
      save();
    });
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ text: input.value, opts: opts(), file: fileBase })); } catch (e) {}
  }
  function restore() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!s) return;
      input.value = s.text || '';
      fileBase = s.file || '';
      Object.keys(optIds).forEach(function (k) { if (s.opts && k in s.opts) $(optIds[k]).checked = !!s.opts[k]; });
      if (s.opts && s.opts.title) $('docTitle').value = s.opts.title;
      showFile();
    } catch (e) {}
  }

  function showFile() { $('fileName').textContent = fileBase ? fileBase + '.txt' : ''; }

  var toastTimer;
  function toast(msg, kind) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast is-on' + (kind ? ' toast--' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 2400);
  }

  function loadFile(file) {
    if (!file) return;
    var okType = /^text\//.test(file.type) || /\.(txt|text|md|markdown|log|csv)$/i.test(file.name) || file.type === '';
    if (!okType) return toast('That doesn’t look like a text file', 'err');
    if (file.size > 5 * 1024 * 1024) return toast('File is over 5 MB — try a smaller one', 'err');
    var r = new FileReader();
    r.onload = function () {
      input.value = String(r.result);
      fileBase = file.name.replace(/\.[^.]+$/, '');
      showFile();
      render();
      toast('Loaded ' + file.name);
    };
    r.onerror = function () { toast('Couldn’t read that file', 'err'); };
    r.readAsText(file);
  }

  function slug(s) {
    return (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  function setView(v) {
    document.querySelectorAll('.tab').forEach(function (t) {
      var on = t.dataset.view === v;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on);
    });
    preview.classList.toggle('is-active', v === 'preview');
    $('source').classList.toggle('is-active', v === 'source');
  }

  function loadSample() {
    input.value = SAMPLE;
    fileBase = '';
    showFile();
    render();
    input.focus();
  }

  // Events
  input.addEventListener('input', render);
  Object.keys(optIds).forEach(function (k) { $(optIds[k]).addEventListener('change', render); });
  $('docTitle').addEventListener('input', render);
  $('sampleBtn').addEventListener('click', loadSample);
  $('sampleBtn2').addEventListener('click', loadSample);
  $('clearBtn').addEventListener('click', function () { input.value = ''; fileBase = ''; showFile(); render(); input.focus(); });
  $('fileInput').addEventListener('change', function (e) { loadFile(e.target.files[0]); e.target.value = ''; });
  document.querySelectorAll('.tab').forEach(function (t) { t.addEventListener('click', function () { setView(t.dataset.view); }); });

  copyBtn.addEventListener('click', function () {
    var done = function () { toast('HTML copied to clipboard'); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(html).then(done, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = html; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed — select the Source view and copy manually', 'err'); }
      ta.remove();
    }
  });

  downloadBtn.addEventListener('click', function () {
    var name = slug(fileBase) || slug($('docTitle').value) || slug(Typeset.firstHeading(html)) || 'document';
    var url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    var a = document.createElement('a');
    a.href = url; a.download = name + '.html';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Saved ' + name + '.html');
  });

  // Drag & drop anywhere on the page
  var drag = 0, dz = $('dropzone');
  window.addEventListener('dragenter', function (e) { if (hasFiles(e)) { e.preventDefault(); drag++; dz.classList.add('is-drag'); } });
  window.addEventListener('dragover', function (e) { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('dragleave', function () { drag = Math.max(0, drag - 1); if (!drag) dz.classList.remove('is-drag'); });
  window.addEventListener('drop', function (e) {
    if (!hasFiles(e)) return;
    e.preventDefault(); drag = 0; dz.classList.remove('is-drag');
    loadFile(e.dataTransfer.files[0]);
  });
  function hasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') > -1; }

  // Keyboard: Ctrl/Cmd+S downloads
  window.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && html) { e.preventDefault(); downloadBtn.click(); }
  });

  restore();
  render();
})();
