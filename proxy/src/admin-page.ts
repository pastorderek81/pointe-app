// Static HTML for the /admin page. Inlined so the Worker is fully
// self-contained — no static-asset hosting needed.
//
// The page talks to:
//   - GET  /admin/api/content  → returns current featured.json
//   - POST /admin/api/content  → saves new content (commits to GitHub)
//   - POST /admin/api/push     → broadcasts a push to every registered token
//   - POST /admin/api/upload   → uploads an image to the pointe-content
//                                repo's images/ folder, returns its URL
//
// Auth is handled at the route level (HTTP Basic Auth). The browser caches
// credentials, so the JS can call the API endpoints with `credentials:
// 'include'` and they ride along automatically.

export const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Pointe Admin</title>
<style>
  :root {
    --paper: #fafaf9;
    --ink: #0e1116;
    --ink-mid: #4a5160;
    --line: #e5e3df;
    --sky: #5b9dd9;
    --sky-bg: #eaf3fb;
    --sky-deep: #2d6da3;
    --peach: #f4a988;
    --peach-soft: #fdecd9;
    --peach-deep: #c25c39;
    --green: #2e7d4f;
    --red: #b3261e;
    --radius: 12px;
    --radius-sm: 8px;
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
    background: var(--paper);
    color: var(--ink);
    margin: 0;
    line-height: 1.5;
  }
  header {
    padding: 24px 20px 8px;
    border-bottom: 1px solid var(--line);
    background: #fff;
    position: sticky; top: 0; z-index: 10;
  }
  header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
  header p { margin: 2px 0 0; color: var(--ink-mid); font-size: 13px; }
  nav { display: flex; gap: 4px; margin-top: 14px; margin-bottom: -1px; }
  nav button {
    background: transparent; border: 0; padding: 10px 14px;
    color: var(--ink-mid); font: inherit; font-weight: 600; font-size: 14px;
    border-bottom: 2px solid transparent; cursor: pointer;
  }
  nav button.active { color: var(--ink); border-bottom-color: var(--sky); }
  main { padding: 20px; max-width: 720px; margin: 0 auto; }
  section { display: none; }
  section.active { display: block; }
  .card {
    background: #fff; border: 1px solid var(--line);
    border-radius: var(--radius); padding: 16px; margin-bottom: 16px;
  }
  label {
    display: block; font-size: 12px; font-weight: 700;
    color: var(--ink-mid); letter-spacing: 0.04em; text-transform: uppercase;
    margin-bottom: 6px;
  }
  input, textarea {
    width: 100%; padding: 10px 12px; border: 1px solid var(--line);
    border-radius: var(--radius-sm); font: inherit; font-size: 15px;
    background: var(--paper);
  }
  input:focus, textarea:focus { outline: 2px solid var(--sky); outline-offset: -1px; }
  textarea { resize: vertical; min-height: 60px; }
  .field { margin-bottom: 12px; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 480px) { .field-row { grid-template-columns: 1fr; } }
  button.primary, button.secondary, button.ghost, button.danger, button.peach {
    border: 0; border-radius: 999px; padding: 10px 18px; font: inherit;
    font-weight: 600; font-size: 14px; cursor: pointer;
  }
  button.primary { background: var(--sky-deep); color: #fff; }
  button.primary:hover { background: #245a89; }
  button.peach { background: var(--peach-deep); color: #fff; }
  button.peach:hover { background: #a44a2c; }
  button.ghost { background: transparent; color: var(--ink-mid); border: 1px solid var(--line); }
  button.ghost:hover { background: var(--paper); }
  button.danger { background: transparent; color: var(--red); padding: 6px 8px; font-size: 13px; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Drop zone styling */
  .drop {
    position: relative;
    border: 2px dashed var(--line);
    border-radius: var(--radius);
    background: var(--paper);
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    min-height: 140px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 8px;
  }
  .drop:hover { border-color: var(--sky); background: var(--sky-bg); }
  .drop.dragging { border-color: var(--sky-deep); background: var(--sky-bg); }
  .drop.uploading { border-style: solid; border-color: var(--sky-deep); }
  .drop.has-image { padding: 0; border-style: solid; min-height: 0; cursor: default; background: #fff; }
  .drop .glyph { font-size: 28px; opacity: 0.6; }
  .drop .hint { font-size: 13px; color: var(--ink-mid); }
  .drop .url-link {
    font-size: 12px; color: var(--sky-deep); text-decoration: underline;
    cursor: pointer; background: transparent; border: 0; padding: 4px;
  }
  .drop img.preview {
    width: 100%; max-height: 240px; object-fit: cover;
    border-radius: var(--radius); display: block;
  }
  .drop .actions {
    position: absolute; top: 8px; right: 8px;
    display: flex; gap: 6px;
  }
  .drop .actions button {
    background: rgba(255,255,255,0.95); border: 1px solid var(--line);
    border-radius: 999px; padding: 4px 10px; font-size: 12px;
    cursor: pointer; font-weight: 600;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }
  .drop .actions button:hover { background: #fff; }
  .drop input[type="file"] { display: none; }
  .url-input { margin-top: 8px; display: none; }
  .url-input.show { display: block; }
  .progress {
    width: 100%; height: 4px; background: var(--line);
    border-radius: 2px; overflow: hidden; margin-top: 4px;
  }
  .progress-bar {
    height: 100%; background: var(--sky-deep);
    transition: width 0.2s;
  }

  .toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    padding: 10px 18px; border-radius: 999px; font-size: 14px; font-weight: 600;
    z-index: 100; box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    transition: opacity 0.2s, transform 0.2s;
    max-width: 90vw; text-align: center;
  }
  .toast.success { background: var(--green); color: #fff; }
  .toast.error { background: var(--red); color: #fff; }
  .toast.hidden { opacity: 0; transform: translate(-50%, 8px); pointer-events: none; }
  .help { font-size: 13px; color: var(--ink-mid); margin: 0 0 12px; }
  .meta { font-size: 12px; color: var(--ink-mid); margin-top: 6px; }
  .actions-bar {
    display: flex; gap: 12px; margin-top: 20px;
    align-items: center; justify-content: space-between;
    position: sticky; bottom: 0; padding: 12px 0;
    background: linear-gradient(to bottom, transparent, var(--paper) 30%);
  }
  .summary { font-size: 13px; color: var(--ink-mid); }
  .empty { color: var(--ink-mid); font-style: italic; padding: 20px; text-align: center; }
  .featured-card { position: relative; }
  .featured-card .controls {
    display: flex; gap: 6px; justify-content: flex-end; margin-top: 8px;
  }
  .icon-btn {
    background: transparent; border: 1px solid var(--line);
    border-radius: var(--radius-sm); width: 32px; height: 32px;
    cursor: pointer; font-size: 14px; color: var(--ink-mid);
  }
  .icon-btn:hover { background: var(--paper); }
  .icon-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .hint { font-size: 12px; color: var(--ink-mid); margin-top: 4px; }
</style>
</head>
<body>
  <header>
    <h1>The Pointe Church · Admin</h1>
    <p>Send a push, edit the home screen — changes go live in about a minute.</p>
    <nav>
      <button data-tab="push" class="active">Send a Push</button>
      <button data-tab="content">Edit Home Screen</button>
    </nav>
  </header>

  <main>
    <section id="tab-push" class="active">
      <div class="card">
        <p class="help">Sent to every device that has the app installed and notifications turned on. Be thoughtful — there's no undo.</p>
        <div class="field">
          <label for="push-title">Title</label>
          <input id="push-title" type="text" maxlength="60" placeholder="This Sunday">
          <p class="hint">Short and clear. Shows in bold on the lock screen.</p>
        </div>
        <div class="field">
          <label for="push-body">Body</label>
          <textarea id="push-body" maxlength="200" placeholder="9:30 + 11 AM. See you there."></textarea>
          <p class="hint">One or two sentences. Up to 200 characters.</p>
        </div>
        <div class="actions-bar">
          <span class="summary" id="push-summary"></span>
          <button class="peach" id="push-send">Send to everyone</button>
        </div>
      </div>
    </section>

    <section id="tab-content">
      <div id="content-loading" class="empty">Loading current content…</div>
      <div id="content-form" style="display:none">
        <h2 style="font-size:16px;margin:0 0 8px;letter-spacing:-0.01em">Home tab hero</h2>
        <div class="card">
          <div class="field">
            <label>Hero images</label>
            <p class="hint">📐 <b>16:9 ratio · ~1920×1080 · under 1 MB</b></p>
            <p class="hint">Add one image for a static hero, or 2+ to make it auto-cycle every 5 seconds (users can also swipe). Leave empty to use the bundled series art.</p>
            <div id="hero-images-list"></div>
            <button class="ghost" id="add-hero-image" style="width:100%;margin-top:8px">+ Add hero image</button>
          </div>
          <div class="field">
            <label for="hero-eyebrow">Hero eyebrow</label>
            <input id="hero-eyebrow" type="text" maxlength="40" placeholder="THIS SUNDAY · MAY 10">
            <p class="hint">Small label above the title. Short, all-caps reads best. Leave empty to use "NOW PLAYING".</p>
          </div>
          <div class="field">
            <label for="hero-title">Hero title</label>
            <input id="hero-title" type="text" maxlength="80" placeholder="Bring the moms">
            <p class="hint">The big headline. Leave empty to use the current sermon series title.</p>
          </div>
          <div class="field">
            <label for="hero-subtitle">Hero subtitle</label>
            <textarea id="hero-subtitle" maxlength="200" placeholder="Mother's Day · All four services · 9:30 + 11 AM"></textarea>
            <p class="hint">A line of context below the title. Leave empty to use the series tagline + next service time. (The "LIVE" badge during service hours stays on regardless.)</p>
          </div>
          <div class="field">
            <label for="sermon-url">Sermon Notes URL</label>
            <input id="sermon-url" type="url" placeholder="https://bible.com/events/...">
            <p class="hint">The Sermon Notes chip on the home screen opens this link.</p>
          </div>
        </div>

        <h2 style="font-size:16px;margin:24px 0 8px;letter-spacing:-0.01em">Groups tab hero</h2>
        <p class="help">Card-style hero shown above the Groups list. Leave empty to skip the card entirely.</p>
        <div class="card">
          <div class="field">
            <label>Images</label>
            <div id="groups-images-list"></div>
            <button class="ghost" id="add-groups-image" style="width:100%;margin-top:8px">+ Add image</button>
          </div>
          <div class="field">
            <label for="groups-eyebrow">Eyebrow</label>
            <input id="groups-eyebrow" type="text" maxlength="40" placeholder="THIS WEEK">
          </div>
          <div class="field">
            <label for="groups-title">Title</label>
            <input id="groups-title" type="text" maxlength="80" placeholder="Find your people">
          </div>
          <div class="field">
            <label for="groups-subtitle">Subtitle</label>
            <textarea id="groups-subtitle" maxlength="200" placeholder="Real life happens in groups."></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="groups-ctaLabel">Button label</label>
              <input id="groups-ctaLabel" type="text" maxlength="40" placeholder="Find a Group">
            </div>
            <div class="field">
              <label for="groups-ctaUrl">Button URL</label>
              <input id="groups-ctaUrl" type="url" placeholder="https://...">
            </div>
          </div>
          <p class="hint">Pill button shown below the subtitle. Both label and URL are required to render.</p>
        </div>

        <h2 style="font-size:16px;margin:24px 0 8px;letter-spacing:-0.01em">Events tab hero</h2>
        <p class="help">Card-style hero shown above the Events list. Leave empty to skip the card entirely.</p>
        <div class="card">
          <div class="field">
            <label>Images</label>
            <div id="events-images-list"></div>
            <button class="ghost" id="add-events-image" style="width:100%;margin-top:8px">+ Add image</button>
          </div>
          <div class="field">
            <label for="events-eyebrow">Eyebrow</label>
            <input id="events-eyebrow" type="text" maxlength="40" placeholder="COMING UP">
          </div>
          <div class="field">
            <label for="events-title">Title</label>
            <input id="events-title" type="text" maxlength="80" placeholder="What's happening">
          </div>
          <div class="field">
            <label for="events-subtitle">Subtitle</label>
            <textarea id="events-subtitle" maxlength="200" placeholder="Sign up for what's coming up at The Pointe."></textarea>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="events-ctaLabel">Button label</label>
              <input id="events-ctaLabel" type="text" maxlength="40" placeholder="See all events">
            </div>
            <div class="field">
              <label for="events-ctaUrl">Button URL</label>
              <input id="events-ctaUrl" type="url" placeholder="https://...">
            </div>
          </div>
          <p class="hint">Pill button shown below the subtitle. Both label and URL are required to render.</p>
        </div>

        <h2 style="font-size:16px;margin:24px 0 8px;letter-spacing:-0.01em">Featured cards</h2>
        <p class="help">Use the arrows to reorder. New cards appear at the bottom.</p>

        <div id="featured-list"></div>

        <button class="ghost" id="add-card" style="width:100%;margin-bottom:16px">+ Add a card</button>

        <div class="actions-bar">
          <span class="summary" id="content-summary"></span>
          <button class="primary" id="save-content">Save changes</button>
        </div>
      </div>
    </section>
  </main>

  <div id="toast" class="toast hidden"></div>

<script>
(function() {
  const $ = (id) => document.getElementById(id);
  const toast = $('toast');

  function showToast(msg, kind = 'success', duration = 3500) {
    toast.textContent = msg;
    toast.className = 'toast ' + kind;
    setTimeout(() => toast.classList.add('hidden'), duration);
  }

  // --- Tabs ---
  document.querySelectorAll('nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('active', b === btn));
      const tab = btn.dataset.tab;
      document.querySelectorAll('section').forEach((s) => {
        s.classList.toggle('active', s.id === 'tab-' + tab);
      });
      if (tab === 'content') loadContent();
    });
  });

  // --- Push ---
  $('push-send').addEventListener('click', async () => {
    const title = $('push-title').value.trim();
    const body = $('push-body').value.trim();
    if (!title || !body) {
      showToast('Title and body are both required', 'error');
      return;
    }
    if (!confirm('Send this push to every device with the app installed?\\n\\nTitle: ' + title + '\\nBody: ' + body)) return;
    const btn = $('push-send');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const res = await fetch('/admin/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Send failed');
      const msg = 'Sent to ' + json.sent + ' device' + (json.sent === 1 ? '' : 's')
        + (json.removed ? ' (' + json.removed + ' uninstalled)' : '');
      showToast(msg);
      $('push-summary').textContent = msg + ' · ' + new Date().toLocaleTimeString();
      $('push-title').value = ''; $('push-body').value = '';
    } catch (e) {
      showToast(e.message || 'Send failed', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Send to everyone';
    }
  });

  // --- Image drop zone factory ---
  // Renders a drop zone bound to a getter/setter for a string|null URL.
  // Click to browse, drag/drop, or expand a small URL input for paste.
  function createDropZone(container, opts) {
    const { getValue, setValue, label } = opts;
    container.innerHTML = '';
    container.className = 'drop';
    let urlInputShown = false;

    function render() {
      const url = getValue();
      container.innerHTML = '';
      container.classList.remove('uploading', 'has-image', 'dragging');
      if (url) {
        container.classList.add('has-image');
        const img = document.createElement('img');
        img.className = 'preview';
        img.src = url;
        img.alt = label || '';
        img.onerror = () => { container.classList.remove('has-image'); renderEmpty('Image failed to load — drop a new one or paste a URL'); };
        container.appendChild(img);
        const actions = document.createElement('div');
        actions.className = 'actions';
        const replace = document.createElement('button');
        replace.textContent = 'Replace';
        replace.onclick = (e) => { e.stopPropagation(); pickFile(); };
        const clear = document.createElement('button');
        clear.textContent = 'Clear';
        clear.onclick = (e) => { e.stopPropagation(); setValue(null); render(); };
        actions.appendChild(replace);
        actions.appendChild(clear);
        container.appendChild(actions);
      } else {
        renderEmpty();
      }
    }

    function renderEmpty(msg) {
      container.innerHTML = '';
      const glyph = document.createElement('div');
      glyph.className = 'glyph';
      glyph.textContent = '🖼️';
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = msg || 'Drag an image here or click to browse';
      const urlBtn = document.createElement('button');
      urlBtn.type = 'button';
      urlBtn.className = 'url-link';
      urlBtn.textContent = urlInputShown ? 'Hide URL field' : 'Or paste a URL';
      urlBtn.onclick = (e) => {
        e.stopPropagation();
        urlInputShown = !urlInputShown;
        urlEl.classList.toggle('show', urlInputShown);
        urlBtn.textContent = urlInputShown ? 'Hide URL field' : 'Or paste a URL';
        if (urlInputShown) urlEl.focus();
      };
      const urlEl = document.createElement('input');
      urlEl.type = 'url';
      urlEl.className = 'url-input' + (urlInputShown ? ' show' : '');
      urlEl.placeholder = 'https://...';
      urlEl.oninput = () => {
        const v = urlEl.value.trim();
        setValue(v || null);
      };
      urlEl.onclick = (e) => e.stopPropagation();
      container.appendChild(glyph);
      container.appendChild(hint);
      container.appendChild(urlBtn);
      container.appendChild(urlEl);
    }

    function pickFile() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/webp,image/gif';
      input.onchange = () => {
        if (input.files && input.files[0]) handleFile(input.files[0]);
      };
      input.click();
    }

    async function handleFile(file) {
      if (!file.type.startsWith('image/')) {
        showToast('Pick an image file (PNG, JPG, WebP, or GIF)', 'error');
        return;
      }

      container.classList.add('uploading');
      container.innerHTML = '';
      const msg = document.createElement('div');
      msg.className = 'hint';
      msg.textContent = 'Processing ' + file.name + '…';
      const bar = document.createElement('div');
      bar.className = 'progress';
      const fill = document.createElement('div');
      fill.className = 'progress-bar';
      fill.style.width = '20%';
      bar.appendChild(fill);
      container.appendChild(msg);
      container.appendChild(bar);

      try {
        const uploadFile = await maybeResize(file);
        msg.textContent = 'Uploading ' + uploadFile.name + '…';
        fill.style.width = '60%';
        if (uploadFile.size > 5 * 1024 * 1024) {
          throw new Error('Image is over 5 MB even after resize. Try a smaller one.');
        }

        const fd = new FormData();
        fd.append('file', uploadFile);
        const res = await fetch('/admin/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Upload failed');
        setValue(json.url);
        render();
        showToast(json.deduped ? 'Image already exists — reused' : 'Image uploaded');
      } catch (e) {
        render();
        showToast(e.message || 'Upload failed', 'error');
      }
    }

    container.addEventListener('click', (e) => {
      if (e.target === container || e.target.classList.contains('hint') || e.target.classList.contains('glyph')) {
        if (!getValue()) pickFile();
      }
    });
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.classList.add('dragging');
    });
    container.addEventListener('dragleave', () => {
      container.classList.remove('dragging');
    });
    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.classList.remove('dragging');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });

    render();
    return { rerender: render };
  }

  // --- Content state + load/save ---
  let contentState = null;
  let contentSha = null;

  async function loadContent() {
    if (contentState) return;
    try {
      const res = await fetch('/admin/api/content', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Load failed');
      contentState = json.content;
      contentSha = json.sha;
      renderContent();
      $('content-loading').style.display = 'none';
      $('content-form').style.display = 'block';
    } catch (e) {
      $('content-loading').textContent = 'Failed to load content: ' + (e.message || 'unknown error');
    }
  }

  // Helper: normalize a hero state object to ensure the canonical shape.
  function normalizeHero(hero) {
    if (!hero) hero = {};
    if (hero.eyebrow === undefined) hero.eyebrow = null;
    if (hero.title === undefined) hero.title = null;
    if (hero.subtitle === undefined) hero.subtitle = null;
    if (!Array.isArray(hero.images)) {
      hero.images = hero.imageUrl ? [hero.imageUrl] : [];
    } else if (hero.images.length === 0 && hero.imageUrl) {
      hero.images = [hero.imageUrl];
    }
    return hero;
  }

  // Helper: bind one hero section (3 of these — header, groupsHero, eventsHero).
  // Wires the images list, +Add button, and the eyebrow/title/subtitle inputs
  // to a hero state object. Called once per section at render time.
  function bindHeroSection(prefix, getHero, label) {
    const listId = prefix + '-images-list';
    const addBtnId = 'add-' + prefix + '-image';

    function renderList() {
      const hero = getHero();
      const list = $(listId);
      list.innerHTML = '';
      const arr = hero.images;
      arr.forEach((url, idx) => {
        const wrap = document.createElement('div');
        wrap.style.marginBottom = '12px';
        const slot = document.createElement('div');
        wrap.appendChild(slot);
        const controls = document.createElement('div');
        controls.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;margin-top:6px';
        controls.innerHTML = \`
          <button class="icon-btn" data-act="up" \${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="icon-btn" data-act="down" \${idx === arr.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="danger" data-act="remove">Remove</button>
        \`;
        controls.querySelector('[data-act="up"]').addEventListener('click', () => move(idx, -1));
        controls.querySelector('[data-act="down"]').addEventListener('click', () => move(idx, 1));
        controls.querySelector('[data-act="remove"]').addEventListener('click', () => {
          hero.images.splice(idx, 1);
          renderList();
        });
        wrap.appendChild(controls);
        list.appendChild(wrap);
        createDropZone(slot, {
          label: label + ' image ' + (idx + 1),
          getValue: () => hero.images[idx] || null,
          setValue: (v) => {
            if (v) hero.images[idx] = v;
            else {
              hero.images.splice(idx, 1);
              renderList();
            }
          },
        });
      });
      if (arr.length === 0) {
        list.innerHTML = '<div class="empty" style="padding:12px">No images yet — leave empty to skip, or add some.</div>';
      }
    }

    function move(idx, dir) {
      const hero = getHero();
      const arr = hero.images;
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      renderList();
    }

    $(addBtnId).addEventListener('click', () => {
      if (!contentState) return;
      const hero = getHero();
      hero.images.push('');
      renderList();
      const slots = $(listId).querySelectorAll('.drop');
      const last = slots[slots.length - 1];
      if (last) last.click();
    });

    // Text fields
    const hero = getHero();
    const eyebrowEl = $(prefix + '-eyebrow');
    const titleEl = $(prefix + '-title');
    const subtitleEl = $(prefix + '-subtitle');
    eyebrowEl.value = hero.eyebrow || '';
    titleEl.value = hero.title || '';
    subtitleEl.value = hero.subtitle || '';
    eyebrowEl.addEventListener('input', (e) => { getHero().eyebrow = e.target.value.trim() || null; });
    titleEl.addEventListener('input', (e) => { getHero().title = e.target.value.trim() || null; });
    subtitleEl.addEventListener('input', (e) => { getHero().subtitle = e.target.value.trim() || null; });

    // Optional CTA pill (only Groups + Events sections have these inputs in the DOM).
    const ctaLabelEl = $(prefix + '-ctaLabel');
    const ctaUrlEl = $(prefix + '-ctaUrl');
    if (ctaLabelEl && ctaUrlEl) {
      ctaLabelEl.value = hero.ctaLabel || '';
      ctaUrlEl.value = hero.ctaUrl || '';
      ctaLabelEl.addEventListener('input', (e) => { getHero().ctaLabel = e.target.value.trim() || null; });
      ctaUrlEl.addEventListener('input', (e) => { getHero().ctaUrl = e.target.value.trim() || null; });
    }

    renderList();
  }

  function renderContent() {
    contentState.header = normalizeHero(contentState.header);
    contentState.groupsHero = normalizeHero(contentState.groupsHero);
    contentState.eventsHero = normalizeHero(contentState.eventsHero);

    bindHeroSection('hero', () => contentState.header, 'Home hero');
    bindHeroSection('groups', () => contentState.groupsHero, 'Groups hero');
    bindHeroSection('events', () => contentState.eventsHero, 'Events hero');

    $('sermon-url').value = contentState.sermonNotesUrl || '';
    renderFeatured();
  }

  function renderFeatured() {
    const list = $('featured-list');
    list.innerHTML = '';
    contentState.featured.forEach((card, idx) => {
      const node = document.createElement('div');
      node.className = 'card featured-card';

      const dropContainer = document.createElement('div');
      const fieldsHtml = \`
        <div class="field">
          <label>Card image</label>
          <div class="card-image-slot"></div>
          <p class="hint">📐 <b>3:2 ratio · ~900×600 · under 500 KB</b></p>
          <p class="hint">Drag/drop, click to browse, or paste a URL. Optional — leave empty to use a default image.</p>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Title</label>
            <input type="text" data-field="title" value="\${escapeAttr(card.title)}">
          </div>
          <div class="field">
            <label>Date label</label>
            <input type="text" data-field="dateLabel" value="\${escapeAttr(card.dateLabel)}" placeholder="JUL 13–16">
          </div>
        </div>
        <div class="field">
          <label>Description</label>
          <textarea data-field="description">\${escapeText(card.description)}</textarea>
        </div>
        <div class="field">
          <label>Link URL</label>
          <input type="url" data-field="url" value="\${escapeAttr(card.url)}" placeholder="https://...">
        </div>
        <div class="meta">id: <code>\${escapeText(card.id)}</code></div>
        <div class="controls">
          <button class="icon-btn" data-act="up" \${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="icon-btn" data-act="down" \${idx === contentState.featured.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="danger" data-act="remove">Remove</button>
        </div>
      \`;
      node.innerHTML = fieldsHtml;

      // Mount the drop zone for this card's image
      createDropZone(node.querySelector('.card-image-slot'), {
        label: card.title,
        getValue: () => card.imageUrl,
        setValue: (v) => { card.imageUrl = v; },
      });

      // Wire field edits
      node.querySelectorAll('[data-field]').forEach((el) => {
        el.addEventListener('input', () => {
          const f = el.dataset.field;
          card[f] = el.value;
        });
      });
      node.querySelector('[data-act="up"]').addEventListener('click', () => move(idx, -1));
      node.querySelector('[data-act="down"]').addEventListener('click', () => move(idx, 1));
      node.querySelector('[data-act="remove"]').addEventListener('click', () => {
        if (confirm('Remove "' + card.title + '"?')) {
          contentState.featured.splice(idx, 1);
          renderFeatured();
        }
      });
      list.appendChild(node);
    });
    if (contentState.featured.length === 0) {
      list.innerHTML = '<div class="empty">No featured cards. Add one below.</div>';
    }
  }

  function move(idx, dir) {
    const arr = contentState.featured;
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    renderFeatured();
  }

  $('add-card').addEventListener('click', () => {
    const id = 'card-' + Date.now();
    contentState.featured.push({
      id,
      title: 'New card',
      dateLabel: 'TBD',
      description: '',
      imageUrl: null,
      url: 'https://www.thepointe.online/',
    });
    renderFeatured();
  });

  $('hero-eyebrow').addEventListener('input', (e) => {
    contentState.header.eyebrow = e.target.value.trim() || null;
  });
  $('hero-title').addEventListener('input', (e) => {
    contentState.header.title = e.target.value.trim() || null;
  });
  $('hero-subtitle').addEventListener('input', (e) => {
    contentState.header.subtitle = e.target.value.trim() || null;
  });
  $('sermon-url').addEventListener('input', (e) => {
    contentState.sermonNotesUrl = e.target.value;
  });

  $('save-content').addEventListener('click', async () => {
    if (!contentState.sermonNotesUrl) {
      showToast('Sermon Notes URL is required', 'error');
      return;
    }
    for (const f of contentState.featured) {
      if (!f.id || !f.title || !f.url) {
        showToast('Every card needs a title and a link URL', 'error');
        return;
      }
    }
    // Drop any empty hero-image slots and clear the legacy imageUrl field —
    // images[] is canonical going forward. Apply to all three hero sections.
    const cleanHero = (h) => ({
      ...(h || {}),
      images: ((h && h.images) || []).filter((u) => typeof u === 'string' && u),
      imageUrl: null,
    });
    const cleaned = {
      ...contentState,
      header: cleanHero(contentState.header),
      groupsHero: cleanHero(contentState.groupsHero),
      eventsHero: cleanHero(contentState.eventsHero),
    };
    const btn = $('save-content');
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      const res = await fetch('/admin/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: cleaned, sha: contentSha }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      contentSha = json.sha;
      showToast('Saved. Live in app within ~60 seconds.');
      $('content-summary').textContent = 'Saved at ' + new Date().toLocaleTimeString();
    } catch (e) {
      showToast(e.message || 'Save failed', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Save changes';
    }
  });

  // Resize an oversized image in the browser so we don't blow past the
  // Worker's 5 MB upload limit. JPEG-encodes the result. Skips small files.
  async function maybeResize(file) {
    const MAX_W = 1920;
    const MAX_H = 1920;
    const QUALITY = 0.85;
    if (file.size < 1.2 * 1024 * 1024) return file; // small enough — leave alone

    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const ratio = Math.min(MAX_W / img.width, MAX_H / img.height, 1);
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (!blob) return reject(new Error('resize failed'));
              const baseName = (file.name || 'image').replace(/\\.[^.]+$/, '');
              const newFile = new File([blob], baseName + '.jpg', { type: 'image/jpeg' });
              resolve(newFile);
            },
            'image/jpeg',
            QUALITY,
          );
        } catch (e) {
          URL.revokeObjectURL(objectUrl);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('image load failed'));
      };
      img.src = objectUrl;
    });
  }

  // Escape helpers
  function escapeAttr(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function escapeText(s) {
    return String(s ?? '').replace(/[&<>]/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
    }[c]));
  }
})();
</script>
</body>
</html>`;
