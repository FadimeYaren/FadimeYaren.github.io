(function () {
  async function renderAnnouncements(lang) {
    const container = document.querySelector('#announcements');
    if (!container) return;

    const LIMIT = parseInt(container.getAttribute('data-limit') || '3', 10);

    const CANDIDATES = [
      `/data/announcements.${lang}.json`,
      '/data/announcements.tr.json',
      '/data/announcements.en.json',
      '/data/announcements.de.json'
    ];

    async function loadFirstOk(urls){
      for (const u of urls){
        try {
          const r = await fetch(u, { cache: 'no-store' });
          if (r.ok) return await r.json();
        } catch {}
      }
      return { items: [] };
    }

    const data = await loadFirstOk(CANDIDATES);
    const items = (data.items || []).slice().sort((a,b)=> (b.pin?1:0) - (a.pin?1:0) );

    if (!items.length){
      container.innerHTML = `<p class="ann-empty">—</p>`;
      return;
    }

    container.innerHTML = `
      <ul class="ann-list" role="list">
        ${items.slice(0, LIMIT).map(it => `
          <li class="ann-item">
            <a class="ann-link" href="${it.link || '#'}">
              <span class="ann-title">${it.title}</span>
            </a>
            ${it.pin ? '<span class="ann-pin" aria-label="Pinned">📌</span>' : ''}
          </li>
        `).join('')}
      </ul>
    `;
  }

  // --- Sayfa yüklendiğinde ilk kez çalıştır ---
  const state = JSON.parse(localStorage.getItem('fy_portfolio_state') || '{}');
  const initialLang = (state.lang || 'tr').toLowerCase();
  renderAnnouncements(initialLang);

  // --- Dil değişimini dinle ---
  document.addEventListener('i18n:lang-changed', (e) => {
    const newLang = e.detail?.lang || 'tr';
    renderAnnouncements(newLang);
  });
})();
