(function(){
  const STATE_KEY = 'fy_portfolio_state';
  const state = JSON.parse(localStorage.getItem(STATE_KEY) || '{}');
  const saveState = ()=>localStorage.setItem(STATE_KEY, JSON.stringify(state));
  // JSON tabanlı i18n kullanan yeni sürüm
  const applyThemeLang = async ()=>{
    const theme = state.theme || 'dark';
    document.body.classList.toggle('light', theme === 'light');
    document.querySelectorAll('.toggle.theme').forEach(t => t.classList.toggle('light', theme === 'light'));

    const lang = state.lang || 'tr';
    document.documentElement.lang = lang;

    // buton işaretleri (TR→EN→DE arasında geçiş)
    document.querySelectorAll('.toggle.lang').forEach(t => {
      t.classList.toggle('on-en', lang === 'en');
      t.classList.toggle('on-de', lang === 'de');

      // erişilebilirlik için buton etiketi
      const label =
        lang === 'en' ? 'Language: English' :
        lang === 'de' ? 'Sprache: Deutsch' :
        'Dil: Türkçe';
      t.setAttribute('aria-label', label);
    });


    // sayfa adını al (örneğin index.html, blog.html)
    const page = (document.body.dataset.page ||
                  (location.pathname.split('/').pop() || 'index')
                  .replace(/\.html?$/,''));

    // sözlükleri yükle
    async function loadJSON(url){
      try {
        const res = await fetch(url, {cache:'no-store'});
        if(res.ok) return await res.json();
      } catch {}
      return {};
    }

    const common = await loadJSON(`/data/i18n/common.${lang}.json`);
    const pageDict = await loadJSON(`/data/i18n/${page}.${lang}.json`);
    const dict = {...common, ...pageDict};

    // sayfadaki [data-i18n] öğelerini güncelle
    // ==== gelişmiş i18n sistemi (nested key + attribute desteği) ====
    function getDeep(obj, path) {
      return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = getDeep(dict, key);
      if (val == null) return;

      // attribute çevirisi gerekiyorsa (örn. placeholder, aria-label)
      const attrs = (el.dataset.i18nAttr || '').trim();
      if (attrs) {
        attrs.split(/\s+/).forEach(attr => {
          el.setAttribute(attr, val);
        });
      } else {
        el.textContent = val;
      }
    });


    // Dili diğer scriptlere bildir (örneğin announcements yeniden yüklesin)
    document.dispatchEvent(new CustomEvent('i18n:lang-changed', { detail: { lang } }));
  };


  document.addEventListener('DOMContentLoaded', async ()=>{

    // toggles
        // toggles
    document.querySelector('.toggle.theme')?.addEventListener('click', async ()=>{
      state.theme = (state.theme==='light'?'dark':'light');
      saveState();
      await applyThemeLang();
    });

    // TR→EN→DE→TR dönüşümlü dil geçişi
    function cycleLang(curr){
      const langs = ['tr','en','de'];
      const i = langs.indexOf(curr || 'tr');
      return langs[(i + 1) % langs.length];
    }
    document.querySelector('.toggle.lang')?.addEventListener('click', async ()=>{
      state.lang = cycleLang(state.lang);
      saveState();
      await applyThemeLang();
    });

    await applyThemeLang();


    // blog list filters
    const chips  = document.querySelectorAll('[data-chip]');
    const search = document.querySelector('#search');
    const grid   = document.querySelector('#blog-grid');
    const cards  = Array.from(document.querySelectorAll('[data-card]')); // Array olarak tut
    const sortBySel = document.querySelector('#sortBy');

    function sortCards(){
      if(!grid) return;
      const val = sortBySel?.value || 'date:desc';
      const [key, dir] = val.split(':'); // key = 'date'|'title'|'read' ; dir='asc'|'desc'
      const m = dir === 'asc' ? 1 : -1;

      const getKey = (card)=>{
        switch(key){
          case 'title': return (card.dataset.title || card.querySelector('h3')?.textContent || '').toLowerCase();
          case 'read':  return parseInt(card.dataset.read || '0', 10) || 0;
          case 'date': {
            const d = card.dataset.date ? new Date(card.dataset.date) : new Date(0);
            return d.getTime();
          }
          default: return 0;
        }
      };

      const sorted = cards.slice().sort((a,b)=>{
        const ka = getKey(a), kb = getKey(b);
        if (typeof ka === 'string' && typeof kb === 'string') {
          return ka.localeCompare(kb, 'tr') * m;
        }
        return (ka > kb ? 1 : ka < kb ? -1 : 0) * m;
      });

      // DOM'u yeni sırada yeniden ekle
      sorted.forEach(el => grid.appendChild(el));
    }

    function applyFilters(){
      const activeCat = document.querySelector('.chip.active')?.dataset.chip || 'all';
      const q = (search?.value || '').toLowerCase();

      // Önce sıralamayı uygula, sonra görünürlük filtreleri
      sortCards();

      cards.forEach(card => {
        const cat  = card.dataset.cat;
        const text = (card.textContent || '').toLowerCase();
        const matchCat = (activeCat==='all' || activeCat===cat);
        const matchQ   = (!q || text.includes(q));
        card.style.display = (matchCat && matchQ) ? '' : 'none';
      });
    }

    chips.forEach(ch=>ch.addEventListener('click', ()=>{
      chips.forEach(c=>c.classList.remove('active'));
      ch.classList.add('active');
      applyFilters();
    }));
    if (search) search.addEventListener('input', applyFilters);
    if (sortBySel) sortBySel.addEventListener('change', applyFilters);

    applyFilters(); // ilk yüklemede hem sıralama hem filtre

    // blog post enhancements
    const progressBar = document.querySelector('.progress .bar');
    if (progressBar){
      const onScroll = ()=>{
        const el = document.querySelector('.post article');
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = el.scrollHeight - window.innerHeight + rect.top;
        const scrolled = Math.min(Math.max(window.scrollY - (el.offsetTop-20), 0), total);
        const pct = total>0 ? (scrolled/total)*100 : 0;
        progressBar.style.width = pct + '%';
      };
      document.addEventListener('scroll', onScroll, {passive:true});
      onScroll();
    }
    // TOC build
    const tocNav = document.querySelector('.toc nav');
    if (tocNav){
      const headings = document.querySelectorAll('.content h2, .content h3');
      headings.forEach((h,i)=>{
        const id = h.id || 'sec-' + (i+1);
        h.id = id;
        const a = document.createElement('a');
        a.href = '#' + id;
        a.textContent = h.textContent;
        a.addEventListener('click', ()=>{ setTimeout(()=>highlightActive(), 150);});
        tocNav.appendChild(a);
      });
      const anchorEls = tocNav.querySelectorAll('a');
      function highlightActive(){
        let idx = 0;
        headings.forEach((h,i)=>{ if (h.getBoundingClientRect().top < 120) idx = i; });
        anchorEls.forEach(a=>a.classList.remove('active'));
        if (anchorEls[idx]) anchorEls[idx].classList.add('active');
      }
      document.addEventListener('scroll', highlightActive, {passive:true});
      highlightActive();
    }
    // reading time
    const metaTime = document.querySelector('[data-reading-time]');
    if (metaTime){
      const text = document.querySelector('.content')?.innerText || '';
      const words = text.trim().split(/\s+/).length;
      const mins = Math.max(1, Math.round(words / 200));
      metaTime.textContent = mins + ' dk okuma';
    }
    // share copy
    document.querySelector('[data-share]')?.addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(window.location.href); const btn = document.querySelector('[data-share]'); const t=btn.textContent; btn.textContent='Kopyalandı!'; setTimeout(()=>btn.textContent=t, 1200);}catch(e){}
    });
  });

})();




// ========== BLOG.HTML'DEN BESLENEN BASIT RANDOM RECOMMENDER ========== //
(async function(){
  // Blog listesi sayfasında veya hedef divler yoksa çalıştırma
  if (location.pathname.endsWith('/blog.html')) return;
  const uiState = JSON.parse(localStorage.getItem('fy_portfolio_state') || '{}');
  const lang = (uiState.lang || document.documentElement.lang || 'tr').toLowerCase();
  const locale =
    lang === 'en' ? 'en-US' :
    lang === 'de' ? 'de-DE' : 'tr-TR';

  const $rec  = document.getElementById('onerilenler');
  const $next = document.getElementById('sonrakiYazi');
  if (!$rec && !$next) return;

  // 1) blog.html'i çek ve kartlardan veri çıkar
  let html;
  try {
    const res = await fetch('/blog.html', { cache: 'no-store' });
    html = await res.text();
  } catch(e) {
    console.warn('blog.html alınamadı:', e);
    return;
  }

  const dom = new DOMParser().parseFromString(html, 'text/html');
  const cards = [...dom.querySelectorAll('article.card[data-card]')];

  const posts = cards.map(card => {
    const title = card.getAttribute('data-title')?.trim() || card.querySelector('h3')?.textContent?.trim() || '';
    const date  = card.getAttribute('data-date')?.trim() || '';
    const cat   = card.getAttribute('data-cat')?.trim() || '';
    const read  = Number(card.getAttribute('data-read') || '0');
    const href  = card.querySelector('.btn-row a[href]')?.getAttribute('href') || '#';
    const url   = new URL(href, location.origin).pathname; // normalleştir
    const tags  = [...card.querySelectorAll('.meta .tag')].map(t => t.textContent.trim());
    const excerpt = card.querySelector('p')?.textContent?.trim() || '';
    return { title, date, category:cat, read, url, tags, excerpt };
  }).filter(p => p.url && p.url !== '#');

  if (!posts.length) return;

  // 2) Mevcut yazıyı URL'den bul
  const path = location.pathname; // örn: /blog/MuhendisligeTanimsalBirGiris.html
  const me = posts.find(p => path.endsWith(p.url) || p.url.endsWith(path) || p.url === path);
  if (!me) {
    // URL eşlemesi hassassa basitleştir: sadece dosya adını karşılaştır
    const file = path.split('/').pop();
    const alt = posts.find(p => p.url.split('/').pop() === file);
    if (!alt) return;
    Object.assign(me ?? {}, alt);
  }

  // 3) Önerilenler: rastgele 3 (kendisi hariç)
  const others = posts.filter(p => p.url !== me.url);
  const recommended = others.sort(() => Math.random() - 0.5).slice(0, 3);

  // 4) Sonraki: tarihe göre sıradaki (wrap-around)
  const ordered = [...posts].sort((a,b) => {
    const ad = a.date ? +new Date(a.date) : 0;
    const bd = b.date ? +new Date(b.date) : 0;
    return ad - bd; // eski -> yeni
  });
  const idx = ordered.findIndex(p => p.url === me.url);
  const nextPost = ordered[(idx + 1 + ordered.length) % ordered.length];

  // 5) Render — Önerilenler
  if ($rec && recommended.length) {
    $rec.innerHTML = `
      <h3 style="margin:8px 0 6px;">Önerilenler</h3>
      ${recommended.map(p => `
        <a class="card" href="${p.url}">
          <div class="title" style="font-weight:600;margin:8px 0 4px;">${p.title}</div>
          <div class="excerpt" style="font-size:.9rem;opacity:.8;">${p.excerpt ?? ''}</div>
          <div class="meta" style="font-size:.85rem;opacity:.7;margin-top:6px;">
            ${p.date ? ` • ${new Date(p.date).toLocaleDateString(locale)}` : ''}
          </div>
        </a>
      `).join('')}
    `;
  }

  // 6) Render — Sonrakine Geç
  // ---- Sonrakine Geç ----
  if ($next && nextPost) {
    $next.innerHTML = `
      <h3 style="margin:8px 0 6px;">Sonrakine geç</h3>
      <div class="card">
        <div class="title">${nextPost.title}</div>
        <a class="btn" href="${nextPost.url}" aria-label="Sonraki yazıya geç">
          Devam et →
        </a>
      </div>
    `;
  }
})();
