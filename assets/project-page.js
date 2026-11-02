/* Renders a compact project detail page from projects.json.
 * Expects window.PROJECT_SLUG to be set and a <main id="project-root"> mount point. */

(async function () {
  const root = document.getElementById('project-root');
  const slug = window.PROJECT_SLUG;

  let list = [];
  try {
    const res = await fetch('../projects.json', { cache: 'no-cache' });
    list = await res.json();
  } catch (e) {
    if (root) root.innerHTML = msg('Could not load projects.');
    return;
  }

  const project = list.find(p => p.slug === slug);
  const order = list.map(p => p.slug);

  if (!project) {
    document.title = 'Project not found — Andre Arante';
    if (root) root.innerHTML = msg('Project not found.');
    return;
  }

  document.title = project.title + ' — Andre Arante';
  document.documentElement.style.setProperty('--project-accent', project.accent || '#6c63ff');

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  function msg(t) { return '<p style="font-family:var(--mono);color:var(--muted);text-align:center;padding:120px 0;">' + t + '</p>'; }

  /* YouTube/Vimeo URL → embeddable player URL (or the URL unchanged). */
  function toEmbedSrc(url) {
    if (!url) return null;
    let m;
    if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/))) return 'https://www.youtube.com/embed/' + m[1];
    if ((m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return 'https://player.vimeo.com/video/' + m[1];
    return url;
  }

  /* Inner media element for a media item. */
  function mediaInner(m) {
    const embedUrl = m.type === 'embed' ? toEmbedSrc(m.url) : null;
    if (embedUrl) {
      return `<div class="media-embed"><iframe src="${esc(embedUrl)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    if (m.src) {
      const url = '../' + m.src;
      if (/\.(mp4|mov|webm|ogg)$/i.test(m.src)) {
        return `<video src="${esc(url)}" autoplay muted loop playsinline preload="auto" controls></video>`;
      }
      return `<img src="${esc(url)}" alt="${esc(m.label || '')}">`;
    }
    return `<div class="media-placeholder"><span class="ph-icon">${esc(m.icon || '◻')}</span><p>${esc(m.label || '')}<br><span style="opacity:.5">Add your ${esc(m.hint || 'media')} here</span></p></div>`;
  }

  function tile(m) {
    return `<figure class="pp-tile">${mediaInner(m)}</figure>`;
  }

  const media = Array.isArray(project.media) ? project.media : [];
  const desc = Array.isArray(project.description) ? project.description : [];
  const highs = Array.isArray(project.highlights) ? project.highlights : [];

  let html = '';
  html += '<a class="back-link" href="../portfolio.html">← Portfolio</a>';

  // Hero
  const statusBadge = project.status ? `<span class="status-badge">${esc(project.status)}</span>` : '';
  html += `<header class="project-hero reveal">
    <div class="hero-accent-bar"></div>
    <p class="project-eyebrow">${esc(project.type || '')}${statusBadge}</p>
    <h1 class="project-title">${esc(project.title || '')}</h1>
  </header>`;

  // Overview
  if (desc.length) {
    html += `<section class="pp-block reveal"><p class="section-label">Overview</p>` +
      desc.map(p => `<p class="pp-para">${esc(p)}</p>`).join('') + `</section>`;
  }

  // Media gallery
  if (media.length) {
    html += `<section class="pp-block reveal"><p class="section-label">Media</p>
      <div class="pp-gallery${media.length === 1 ? ' solo' : ''}">${media.map(tile).join('')}</div></section>`;
  }

  // Key details (clean bulleted list)
  if (highs.length) {
    html += `<section class="pp-block reveal"><p class="section-label">Key Details</p>
      <div class="highlights-list">${highs.map(h => `<div class="highlight-item">${esc(h)}</div>`).join('')}</div></section>`;
  }

  // Stack
  if (Array.isArray(project.stack) && project.stack.length) {
    html += `<section class="pp-block reveal"><p class="section-label">Stack</p>
      <div class="stack-tags">${project.stack.map(s => `<span class="stack-tag">${esc(s)}</span>`).join('')}</div></section>`;
  }

  // Actions
  const gh = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`;
  let actions = '';
  if (project.github) actions += `<a class="action-btn" href="${esc(project.github)}" target="_blank" rel="noopener">${gh} View on GitHub</a>`;
  if (project.docs) actions += `<a class="action-btn ghost" href="${esc(project.docs)}" target="_blank" rel="noopener">Docs ↗</a>`;
  if (actions) html += `<div class="project-actions reveal">${actions}</div>`;

  // Prev / Next
  const idx = order.indexOf(slug);
  const prevSlug = order[(idx - 1 + order.length) % order.length];
  const nextSlug = order[(idx + 1) % order.length];
  const prev = list.find(p => p.slug === prevSlug);
  const next = list.find(p => p.slug === nextSlug);
  if (order.length > 1) {
    html += `<nav class="project-prev-next reveal">
      <a class="prev-next-link prev" href="${esc(prevSlug)}.html"><span class="arrow">←</span><span class="title">${esc(prev.title)}</span></a>
      <a class="prev-next-link next" href="${esc(nextSlug)}.html"><span class="title">${esc(next.title)}</span><span class="arrow">→</span></a>
    </nav>`;
  }

  root.innerHTML = html;

  /* Drop any media tile whose video/image fails to load — no empty boxes.
   * If a gallery ends up empty, remove its whole "Media" section. */
  function pruneTile(el) {
    const tile = el.closest('.pp-tile');
    if (tile) tile.remove();
    document.querySelectorAll('.pp-gallery').forEach(g => {
      if (!g.querySelector('.pp-tile')) (g.closest('.pp-block') || g).remove();
    });
  }
  root.querySelectorAll('.pp-tile video, .pp-tile img').forEach(el => {
    el.addEventListener('error', () => pruneTile(el), { once: true });
    if (el.tagName === 'VIDEO') {
      // NETWORK_NO_SOURCE (3) — src 404'd or is unplayable
      setTimeout(() => { if (el.error || el.networkState === 3) pruneTile(el); }, 1800);
    } else if (el.complete && el.naturalWidth === 0) {
      pruneTile(el);
    }
  });

  /* Keyboard nav */
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'ArrowLeft') window.location.href = prevSlug + '.html';
    else if (e.key === 'ArrowRight') window.location.href = nextSlug + '.html';
    else if (e.key === 'Escape') window.location.href = '../portfolio.html';
  });

  /* Cursor dot */
  const cursor = document.getElementById('cursor');
  if (cursor) document.addEventListener('mousemove', e => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; });

  /* Subtle scroll reveal */
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  if (RM) {
    reveals.forEach(el => el.classList.add('visible'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(el => io.observe(el));
  }
})();
